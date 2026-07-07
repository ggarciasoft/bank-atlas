// Validate per-bank input objects and the built snapshot against the schema
// and safety rules. Mirrors docs/02, docs/07, docs/08, docs/12.

import { CONFIDENCE_LEVELS, DIRECTIONS, EXTRACTION_STATUSES } from "./schema.js";
import { looksLikeFullAccountNumber } from "./normalize.js";

/**
 * @typedef {{ level: "error"|"warning", where: string, message: string }} Issue
 */

function isMasked(id) {
  if (!id) return true; // absent is allowed; a separate rule can require presence
  const s = String(id);
  return s.includes("*") || /terminad/i.test(s) || !looksLikeFullAccountNumber(s);
}

function checkMoney(issues, where, field, value, { required = false } = {}) {
  if (value === null || value === undefined) {
    if (required) issues.push({ level: "warning", where, message: `${field} is missing` });
    return;
  }
  if (typeof value !== "number" || !Number.isFinite(value)) {
    issues.push({ level: "error", where, message: `${field} must be a finite number` });
  }
}

function checkCurrency(issues, where, currency) {
  if (!currency) {
    issues.push({ level: "error", where, message: "currency is required" });
    return;
  }
  if (!/^[A-Z]{3}$/.test(String(currency))) {
    issues.push({
      level: "warning",
      where,
      message: `currency "${currency}" is not a 3-letter ISO code`,
    });
  }
}

function checkConfidence(issues, where, confidence) {
  if (!confidence) {
    issues.push({ level: "error", where, message: "confidence is required" });
  } else if (!CONFIDENCE_LEVELS.includes(confidence)) {
    issues.push({
      level: "error",
      where,
      message: `confidence "${confidence}" must be one of ${CONFIDENCE_LEVELS.join(", ")}`,
    });
  }
}

function checkMasked(issues, where, field, value) {
  if (value && looksLikeFullAccountNumber(value)) {
    issues.push({
      level: "error",
      where,
      message: `${field} "${value}" looks like a full account number; mask it (****1234)`,
    });
  }
}

/**
 * Validate one per-bank input object.
 * @param {any} bank
 * @returns {Issue[]}
 */
export function validateBank(bank) {
  /** @type {Issue[]} */
  const issues = [];
  const bid = bank.bank_id || "(unknown-bank)";
  const at = (kind, idx) => `${bid} › ${kind}[${idx}]`;

  if (!bank.bank_id) issues.push({ level: "error", where: bid, message: "bank_id is required" });
  if (!bank.bank_name)
    issues.push({ level: "warning", where: bid, message: "bank_name is missing" });
  if (bank.extraction_status && !EXTRACTION_STATUSES.includes(bank.extraction_status)) {
    issues.push({
      level: "warning",
      where: bid,
      message: `extraction_status "${bank.extraction_status}" is not standard`,
    });
  }

  (bank.accounts || []).forEach((a, i) => {
    const where = at("account", i);
    checkMasked(issues, where, "account_id_masked", a.account_id_masked);
    checkCurrency(issues, where, a.currency);
    checkConfidence(issues, where, a.confidence);
    checkMoney(issues, where, "available_balance", a.available_balance, { required: true });
    checkMoney(issues, where, "current_balance", a.current_balance);
  });

  (bank.credit_cards || []).forEach((c, i) => {
    const where = at("credit_card", i);
    checkMasked(issues, where, "card_id_masked", c.card_id_masked);
    checkCurrency(issues, where, c.currency);
    checkConfidence(issues, where, c.confidence);
    checkMoney(issues, where, "current_balance", c.current_balance, { required: true });
    checkMoney(issues, where, "minimum_payment", c.minimum_payment);
    checkMoney(issues, where, "available_credit", c.available_credit);
    if (c.due_date && !/^\d{4}-\d{2}-\d{2}$/.test(c.due_date)) {
      issues.push({ level: "warning", where, message: `due_date "${c.due_date}" is not ISO` });
    }
  });

  (bank.loans || []).forEach((l, i) => {
    const where = at("loan", i);
    checkMasked(issues, where, "loan_id_masked", l.loan_id_masked);
    checkCurrency(issues, where, l.currency);
    checkConfidence(issues, where, l.confidence);
    checkMoney(issues, where, "remaining_balance", l.remaining_balance, { required: true });
    checkMoney(issues, where, "monthly_payment", l.monthly_payment);
  });

  (bank.transactions || []).forEach((t, i) => {
    const where = at("transaction", i);
    checkMasked(issues, where, "account_id_masked", t.account_id_masked);
    checkCurrency(issues, where, t.currency);
    checkConfidence(issues, where, t.confidence);
    checkMoney(issues, where, "amount", t.amount, { required: true });
    if (t.direction && !DIRECTIONS.includes(t.direction)) {
      issues.push({
        level: "error",
        where,
        message: `direction "${t.direction}" must be debit or credit`,
      });
    }
    if (t.date && !/^\d{4}-\d{2}-\d{2}$/.test(t.date)) {
      issues.push({ level: "warning", where, message: `date "${t.date}" is not ISO` });
    }
  });

  return issues;
}

/**
 * Validate the full built snapshot.
 * @param {any} snapshot
 * @returns {Issue[]}
 */
export function validateSnapshot(snapshot) {
  /** @type {Issue[]} */
  const issues = [];
  if (!snapshot.snapshot_date)
    issues.push({ level: "warning", where: "snapshot", message: "snapshot_date is missing" });
  if (!snapshot.generated_at)
    issues.push({ level: "warning", where: "snapshot", message: "generated_at is missing" });
  for (const bank of snapshot.banks || []) {
    issues.push(...validateBank(bank));
  }
  return issues;
}

/** Convenience: split issues into errors and warnings. */
export function partition(issues) {
  return {
    errors: issues.filter((i) => i.level === "error"),
    warnings: issues.filter((i) => i.level === "warning"),
  };
}
