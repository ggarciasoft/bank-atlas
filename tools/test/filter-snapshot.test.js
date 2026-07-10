import { test } from "node:test";
import assert from "node:assert/strict";

import { filterSnapshotForFrontend } from "../lib/filter-snapshot.js";
import { EXAMPLE_BANK_ID } from "../lib/web-config.js";

const exampleBank = {
  bank_id: EXAMPLE_BANK_ID,
  bank_name: "Example Bank",
  extraction_status: "completed",
  accounts: [{ currency: "DOP", available_balance: 125000.5, confidence: "high" }],
  credit_cards: [],
  loans: [],
  transactions: [],
};

const demoBank = {
  bank_id: "demo-savings",
  bank_name: "Atlas Savings",
  extraction_status: "completed",
  accounts: [{ currency: "DOP", available_balance: 5000, confidence: "high" }],
  credit_cards: [],
  loans: [],
  transactions: [],
};

const realBank = {
  bank_id: "bpd",
  bank_name: "Banco Popular Dominicano",
  extraction_status: "completed",
  accounts: [{ currency: "DOP", available_balance: 43236.34, confidence: "high" }],
  credit_cards: [],
  loans: [],
  transactions: [],
};

test("filterSnapshotForFrontend removes example and demo banks by default", () => {
  const snapshot = {
    snapshot_date: "2026-07-07",
    generated_at: "2026-07-07T18:00:00-04:00",
    partial: false,
    banks: [exampleBank, demoBank, realBank],
    summary: {
      cash_by_currency: [{ currency: "DOP", total: 173236.84 }],
      credit_card_debt_by_currency: [],
      loan_debt_by_currency: [],
      upcoming_payments: [],
      large_movements: [],
      needs_review: [],
    },
  };

  const filtered = filterSnapshotForFrontend(snapshot);
  assert.equal(filtered.banks.length, 1);
  assert.equal(filtered.banks[0].bank_id, "bpd");
  assert.deepEqual(filtered.summary.cash_by_currency, [{ currency: "DOP", total: 43236.34 }]);
});

test("filterSnapshotForFrontend keeps sample banks when disabled", () => {
  const snapshot = {
    snapshot_date: "2026-07-07",
    banks: [exampleBank, demoBank, realBank],
    summary: {},
  };

  const filtered = filterSnapshotForFrontend(snapshot, { excludeExampleBank: false });
  assert.equal(filtered, snapshot);
  assert.equal(filtered.banks.length, 3);
});

test("filterSnapshotForFrontend is a no-op when sample banks are absent", () => {
  const snapshot = {
    snapshot_date: "2026-07-07",
    banks: [realBank],
    summary: { cash_by_currency: [{ currency: "DOP", total: 43236.34 }] },
  };

  const filtered = filterSnapshotForFrontend(snapshot);
  assert.equal(filtered, snapshot);
});
