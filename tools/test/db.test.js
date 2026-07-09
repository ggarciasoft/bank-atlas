import { test } from "node:test";
import assert from "node:assert/strict";
import { unlinkSync } from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  saveSnapshotToDb,
  listSnapshots,
  readSnapshotFromDb,
  readLatestSnapshotFromDb,
  getTrends,
} from "../lib/db.js";

const FIXTURE = {
  snapshot_date: "2026-07-01",
  generated_at: "2026-07-01T12:00:00-04:00",
  partial: false,
  banks: [
    {
      bank_id: "demo",
      bank_name: "Demo Bank",
      accounts: [
        {
          account_id_masked: "****1111",
          account_name: "Checking",
          account_type: "checking",
          currency: "DOP",
          available_balance: 1000,
          current_balance: 1000,
          confidence: "high",
          needs_review: false,
        },
      ],
      credit_cards: [
        {
          card_id_masked: "****2222",
          card_name: "Visa",
          currency: "DOP",
          current_balance: 200,
          statement_balance: 180,
          minimum_payment: 20,
          due_date: "2026-07-15",
          available_credit: 800,
          credit_limit: 1000,
          confidence: "high",
          needs_review: false,
        },
      ],
      loans: [
        {
          loan_id_masked: "****3333",
          loan_name: "Auto",
          loan_type: "vehicle",
          currency: "DOP",
          remaining_balance: 5000,
          monthly_payment: 250,
          next_due_date: "2026-07-20",
          confidence: "medium",
          needs_review: false,
        },
      ],
      transactions: [
        {
          transaction_id_local: "demo-1",
          account_id_masked: "****1111",
          date: "2026-06-30",
          description: "Grocery",
          amount: 50,
          direction: "debit",
          currency: "DOP",
          category_guess: "groceries",
          is_pending: false,
          is_large_movement: false,
          possible_duplicate: false,
          confidence: "high",
          needs_review: false,
        },
      ],
    },
  ],
};

function tempDb() {
  return path.join(os.tmpdir(), `bank-atlas-db-${process.pid}-${Date.now()}.db`);
}

test("saveSnapshotToDb and readSnapshotFromDb round-trip", () => {
  const dbPath = tempDb();
  try {
    const { counts } = saveSnapshotToDb(FIXTURE, dbPath);
    assert.equal(counts.accounts, 1);
    assert.equal(counts.credit_cards, 1);
    assert.equal(counts.loans, 1);
    assert.equal(counts.transactions, 1);

    const back = readSnapshotFromDb("2026-07-01", dbPath);
    assert.ok(back);
    assert.equal(back.snapshot_date, "2026-07-01");
    assert.equal(back.generated_at, FIXTURE.generated_at);
    assert.equal(back.partial, false);
    assert.equal(back.banks.length, 1);
    assert.equal(back.banks[0].bank_id, "demo");
    assert.equal(back.banks[0].accounts[0].available_balance, 1000);
    assert.equal(back.banks[0].credit_cards[0].current_balance, 200);
    assert.equal(back.banks[0].loans[0].remaining_balance, 5000);
    assert.equal(back.banks[0].transactions[0].description, "Grocery");
    assert.equal(back.banks[0].transactions[0].is_pending, false);
    assert.deepEqual(back.summary.cash_by_currency, [{ currency: "DOP", total: 1000 }]);
  } finally {
    for (const suffix of ["", "-wal", "-shm"]) {
      try {
        unlinkSync(dbPath + suffix);
      } catch {
        /* ignore */
      }
    }
  }
});

test("saveSnapshotToDb is idempotent per snapshot_date", () => {
  const dbPath = tempDb();
  try {
    saveSnapshotToDb(FIXTURE, dbPath);
    const updated = structuredClone(FIXTURE);
    updated.banks[0].accounts[0].available_balance = 1500;
    saveSnapshotToDb(updated, dbPath);

    const list = listSnapshots(dbPath);
    assert.equal(list.length, 1);
    const back = readSnapshotFromDb("2026-07-01", dbPath);
    assert.equal(back.banks[0].accounts[0].available_balance, 1500);
  } finally {
    for (const suffix of ["", "-wal", "-shm"]) {
      try {
        unlinkSync(dbPath + suffix);
      } catch {
        /* ignore */
      }
    }
  }
});

test("listSnapshots and readLatestSnapshotFromDb", () => {
  const dbPath = tempDb();
  try {
    assert.deepEqual(listSnapshots(dbPath), []);
    assert.equal(readLatestSnapshotFromDb(dbPath), null);
    assert.equal(readSnapshotFromDb("2026-07-99", dbPath), null);

    saveSnapshotToDb(FIXTURE, dbPath);
    const later = structuredClone(FIXTURE);
    later.snapshot_date = "2026-07-08";
    saveSnapshotToDb(later, dbPath);

    const list = listSnapshots(dbPath);
    assert.equal(list.length, 2);
    assert.equal(list[0].snapshot_date, "2026-07-01");
    assert.equal(list[1].snapshot_date, "2026-07-08");

    const latest = readLatestSnapshotFromDb(dbPath);
    assert.equal(latest.snapshot_date, "2026-07-08");
  } finally {
    for (const suffix of ["", "-wal", "-shm"]) {
      try {
        unlinkSync(dbPath + suffix);
      } catch {
        /* ignore */
      }
    }
  }
});

test("getTrends aggregates cash and debt by currency", () => {
  const dbPath = tempDb();
  try {
    saveSnapshotToDb(FIXTURE, dbPath);
    const { dates, cash, cardDebt, loanDebt } = getTrends(dbPath);
    assert.deepEqual(dates, ["2026-07-01"]);
    assert.equal(cash[0].total, 1000);
    assert.equal(cardDebt[0].total, 200);
    assert.equal(loanDebt[0].total, 5000);
  } finally {
    for (const suffix of ["", "-wal", "-shm"]) {
      try {
        unlinkSync(dbPath + suffix);
      } catch {
        /* ignore */
      }
    }
  }
});
