// Ingest a statement CSV into input/banks/<bank_id>.json as transactions.
// PDFs/images are handled by the ingestion agent (it reads them and writes JSON);
// this module handles the deterministic CSV path.

import path from "node:path";

import { PATHS, readText, readJson, writeJson, exists } from "./io.js";
import { emptyBank } from "./schema.js";
import { parseCsvRecords } from "./csvparse.js";
import { parseAmount, normalizeDate, normalizeCurrency, maskIdentifier, money } from "./normalize.js";

// Header keyword sets (English + Spanish). Lowercased substring match.
const COLS = {
  date: ["date", "fecha", "posted", "transaction date", "fecha transaccion", "fecha de transaccion", "f. transaccion"],
  description: ["description", "descripcion", "descripción", "concepto", "detalle", "memo", "merchant", "comercio", "referencia", "concept"],
  amount: ["amount", "monto", "importe", "valor", "total"],
  debit: ["debit", "debito", "débito", "cargo", "cargos", "retiro", "salida", "egreso"],
  credit: ["credit", "credito", "crédito", "abono", "abonos", "deposito", "depósito", "entrada", "ingreso"],
  currency: ["currency", "moneda", "divisa"],
};

function findColumn(headers, keywords, override) {
  if (override) {
    const exact = headers.find((h) => h.toLowerCase() === override.toLowerCase());
    return exact || override;
  }
  const lower = headers.map((h) => h.toLowerCase());
  for (const kw of keywords) {
    const idx = lower.findIndex((h) => h === kw);
    if (idx !== -1) return headers[idx];
  }
  for (const kw of keywords) {
    const idx = lower.findIndex((h) => h.includes(kw));
    if (idx !== -1) return headers[idx];
  }
  return null;
}

function txKey(t) {
  return `${t.date}|${money(t.amount)}|${(t.description || "").toLowerCase()}|${t.direction}`;
}

/**
 * @param {object} opts
 * @param {string} opts.file        Path to the CSV file.
 * @param {string} opts.bankId      Target bank_id (input/banks/<bankId>.json).
 * @param {string} [opts.bankName]  Used if the bank file must be created.
 * @param {string} [opts.account]   Default account_id_masked for rows.
 * @param {string} [opts.currency]  Default currency when the CSV has none.
 * @param {object} [opts.mapping]   Column overrides {date, description, amount, debit, credit, currency}.
 * @returns {Promise<{ inputPath: string, added: number, skipped: number, total: number, mapping: object }>}
 */
export async function ingestCsv(opts) {
  if (!opts.file) throw new Error("--file is required");
  if (!opts.bankId) throw new Error("--bank <bank_id> is required");

  const text = await readText(opts.file);
  const { headers, records } = parseCsvRecords(text);
  if (headers.length === 0) throw new Error("CSV file is empty");

  const m = opts.mapping || {};
  const dateCol = findColumn(headers, COLS.date, m.date);
  const descCol = findColumn(headers, COLS.description, m.description);
  const amountCol = findColumn(headers, COLS.amount, m.amount);
  const debitCol = findColumn(headers, COLS.debit, m.debit);
  const creditCol = findColumn(headers, COLS.credit, m.credit);
  const currencyCol = findColumn(headers, COLS.currency, m.currency);

  if (!dateCol) throw new Error(`Could not find a date column in: ${headers.join(", ")}`);
  if (!amountCol && !debitCol && !creditCol) {
    throw new Error(`Could not find an amount/debit/credit column in: ${headers.join(", ")}`);
  }

  const defaultCurrency = opts.currency ? normalizeCurrency(opts.currency) || opts.currency : null;
  const account = opts.account ? maskIdentifier(opts.account) : null;

  const parsed = [];
  for (const rec of records) {
    const dateInfo = normalizeDate(rec[dateCol]);
    const description = descCol ? rec[descCol] : "";

    let amount = null;
    let direction = null;
    if (debitCol || creditCol) {
      const d = debitCol ? parseAmount(rec[debitCol]) : { amount: null };
      const c = creditCol ? parseAmount(rec[creditCol]) : { amount: null };
      if (d.amount) {
        amount = d.amount;
        direction = "debit";
      } else if (c.amount) {
        amount = c.amount;
        direction = "credit";
      }
    } else {
      const a = parseAmount(rec[amountCol]);
      amount = a.amount;
      direction = a.direction;
    }
    if (amount === null) continue; // skip non-transaction rows (headers, totals, blanks)

    const rowCurrency = currencyCol ? normalizeCurrency(rec[currencyCol]) : null;
    parsed.push({
      account_id_masked: account,
      date: dateInfo.date,
      description: (description || "").trim(),
      amount: money(amount),
      direction,
      currency: rowCurrency || defaultCurrency || null,
      category_guess: null,
      is_pending: false,
      source_page: `statement:${path.basename(opts.file)}`,
      confidence: dateInfo.ambiguous ? "low" : "medium",
      needs_review: dateInfo.ambiguous === true || (rowCurrency || defaultCurrency) == null,
    });
  }

  const inputPath = path.join(PATHS.inputBanks, `${opts.bankId}.json`);
  const bank = (await exists(inputPath))
    ? await readJson(inputPath)
    : emptyBank(opts.bankId, opts.bankName || opts.bankId);
  bank.transactions = Array.isArray(bank.transactions) ? bank.transactions : [];

  const existingKeys = new Set(bank.transactions.map(txKey));
  let added = 0;
  let skipped = 0;
  let counter = bank.transactions.length;
  for (const t of parsed) {
    if (existingKeys.has(txKey(t))) {
      skipped += 1;
      continue;
    }
    counter += 1;
    bank.transactions.push({ transaction_id_local: `${opts.bankId}-imp-${counter}`, ...t });
    existingKeys.add(txKey(t));
    added += 1;
  }

  bank.notes = Array.isArray(bank.notes) ? bank.notes : [];
  bank.notes.push(`Imported ${added} transaction(s) from ${path.basename(opts.file)} on ${new Date().toISOString().slice(0, 10)}.`);

  await writeJson(inputPath, bank);

  return {
    inputPath,
    added,
    skipped,
    total: parsed.length,
    mapping: {
      date: dateCol,
      description: descCol,
      amount: amountCol,
      debit: debitCol,
      credit: creditCol,
      currency: currencyCol,
    },
  };
}
