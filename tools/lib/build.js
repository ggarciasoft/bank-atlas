// Core build pipeline: read per-bank inputs, normalize, analyze, summarize,
// and produce the snapshot object + rendered files.

import path from "node:path";

import { CSV_COLUMNS } from "./schema.js";
import { PATHS, listJson, readJson, writeJson, writeText, toCsv, ensureDir } from "./io.js";
import { money, maskIdentifier, normalizeCurrency, parseAmount, normalizeDate } from "./normalize.js";
import { annotateTransactions } from "./analyze.js";
import { buildSummary } from "./summarize.js";
import { renderMarkdown } from "./markdown.js";
import { todayIso, nowIso } from "./datetime.js";

function coerceMoney(value) {
  if (typeof value === "string") {
    const parsed = parseAmount(value);
    return money(parsed.amount);
  }
  return money(value);
}

function normalizeBank(bank) {
  const out = {
    bank_id: bank.bank_id,
    bank_name: bank.bank_name || bank.bank_id,
    extraction_status: bank.extraction_status || "partial",
    extracted_at: bank.extracted_at || null,
    accounts: [],
    credit_cards: [],
    loans: [],
    transactions: [],
    notes: Array.isArray(bank.notes) ? bank.notes : [],
    warnings: Array.isArray(bank.warnings) ? bank.warnings : [],
  };

  for (const a of bank.accounts || []) {
    out.accounts.push({
      ...a,
      account_id_masked: maskIdentifier(a.account_id_masked),
      currency: normalizeCurrency(a.currency) || a.currency || null,
      available_balance: coerceMoney(a.available_balance),
      current_balance: coerceMoney(a.current_balance),
      confidence: a.confidence || "medium",
      needs_review: a.needs_review === true,
    });
  }

  for (const c of bank.credit_cards || []) {
    out.credit_cards.push({
      ...c,
      card_id_masked: maskIdentifier(c.card_id_masked),
      currency: normalizeCurrency(c.currency) || c.currency || null,
      current_balance: coerceMoney(c.current_balance),
      statement_balance: coerceMoney(c.statement_balance),
      minimum_payment: coerceMoney(c.minimum_payment),
      available_credit: coerceMoney(c.available_credit),
      credit_limit: coerceMoney(c.credit_limit),
      due_date: c.due_date ? normalizeDate(c.due_date).date : null,
      confidence: c.confidence || "medium",
      needs_review: c.needs_review === true,
    });
  }

  for (const l of bank.loans || []) {
    out.loans.push({
      ...l,
      loan_id_masked: maskIdentifier(l.loan_id_masked),
      currency: normalizeCurrency(l.currency) || l.currency || null,
      remaining_balance: coerceMoney(l.remaining_balance),
      monthly_payment: coerceMoney(l.monthly_payment),
      next_due_date: l.next_due_date ? normalizeDate(l.next_due_date).date : null,
      confidence: l.confidence || "medium",
      needs_review: l.needs_review === true,
    });
  }

  bank.transactions?.forEach((t, i) => {
    const parsed = typeof t.amount === "string" ? parseAmount(t.amount) : null;
    const dateInfo = normalizeDate(t.date);
    out.transactions.push({
      transaction_id_local: t.transaction_id_local || `${bank.bank_id}-${i + 1}`,
      bank_id: bank.bank_id,
      account_id_masked: maskIdentifier(t.account_id_masked),
      date: dateInfo.date,
      description: t.description || "",
      amount: parsed ? money(parsed.amount) : money(t.amount),
      direction: t.direction || (parsed ? parsed.direction : null),
      currency: normalizeCurrency(t.currency) || t.currency || null,
      category_guess: t.category_guess || null,
      is_pending: t.is_pending === true,
      is_large_movement: t.is_large_movement === true,
      possible_duplicate: t.possible_duplicate === true,
      is_recurring: t.is_recurring === true,
      source_page: t.source_page || null,
      confidence: t.confidence || "medium",
      needs_review: t.needs_review === true || dateInfo.ambiguous === true,
    });
  });

  return out;
}

/**
 * Build the snapshot object from all input/banks/*.json files.
 * @param {{ snapshotDate?: string, generatedAt?: string }} [opts]
 * @returns {Promise<{ snapshot: any, files: string[] }>}
 */
export async function build(opts = {}) {
  const files = await listJson(PATHS.inputBanks);
  const banks = [];
  const allTransactions = [];

  for (const file of files) {
    const raw = await readJson(file);
    const bank = normalizeBank(raw);
    banks.push(bank);
    allTransactions.push(...bank.transactions);
  }

  annotateTransactions(allTransactions); // flags mutate bank.transactions in place

  const snapshotDate = opts.snapshotDate || todayIso();
  const generatedAt = opts.generatedAt || nowIso();
  const partial = banks.some((b) => b.extraction_status !== "completed") || banks.length === 0;

  const snapshot = {
    snapshot_date: snapshotDate,
    generated_at: generatedAt,
    partial,
    banks,
    summary: buildSummary(banks, snapshotDate),
  };

  const written = await writeAll(snapshot);
  return { snapshot, files: written };
}

async function writeAll(snapshot) {
  await ensureDir(PATHS.output);
  const written = [];

  const jsonPath = path.join(PATHS.output, "financial-snapshot.json");
  await writeJson(jsonPath, snapshot);
  written.push(jsonPath);

  const mdPath = path.join(PATHS.output, "financial-snapshot.md");
  await writeText(mdPath, renderMarkdown(snapshot));
  written.push(mdPath);

  const csvSpecs = collectCsvRows(snapshot);
  for (const [name, rows] of Object.entries(csvSpecs)) {
    const csvPath = path.join(PATHS.output, `${name}.csv`);
    await writeText(csvPath, toCsv(CSV_COLUMNS[name], rows));
    written.push(csvPath);
  }

  // Timestamped history copies (docs/09 + docs/14).
  const histJson = path.join(PATHS.history, `${snapshot.snapshot_date}-financial-snapshot.json`);
  const histMd = path.join(PATHS.history, `${snapshot.snapshot_date}-financial-snapshot.md`);
  await writeJson(histJson, snapshot);
  await writeText(histMd, renderMarkdown(snapshot));
  written.push(histJson, histMd);

  const { saveSnapshotToDb, DEFAULT_DB } = await import("./db.js");
  saveSnapshotToDb(snapshot);
  written.push(DEFAULT_DB);

  return written;
}

function collectCsvRows(snapshot) {
  const rows = { accounts: [], credit_cards: [], loans: [], transactions: [] };
  const d = snapshot.snapshot_date;
  for (const b of snapshot.banks) {
    for (const a of b.accounts) {
      rows.accounts.push({ snapshot_date: d, bank_id: b.bank_id, bank_name: b.bank_name, ...a });
    }
    for (const c of b.credit_cards) {
      rows.credit_cards.push({ snapshot_date: d, bank_id: b.bank_id, bank_name: b.bank_name, ...c });
    }
    for (const l of b.loans) {
      rows.loans.push({ snapshot_date: d, bank_id: b.bank_id, bank_name: b.bank_name, ...l });
    }
    for (const t of b.transactions) {
      rows.transactions.push({ snapshot_date: d, bank_name: b.bank_name, ...t });
    }
  }
  return rows;
}
