// Optional SQLite history store using Node's built-in node:sqlite.
// Each build can be pushed into output/finance.db (idempotent per snapshot_date),
// enabling net-worth / debt trends over time. Mirrors docs/14 Upgrade 1 & 2.

import path from "node:path";
import { DatabaseSync } from "node:sqlite";

import { PATHS, ensureDir } from "./io.js";

export const DEFAULT_DB = path.join(PATHS.output, "finance.db");

const SCHEMA = `
CREATE TABLE IF NOT EXISTS snapshots (
  snapshot_date TEXT PRIMARY KEY,
  generated_at  TEXT,
  partial       INTEGER
);
CREATE TABLE IF NOT EXISTS accounts (
  snapshot_date TEXT, bank_id TEXT, bank_name TEXT,
  account_id_masked TEXT, account_name TEXT, account_type TEXT, currency TEXT,
  available_balance REAL, current_balance REAL, confidence TEXT, needs_review INTEGER
);
CREATE TABLE IF NOT EXISTS credit_cards (
  snapshot_date TEXT, bank_id TEXT, bank_name TEXT,
  card_id_masked TEXT, card_name TEXT, currency TEXT,
  current_balance REAL, statement_balance REAL, minimum_payment REAL,
  due_date TEXT, available_credit REAL, credit_limit REAL,
  confidence TEXT, needs_review INTEGER
);
CREATE TABLE IF NOT EXISTS loans (
  snapshot_date TEXT, bank_id TEXT, bank_name TEXT,
  loan_id_masked TEXT, loan_name TEXT, loan_type TEXT, currency TEXT,
  remaining_balance REAL, monthly_payment REAL, next_due_date TEXT,
  confidence TEXT, needs_review INTEGER
);
CREATE TABLE IF NOT EXISTS transactions (
  snapshot_date TEXT, bank_id TEXT, bank_name TEXT, account_id_masked TEXT,
  transaction_id_local TEXT, date TEXT, description TEXT, amount REAL,
  direction TEXT, currency TEXT, category_guess TEXT,
  is_pending INTEGER, is_large_movement INTEGER, possible_duplicate INTEGER,
  confidence TEXT, needs_review INTEGER
);
`;

function b(v) {
  return v === true ? 1 : 0;
}
function num(v) {
  return v === null || v === undefined || !Number.isFinite(Number(v)) ? null : Number(v);
}

function open(dbPath = DEFAULT_DB) {
  ensureDir(path.dirname(dbPath));
  const db = new DatabaseSync(dbPath);
  db.exec(SCHEMA);
  return db;
}

/**
 * Insert/replace the given snapshot into the DB (idempotent per snapshot_date).
 * @param {any} snapshot
 * @param {string} [dbPath]
 * @returns {{ dbPath: string, counts: Record<string, number> }}
 */
export function saveSnapshotToDb(snapshot, dbPath = DEFAULT_DB) {
  const db = open(dbPath);
  const date = snapshot.snapshot_date;
  const counts = { accounts: 0, credit_cards: 0, loans: 0, transactions: 0 };
  try {
    db.exec("BEGIN");
    for (const table of ["accounts", "credit_cards", "loans", "transactions"]) {
      db.prepare(`DELETE FROM ${table} WHERE snapshot_date = ?`).run(date);
    }
    db.prepare("DELETE FROM snapshots WHERE snapshot_date = ?").run(date);
    db.prepare("INSERT INTO snapshots (snapshot_date, generated_at, partial) VALUES (?, ?, ?)").run(
      date,
      snapshot.generated_at,
      b(snapshot.partial)
    );

    const insAcc = db.prepare(
      `INSERT INTO accounts VALUES (@snapshot_date,@bank_id,@bank_name,@account_id_masked,@account_name,@account_type,@currency,@available_balance,@current_balance,@confidence,@needs_review)`
    );
    const insCard = db.prepare(
      `INSERT INTO credit_cards VALUES (@snapshot_date,@bank_id,@bank_name,@card_id_masked,@card_name,@currency,@current_balance,@statement_balance,@minimum_payment,@due_date,@available_credit,@credit_limit,@confidence,@needs_review)`
    );
    const insLoan = db.prepare(
      `INSERT INTO loans VALUES (@snapshot_date,@bank_id,@bank_name,@loan_id_masked,@loan_name,@loan_type,@currency,@remaining_balance,@monthly_payment,@next_due_date,@confidence,@needs_review)`
    );
    const insTx = db.prepare(
      `INSERT INTO transactions VALUES (@snapshot_date,@bank_id,@bank_name,@account_id_masked,@transaction_id_local,@date,@description,@amount,@direction,@currency,@category_guess,@is_pending,@is_large_movement,@possible_duplicate,@confidence,@needs_review)`
    );

    for (const bank of snapshot.banks || []) {
      const base = { snapshot_date: date, bank_id: bank.bank_id, bank_name: bank.bank_name };
      for (const a of bank.accounts || []) {
        insAcc.run({
          ...base,
          account_id_masked: a.account_id_masked ?? null,
          account_name: a.account_name ?? null,
          account_type: a.account_type ?? null,
          currency: a.currency ?? null,
          available_balance: num(a.available_balance),
          current_balance: num(a.current_balance),
          confidence: a.confidence ?? null,
          needs_review: b(a.needs_review),
        });
        counts.accounts += 1;
      }
      for (const c of bank.credit_cards || []) {
        insCard.run({
          ...base,
          card_id_masked: c.card_id_masked ?? null,
          card_name: c.card_name ?? null,
          currency: c.currency ?? null,
          current_balance: num(c.current_balance),
          statement_balance: num(c.statement_balance),
          minimum_payment: num(c.minimum_payment),
          due_date: c.due_date ?? null,
          available_credit: num(c.available_credit),
          credit_limit: num(c.credit_limit),
          confidence: c.confidence ?? null,
          needs_review: b(c.needs_review),
        });
        counts.credit_cards += 1;
      }
      for (const l of bank.loans || []) {
        insLoan.run({
          ...base,
          loan_id_masked: l.loan_id_masked ?? null,
          loan_name: l.loan_name ?? null,
          loan_type: l.loan_type ?? null,
          currency: l.currency ?? null,
          remaining_balance: num(l.remaining_balance),
          monthly_payment: num(l.monthly_payment),
          next_due_date: l.next_due_date ?? null,
          confidence: l.confidence ?? null,
          needs_review: b(l.needs_review),
        });
        counts.loans += 1;
      }
      for (const t of bank.transactions || []) {
        insTx.run({
          ...base,
          account_id_masked: t.account_id_masked ?? null,
          transaction_id_local: t.transaction_id_local ?? null,
          date: t.date ?? null,
          description: t.description ?? null,
          amount: num(t.amount),
          direction: t.direction ?? null,
          currency: t.currency ?? null,
          category_guess: t.category_guess ?? null,
          is_pending: b(t.is_pending),
          is_large_movement: b(t.is_large_movement),
          possible_duplicate: b(t.possible_duplicate),
          confidence: t.confidence ?? null,
          needs_review: b(t.needs_review),
        });
        counts.transactions += 1;
      }
    }
    db.exec("COMMIT");
  } catch (err) {
    db.exec("ROLLBACK");
    throw err;
  } finally {
    db.close();
  }
  return { dbPath, counts };
}

/**
 * Compute per-snapshot trends: cash, card debt, and loan debt by currency.
 * @param {string} [dbPath]
 * @returns {{ dates: string[], cash: Row[], cardDebt: Row[], loanDebt: Row[] }}
 * @typedef {{ snapshot_date: string, currency: string, total: number }} Row
 */
export function getTrends(dbPath = DEFAULT_DB) {
  const db = open(dbPath);
  try {
    const dates = db
      .prepare("SELECT snapshot_date FROM snapshots ORDER BY snapshot_date")
      .all()
      .map((r) => r.snapshot_date);
    const cash = db
      .prepare(
        "SELECT snapshot_date, currency, ROUND(SUM(available_balance),2) AS total FROM accounts GROUP BY snapshot_date, currency ORDER BY snapshot_date, currency"
      )
      .all();
    const cardDebt = db
      .prepare(
        "SELECT snapshot_date, currency, ROUND(SUM(current_balance),2) AS total FROM credit_cards GROUP BY snapshot_date, currency ORDER BY snapshot_date, currency"
      )
      .all();
    const loanDebt = db
      .prepare(
        "SELECT snapshot_date, currency, ROUND(SUM(remaining_balance),2) AS total FROM loans GROUP BY snapshot_date, currency ORDER BY snapshot_date, currency"
      )
      .all();
    return { dates, cash, cardDebt, loanDebt };
  } finally {
    db.close();
  }
}
