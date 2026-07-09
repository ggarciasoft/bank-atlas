// Persistent bank items registry (config/items/<bank_id>.json).
// Seeded from extraction, editable in the frontend, merged at build time.

import path from "node:path";

import { PATHS, exists, readJson, writeJson } from "./io.js";
import {
  ACCOUNT_TYPES,
  ITEM_KINDS,
  ITEM_REGISTRY_FIELDS,
  LOAN_TYPES,
  normalizeDayOfMonth,
} from "./schema.js";
import { maskIdentifier, money, normalizeCurrency } from "./normalize.js";
import { dayFromIso, nextDayOfMonth } from "./dateutil.js";

const KIND_TO_ID = {
  accounts: "account_id_masked",
  credit_cards: "card_id_masked",
  loans: "loan_id_masked",
};

export function bankItemsPath(bankId) {
  return path.join(PATHS.configItems, `${bankId}.json`);
}

export function itemKey(maskedId, currency) {
  const id = maskedId ? String(maskedId).trim() : "";
  const cur = currency ? String(currency).trim().toUpperCase() : "";
  if (!id) throw new Error("masked id is required for item key");
  return `${id}|${cur || "?"}`;
}

export function emptyItems(bankId = "", bankName = "") {
  return {
    bank_id: bankId,
    bank_name: bankName,
    accounts: [],
    credit_cards: [],
    loans: [],
  };
}

function normalizeUserEdited(list) {
  if (!Array.isArray(list)) return [];
  return [...new Set(list.filter((f) => typeof f === "string" && f.trim()))];
}

function findByKey(list, key) {
  return (list || []).find((e) => e.key === key) || null;
}

function indexByKey(list, key) {
  return (list || []).findIndex((e) => e.key === key);
}

/**
 * @param {string} bankId
 * @returns {Promise<object>}
 */
export async function readBankItems(bankId) {
  const p = bankItemsPath(bankId);
  if (!(await exists(p))) return emptyItems(bankId);
  const raw = await readJson(p);
  return normalizeItemsDoc(raw, bankId);
}

/**
 * @param {string} bankId
 * @param {object} doc
 */
export async function writeBankItems(bankId, doc) {
  const normalized = normalizeItemsDoc(doc, bankId);
  await writeJson(bankItemsPath(bankId), normalized);
  return normalized;
}

export function normalizeItemsDoc(raw, bankId = raw?.bank_id || "") {
  const out = emptyItems(bankId, raw?.bank_name || bankId);
  for (const kind of ITEM_KINDS) {
    out[kind] = (Array.isArray(raw?.[kind]) ? raw[kind] : [])
      .map((entry) => normalizeRegistryEntry(kind, entry))
      .filter(Boolean);
  }
  return out;
}

function normalizeRegistryEntry(kind, entry) {
  if (!entry || typeof entry !== "object") return null;
  const idField = KIND_TO_ID[kind];
  const masked = maskIdentifier(entry[idField]);
  if (!masked) return null;
  const currency = normalizeCurrency(entry.currency) || entry.currency || null;
  let key;
  try {
    key = entry.key || itemKey(masked, currency);
  } catch {
    return null;
  }

  const base = {
    key,
    [idField]: masked,
    currency,
    notes: typeof entry.notes === "string" ? entry.notes : "",
    user_edited: normalizeUserEdited(entry.user_edited),
  };

  if (kind === "accounts") {
    const account_type = ACCOUNT_TYPES.includes(entry.account_type)
      ? entry.account_type
      : entry.account_type || "other";
    return {
      ...base,
      account_name: entry.account_name || null,
      account_type,
    };
  }

  if (kind === "credit_cards") {
    return {
      ...base,
      card_name: entry.card_name || null,
      credit_limit: money(entry.credit_limit),
      statement_closing_day: normalizeDayOfMonth(entry.statement_closing_day),
      payment_due_day: normalizeDayOfMonth(entry.payment_due_day),
    };
  }

  if (kind === "loans") {
    const loan_type = LOAN_TYPES.includes(entry.loan_type) ? entry.loan_type : entry.loan_type || "other";
    const term = entry.term_months;
    return {
      ...base,
      loan_name: entry.loan_name || null,
      loan_type,
      monthly_payment: money(entry.monthly_payment),
      payment_due_day: normalizeDayOfMonth(entry.payment_due_day),
      term_months:
        term === null || term === undefined || term === ""
          ? null
          : Number.isFinite(Number(term))
            ? Number(term)
            : null,
    };
  }

  return null;
}

function seedFieldsForKind(kind) {
  if (kind === "accounts") return ["account_name", "account_type", "currency", "notes"];
  if (kind === "credit_cards") {
    return ["card_name", "currency", "credit_limit", "notes", "payment_due_day", "statement_closing_day"];
  }
  return ["loan_name", "loan_type", "currency", "monthly_payment", "notes", "payment_due_day", "term_months"];
}

function extractionToSeed(kind, item) {
  if (kind === "accounts") {
    return {
      account_name: item.account_name ?? null,
      account_type: item.account_type ?? "other",
      currency: item.currency ?? null,
      notes: "",
    };
  }
  if (kind === "credit_cards") {
    const payment_due_day = dayFromIso(item.due_date);
    return {
      card_name: item.card_name ?? null,
      currency: item.currency ?? null,
      credit_limit: item.credit_limit ?? null,
      payment_due_day,
      statement_closing_day: null,
      notes: "",
    };
  }
  return {
    loan_name: item.loan_name ?? null,
    loan_type: item.loan_type ?? "other",
    currency: item.currency ?? null,
    monthly_payment: item.monthly_payment ?? null,
    payment_due_day: dayFromIso(item.next_due_date),
    term_months: null,
    notes: "",
  };
}

/**
 * Upsert registry entries from a normalized bank extraction.
 * Never overwrites fields listed in user_edited.
 * @param {object} registry
 * @param {object} bank normalized bank object
 * @returns {object} updated registry
 */
export function upsertFromExtraction(registry, bank) {
  const out = normalizeItemsDoc(
    { ...registry, bank_id: bank.bank_id, bank_name: bank.bank_name || registry.bank_name },
    bank.bank_id
  );

  for (const kind of ITEM_KINDS) {
    const idField = KIND_TO_ID[kind];
    for (const item of bank[kind] || []) {
      const masked = maskIdentifier(item[idField]);
      if (!masked) continue;
      const currency = item.currency ?? null;
      const key = itemKey(masked, currency);
      const seed = extractionToSeed(kind, item);
      const fields = seedFieldsForKind(kind);
      let existing = findByKey(out[kind], key);
      if (!existing) {
        existing = normalizeRegistryEntry(kind, { key, [idField]: masked, currency, ...seed });
        out[kind].push(existing);
        continue;
      }
      const locked = new Set(existing.user_edited || []);
      for (const field of fields) {
        if (locked.has(field)) continue;
        if (seed[field] !== null && seed[field] !== undefined && seed[field] !== "") {
          existing[field] = seed[field];
        }
      }
      existing[idField] = masked;
      existing.currency = normalizeCurrency(existing.currency) || currency;
      existing.key = key;
    }
  }

  for (const kind of ITEM_KINDS) {
    out[kind].sort((a, b) => String(a.key).localeCompare(String(b.key)));
  }
  return out;
}

function pickField(extracted, registry, field, userEdited) {
  if (userEdited.has(field) && registry?.[field] !== undefined) {
    return registry[field];
  }
  const ext = extracted?.[field];
  if (ext !== null && ext !== undefined && ext !== "") return ext;
  const reg = registry?.[field];
  if (reg !== null && reg !== undefined && reg !== "") return reg;
  return ext ?? reg ?? null;
}

function mergeAccount(extracted, registry) {
  const userEdited = new Set(registry?.user_edited || []);
  return {
    ...extracted,
    account_name: pickField(extracted, registry, "account_name", userEdited),
    account_type: pickField(extracted, registry, "account_type", userEdited) || "other",
    currency: pickField(extracted, registry, "currency", userEdited),
  };
}

function mergeCreditCard(extracted, registry, snapshotDate) {
  const userEdited = new Set(registry?.user_edited || []);
  const merged = {
    ...extracted,
    card_name: pickField(extracted, registry, "card_name", userEdited),
    currency: pickField(extracted, registry, "currency", userEdited),
    credit_limit: money(pickField(extracted, registry, "credit_limit", userEdited)),
  };

  const closingDay = registry?.statement_closing_day ?? null;
  const dueDay = registry?.payment_due_day ?? null;

  if (closingDay) {
    merged.statement_closing_date = nextDayOfMonth(closingDay, snapshotDate);
  } else {
    merged.statement_closing_date = extracted.statement_closing_date ?? null;
  }

  if (userEdited.has("payment_due_day") && dueDay) {
    merged.due_date = nextDayOfMonth(dueDay, snapshotDate);
  } else if (extracted.due_date) {
    merged.due_date = extracted.due_date;
  } else if (dueDay) {
    merged.due_date = nextDayOfMonth(dueDay, snapshotDate);
  }

  return merged;
}

function mergeLoan(extracted, registry, snapshotDate) {
  const userEdited = new Set(registry?.user_edited || []);
  const merged = {
    ...extracted,
    loan_name: pickField(extracted, registry, "loan_name", userEdited),
    loan_type: pickField(extracted, registry, "loan_type", userEdited) || "other",
    currency: pickField(extracted, registry, "currency", userEdited),
    monthly_payment: money(pickField(extracted, registry, "monthly_payment", userEdited)),
  };

  const dueDay = registry?.payment_due_day ?? null;
  if (userEdited.has("payment_due_day") && dueDay) {
    merged.next_due_date = nextDayOfMonth(dueDay, snapshotDate);
  } else if (extracted.next_due_date) {
    merged.next_due_date = extracted.next_due_date;
  } else if (dueDay) {
    merged.next_due_date = nextDayOfMonth(dueDay, snapshotDate);
  }

  return merged;
}

function registryOnlyShell(kind, registryEntry) {
  const idField = KIND_TO_ID[kind];
  const base = {
    [idField]: registryEntry[idField],
    currency: registryEntry.currency,
    source_page: "items registry",
    confidence: "low",
    needs_review: true,
  };
  if (kind === "accounts") {
    return {
      ...base,
      account_name: registryEntry.account_name || "Unknown account",
      account_type: registryEntry.account_type || "other",
      available_balance: null,
      current_balance: null,
    };
  }
  if (kind === "credit_cards") {
    return {
      ...base,
      card_name: registryEntry.card_name || "Unknown card",
      current_balance: null,
      statement_balance: null,
      minimum_payment: null,
      due_date: null,
      available_credit: null,
      credit_limit: registryEntry.credit_limit ?? null,
      statement_closing_date: null,
    };
  }
  return {
    ...base,
    loan_name: registryEntry.loan_name || "Unknown loan",
    loan_type: registryEntry.loan_type || "other",
    remaining_balance: null,
    monthly_payment: registryEntry.monthly_payment ?? null,
    next_due_date: null,
  };
}

/**
 * Overlay registry metadata onto a normalized bank and compute recurring dates.
 * @param {object} bank
 * @param {object} registry
 * @param {string} snapshotDate YYYY-MM-DD
 * @returns {object}
 */
export function mergeIntoBank(bank, registry, snapshotDate) {
  const out = { ...bank };

  for (const kind of ITEM_KINDS) {
    const idField = KIND_TO_ID[kind];
    const mergedList = [];
    const seen = new Set();

    for (const item of bank[kind] || []) {
      const masked = item[idField];
      const key = itemKey(masked, item.currency);
      seen.add(key);
      const reg = findByKey(registry[kind], key);
      if (kind === "accounts") mergedList.push(mergeAccount(item, reg));
      else if (kind === "credit_cards") mergedList.push(mergeCreditCard(item, reg, snapshotDate));
      else mergedList.push(mergeLoan(item, reg, snapshotDate));
    }

    for (const regEntry of registry[kind] || []) {
      if (seen.has(regEntry.key)) continue;
      let shell = registryOnlyShell(kind, regEntry);
      if (kind === "credit_cards") shell = mergeCreditCard(shell, regEntry, snapshotDate);
      else if (kind === "loans") shell = mergeLoan(shell, regEntry, snapshotDate);
      mergedList.push(shell);
    }

    out[kind] = mergedList;
  }

  return out;
}

/**
 * Apply a user edit to one registry entry; marks touched editable fields user_edited.
 * @param {object} registry
 * @param {string} kind
 * @param {string} key
 * @param {object} patch
 * @param {{ markUserEdited?: boolean }} [opts]
 */
export function applyEdit(registry, kind, key, patch, opts = {}) {
  if (!ITEM_KINDS.includes(kind)) throw new Error(`invalid item kind: ${kind}`);
  const mark = opts.markUserEdited !== false;
  const editable = ITEM_REGISTRY_FIELDS[kind];
  const idx = indexByKey(registry[kind], key);
  if (idx === -1) throw new Error(`unknown item key: ${key}`);

  const entry = { ...registry[kind][idx] };
  const userEdited = new Set(entry.user_edited || []);

  for (const field of editable) {
    if (!(field in patch)) continue;
    entry[field] = patch[field];
    if (mark) userEdited.add(field);
  }

  entry.user_edited = [...userEdited];
  registry[kind][idx] = normalizeRegistryEntry(kind, entry);
  return registry;
}

/**
 * Add or replace a registry entry (frontend save).
 * @param {object} registry
 * @param {string} kind
 * @param {object} item
 * @param {{ markUserEdited?: boolean }} [opts]
 */
export function upsertRegistryItem(registry, kind, item, opts = {}) {
  if (!ITEM_KINDS.includes(kind)) throw new Error(`invalid item kind: ${kind}`);
  const mark = opts.markUserEdited !== false;
  const normalized = normalizeRegistryEntry(kind, item);
  if (!normalized) throw new Error("invalid item payload");

  const editable = ITEM_REGISTRY_FIELDS[kind];
  if (mark) {
    const touched = editable.filter((f) => f in item);
    normalized.user_edited = [...new Set([...(normalized.user_edited || []), ...touched])];
  }

  const idx = indexByKey(registry[kind], normalized.key);
  if (idx === -1) registry[kind].push(normalized);
  else {
    const prev = registry[kind][idx];
    normalized.user_edited = [...new Set([...(prev.user_edited || []), ...(normalized.user_edited || [])])];
    registry[kind][idx] = normalized;
  }
  registry[kind].sort((a, b) => String(a.key).localeCompare(String(b.key)));
  return registry;
}

/**
 * @param {object} registry
 * @param {string} kind
 * @param {string} key
 */
export function deleteRegistryItem(registry, kind, key) {
  if (!ITEM_KINDS.includes(kind)) throw new Error(`invalid item kind: ${kind}`);
  const idx = indexByKey(registry[kind], key);
  if (idx === -1) throw new Error(`unknown item key: ${key}`);
  registry[kind].splice(idx, 1);
  return registry;
}

/**
 * Seed registry from every input/banks/*.json without a full snapshot build.
 * @param {import('./io.js').PATHS} _paths unused, for symmetry
 */
export async function syncAllItemsFromInputs(listJsonFn, readJsonFn) {
  const files = await listJsonFn(PATHS.inputBanks);
  const updated = [];
  for (const file of files) {
    const raw = await readJsonFn(file);
    if (!raw?.bank_id) continue;
    const registry = await readBankItems(raw.bank_id);
    const seeded = upsertFromExtraction(registry, {
      bank_id: raw.bank_id,
      bank_name: raw.bank_name || raw.bank_id,
      accounts: raw.accounts || [],
      credit_cards: raw.credit_cards || [],
      loans: raw.loans || [],
    });
    await writeBankItems(raw.bank_id, seeded);
    updated.push(raw.bank_id);
  }
  return updated;
}
