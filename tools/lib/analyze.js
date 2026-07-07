// Heuristic analysis over transactions: large movements, possible duplicates,
// and recurring charges. These only ADD flags; explicit true values set by the
// agent are always respected (never downgraded to false).
// Mirrors docs/04 (large movement detection) and docs/07 (duplicate/recurring).

import { NOTEWORTHY_KEYWORDS, RECURRING_KEYWORDS } from "./schema.js";

function median(nums) {
  if (nums.length === 0) return 0;
  const sorted = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function hasKeyword(description, keywords) {
  if (!description) return false;
  const d = String(description).toLowerCase();
  return keywords.some((k) => d.includes(k));
}

function normalizeDescription(description) {
  return String(description || "")
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

function descriptionsSimilar(a, b) {
  const ta = new Set(normalizeDescription(a));
  const tb = new Set(normalizeDescription(b));
  if (ta.size === 0 || tb.size === 0) return false;
  let overlap = 0;
  for (const t of ta) if (tb.has(t)) overlap += 1;
  const smaller = Math.min(ta.size, tb.size);
  return overlap / smaller >= 0.6;
}

/**
 * Annotate transactions in-place with is_large_movement, possible_duplicate,
 * and is_recurring flags. Mutates and returns the same array.
 * @param {any[]} transactions
 * @returns {any[]}
 */
export function annotateTransactions(transactions) {
  // Large movement: per (bank_id, currency, direction) group, flag amounts that
  // are >= 3x the median absolute amount of the group, OR match noteworthy keywords.
  const groups = new Map();
  for (const t of transactions) {
    const key = `${t.bank_id}|${t.currency}|${t.direction}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(t);
  }
  for (const group of groups.values()) {
    const amounts = group
      .map((t) => Math.abs(Number(t.amount)))
      .filter((n) => Number.isFinite(n) && n > 0);
    const med = median(amounts);
    const threshold = med > 0 ? med * 3 : Infinity;
    for (const t of group) {
      const amt = Math.abs(Number(t.amount));
      const byMagnitude = Number.isFinite(amt) && amt >= threshold && group.length >= 3;
      const byKeyword = hasKeyword(t.description, NOTEWORTHY_KEYWORDS);
      if (byMagnitude || byKeyword) t.is_large_movement = true;
      if (t.is_large_movement !== true) t.is_large_movement = t.is_large_movement === true;
    }
  }

  // Possible duplicates: same |amount| and date across the dataset (different
  // row). Includes transfer-out/in pairs (opposite direction). Never deletes.
  for (let i = 0; i < transactions.length; i += 1) {
    for (let j = i + 1; j < transactions.length; j += 1) {
      const a = transactions[i];
      const b = transactions[j];
      const sameAmount =
        Math.abs(Math.abs(Number(a.amount)) - Math.abs(Number(b.amount))) < 0.01;
      const sameDate = a.date && b.date && a.date === b.date;
      if (sameAmount && sameDate && descriptionsSimilar(a.description, b.description)) {
        a.possible_duplicate = true;
        b.possible_duplicate = true;
      }
    }
  }

  // Recurring: keyword-based, or same merchant appearing repeatedly.
  const merchantCounts = new Map();
  for (const t of transactions) {
    const key = normalizeDescription(t.description).slice(0, 3).join(" ");
    merchantCounts.set(key, (merchantCounts.get(key) || 0) + 1);
  }
  for (const t of transactions) {
    const key = normalizeDescription(t.description).slice(0, 3).join(" ");
    const byKeyword = hasKeyword(t.description, RECURRING_KEYWORDS);
    const byRepeat = key && merchantCounts.get(key) >= 3;
    if (byKeyword || byRepeat) t.is_recurring = true;
  }

  return transactions;
}
