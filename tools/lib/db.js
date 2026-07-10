// Optional SQLite history store using Node's built-in node:sqlite.
// Each build can be pushed into output/finance.db (idempotent per snapshot_date),
// enabling net-worth / debt trends over time. Mirrors docs/14 Upgrade 1 & 2.

import { mkdirSync } from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

import { PATHS } from "./io.js";
import { buildSummary } from "./summarize.js";

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
  due_date TEXT, statement_closing_date TEXT, available_credit REAL, credit_limit REAL,
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
CREATE TABLE IF NOT EXISTS banks (
  bank_id TEXT PRIMARY KEY,
  bank_name TEXT NOT NULL,
  login_url TEXT,
  dashboard_url TEXT,
  demo_port INTEGER,
  is_demo INTEGER NOT NULL DEFAULT 0,
  config_path TEXT
);
`;

function b(v) {
  return v === true ? 1 : 0;
}
function fromBool(v) {
  return v === 1;
}
function num(v) {
  return v === null || v === undefined || !Number.isFinite(Number(v)) ? null : Number(v);
}

function ensureDbDir(dbPath) {
  mkdirSync(path.dirname(dbPath), { recursive: true });
}

function open(dbPath = DEFAULT_DB) {
  ensureDbDir(dbPath);
  const db = new DatabaseSync(dbPath);
  db.exec(SCHEMA);
  migrateCreditCards(db);
  return db;
}

function migrateCreditCards(db) {
  const cols = db.prepare("PRAGMA table_info(credit_cards)").all();
  if (!cols.some((c) => c.name === "statement_closing_date")) {
    db.exec("ALTER TABLE credit_cards ADD COLUMN statement_closing_date TEXT");
  }
}

function bankShell(bankId, bankName) {
  return {
    bank_id: bankId,
    bank_name: bankName,
    extraction_status: "completed",
    extracted_at: null,
    accounts: [],
    credit_cards: [],
    loans: [],
    transactions: [],
    notes: [],
    warnings: [],
  };
}

function rowToAccount(r) {
  return {
    account_id_masked: r.account_id_masked,
    account_name: r.account_name,
    account_type: r.account_type,
    currency: r.currency,
    available_balance: r.available_balance,
    current_balance: r.current_balance,
    confidence: r.confidence,
    needs_review: fromBool(r.needs_review),
  };
}

function rowToCreditCard(r) {
  return {
    card_id_masked: r.card_id_masked,
    card_name: r.card_name,
    currency: r.currency,
    current_balance: r.current_balance,
    statement_balance: r.statement_balance,
    minimum_payment: r.minimum_payment,
    due_date: r.due_date,
    statement_closing_date: r.statement_closing_date ?? null,
    available_credit: r.available_credit,
    credit_limit: r.credit_limit,
    confidence: r.confidence,
    needs_review: fromBool(r.needs_review),
  };
}

function rowToLoan(r) {
  return {
    loan_id_masked: r.loan_id_masked,
    loan_name: r.loan_name,
    loan_type: r.loan_type,
    currency: r.currency,
    remaining_balance: r.remaining_balance,
    monthly_payment: r.monthly_payment,
    next_due_date: r.next_due_date,
    confidence: r.confidence,
    needs_review: fromBool(r.needs_review),
  };
}

function rowToTransaction(r) {
  return {
    transaction_id_local: r.transaction_id_local,
    bank_id: r.bank_id,
    account_id_masked: r.account_id_masked,
    date: r.date,
    description: r.description,
    amount: r.amount,
    direction: r.direction,
    currency: r.currency,
    category_guess: r.category_guess,
    is_pending: fromBool(r.is_pending),
    is_large_movement: fromBool(r.is_large_movement),
    possible_duplicate: fromBool(r.possible_duplicate),
    confidence: r.confidence,
    needs_review: fromBool(r.needs_review),
  };
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
      `INSERT INTO credit_cards VALUES (@snapshot_date,@bank_id,@bank_name,@card_id_masked,@card_name,@currency,@current_balance,@statement_balance,@minimum_payment,@due_date,@statement_closing_date,@available_credit,@credit_limit,@confidence,@needs_review)`
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
          statement_closing_date: c.statement_closing_date ?? null,
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
 * List recorded snapshots (oldest first).
 * @param {string} [dbPath]
 * @returns {{ snapshot_date: string, generated_at: string | null, partial: boolean }[]}
 */
export function listSnapshots(dbPath = DEFAULT_DB) {
  const db = open(dbPath);
  try {
    return db
      .prepare("SELECT snapshot_date, generated_at, partial FROM snapshots ORDER BY snapshot_date")
      .all()
      .map((r) => ({
        snapshot_date: r.snapshot_date,
        generated_at: r.generated_at ?? null,
        partial: fromBool(r.partial),
      }));
  } finally {
    db.close();
  }
}

/**
 * Reconstruct a snapshot object from the database for one date.
 * Summary is recomputed from stored rows; bank notes/warnings and source_page fields are not persisted.
 * @param {string} snapshotDate
 * @param {string} [dbPath]
 * @returns {object | null}
 */
export function readSnapshotFromDb(snapshotDate, dbPath = DEFAULT_DB) {
  const db = open(dbPath);
  try {
    const meta = db.prepare("SELECT snapshot_date, generated_at, partial FROM snapshots WHERE snapshot_date = ?").get(snapshotDate);
    if (!meta) return null;

    const banks = new Map();
    const touch = (bankId, bankName) => {
      if (!banks.has(bankId)) banks.set(bankId, bankShell(bankId, bankName));
      return banks.get(bankId);
    };

    for (const r of db.prepare("SELECT * FROM accounts WHERE snapshot_date = ?").all(snapshotDate)) {
      touch(r.bank_id, r.bank_name).accounts.push(rowToAccount(r));
    }
    for (const r of db.prepare("SELECT * FROM credit_cards WHERE snapshot_date = ?").all(snapshotDate)) {
      touch(r.bank_id, r.bank_name).credit_cards.push(rowToCreditCard(r));
    }
    for (const r of db.prepare("SELECT * FROM loans WHERE snapshot_date = ?").all(snapshotDate)) {
      touch(r.bank_id, r.bank_name).loans.push(rowToLoan(r));
    }
    for (const r of db.prepare("SELECT * FROM transactions WHERE snapshot_date = ? ORDER BY date, description").all(snapshotDate)) {
      touch(r.bank_id, r.bank_name).transactions.push(rowToTransaction(r));
    }

    const bankList = [...banks.values()].sort((a, b) => a.bank_id.localeCompare(b.bank_id));
    return {
      snapshot_date: meta.snapshot_date,
      generated_at: meta.generated_at ?? null,
      partial: fromBool(meta.partial),
      banks: bankList,
      summary: buildSummary(bankList, meta.snapshot_date),
    };
  } finally {
    db.close();
  }
}

/**
 * Read the most recent snapshot in the database.
 * @param {string} [dbPath]
 * @returns {object | null}
 */
export function readLatestSnapshotFromDb(dbPath = DEFAULT_DB) {
  const list = listSnapshots(dbPath);
  if (list.length === 0) return null;
  return readSnapshotFromDb(list[list.length - 1].snapshot_date, dbPath);
}

/**
 * Compute per-snapshot trends: cash, card debt, and loan debt by currency.
 * @param {string} [dbPath]
 * @returns {{ dates: string[], cash: Row[], cardDebt: Row[], loanDebt: Row[] }}
 * @typedef {{ snapshot_date: string, currency: string, total: number }} Row
 */
/**
 * Upsert bank configuration rows (demo banks, login URLs, etc.).
 * @param {Array<{ bank_id: string, bank_name: string, login_url?: string, dashboard_url?: string, demo_port?: number, is_demo?: boolean, config_path?: string }>} rows
 * @param {string} [dbPath]
 * @returns {{ dbPath: string, count: number }}
 */
export function saveBankConfigsToDb(rows, dbPath = DEFAULT_DB) {
  const db = open(dbPath);
  let count = 0;
  try {
    const stmt = db.prepare(
      `INSERT INTO banks (bank_id, bank_name, login_url, dashboard_url, demo_port, is_demo, config_path)
       VALUES (@bank_id, @bank_name, @login_url, @dashboard_url, @demo_port, @is_demo, @config_path)
       ON CONFLICT(bank_id) DO UPDATE SET
         bank_name = excluded.bank_name,
         login_url = excluded.login_url,
         dashboard_url = excluded.dashboard_url,
         demo_port = excluded.demo_port,
         is_demo = excluded.is_demo,
         config_path = excluded.config_path`
    );
    db.exec("BEGIN");
    for (const row of rows) {
      stmt.run({
        bank_id: row.bank_id,
        bank_name: row.bank_name,
        login_url: row.login_url ?? null,
        dashboard_url: row.dashboard_url ?? null,
        demo_port: row.demo_port ?? null,
        is_demo: row.is_demo ? 1 : 0,
        config_path: row.config_path ?? null,
      });
      count += 1;
    }
    db.exec("COMMIT");
  } catch (err) {
    db.exec("ROLLBACK");
    throw err;
  } finally {
    db.close();
  }
  return { dbPath, count };
}

/**
 * List bank configuration rows stored in the database.
 * @param {string} [dbPath]
 * @returns {Array<{ bank_id: string, bank_name: string, login_url: string | null, dashboard_url: string | null, demo_port: number | null, is_demo: boolean, config_path: string | null }>}
 */
export function listBankConfigs(dbPath = DEFAULT_DB) {
  const db = open(dbPath);
  try {
    return db
      .prepare(
        "SELECT bank_id, bank_name, login_url, dashboard_url, demo_port, is_demo, config_path FROM banks ORDER BY bank_id"
      )
      .all()
      .map((r) => ({
        bank_id: r.bank_id,
        bank_name: r.bank_name,
        login_url: r.login_url ?? null,
        dashboard_url: r.dashboard_url ?? null,
        demo_port: r.demo_port ?? null,
        is_demo: r.is_demo === 1,
        config_path: r.config_path ?? null,
      }));
  } finally {
    db.close();
  }
}

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
