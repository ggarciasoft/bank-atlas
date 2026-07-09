import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, mkdirSync } from "node:fs";
import os from "node:os";
import path from "node:path";

import { PATHS } from "../lib/io.js";
import {
  itemKey,
  emptyItems,
  upsertFromExtraction,
  mergeIntoBank,
  applyEdit,
  normalizeItemsDoc,
  writeBankItems,
  readBankItems,
} from "../lib/items.js";
import { nextDayOfMonth, dayFromIso } from "../lib/dateutil.js";

test("itemKey and day helpers", () => {
  assert.equal(itemKey("****1234", "DOP"), "****1234|DOP");
  assert.equal(dayFromIso("2026-07-15"), 15);
  assert.equal(nextDayOfMonth(15, "2026-07-09"), "2026-07-15");
  assert.equal(nextDayOfMonth(15, "2026-07-20"), "2026-08-15");
  assert.equal(nextDayOfMonth(31, "2026-04-01"), "2026-04-30");
});

test("upsertFromExtraction seeds and respects user_edited", () => {
  let registry = emptyItems("demo", "Demo");
  registry.credit_cards.push({
    key: "****2222|DOP",
    card_id_masked: "****2222",
    card_name: "User Card Name",
    currency: "DOP",
    credit_limit: 5000,
    statement_closing_day: 25,
    payment_due_day: 10,
    notes: "",
    user_edited: ["card_name", "payment_due_day"],
  });

  const bank = {
    bank_id: "demo",
    bank_name: "Demo",
    accounts: [],
    credit_cards: [
      {
        card_id_masked: "****2222",
        card_name: "Extracted Visa",
        currency: "DOP",
        credit_limit: 10000,
        due_date: "2026-07-11",
        current_balance: 100,
      },
    ],
    loans: [],
  };

  registry = upsertFromExtraction(registry, bank);
  const card = registry.credit_cards[0];
  assert.equal(card.card_name, "User Card Name");
  assert.equal(card.payment_due_day, 10);
  assert.equal(card.credit_limit, 10000);
});

test("mergeIntoBank applies precedence and computes due dates", () => {
  const registry = normalizeItemsDoc({
    bank_id: "demo",
    bank_name: "Demo",
    accounts: [],
    credit_cards: [],
    loans: [
      {
        key: "****3333|DOP",
        loan_id_masked: "****3333",
        loan_name: "Mortgage",
        loan_type: "mortgage",
        currency: "DOP",
        monthly_payment: 1000,
        payment_due_day: 15,
        notes: "",
        user_edited: ["payment_due_day"],
      },
    ],
  });

  const bank = {
    bank_id: "demo",
    bank_name: "Demo",
    accounts: [],
    credit_cards: [],
    loans: [
      {
        loan_id_masked: "****3333",
        loan_name: "Extracted mortgage",
        loan_type: "mortgage",
        currency: "DOP",
        remaining_balance: 50000,
        monthly_payment: 900,
        next_due_date: null,
        confidence: "high",
        needs_review: false,
      },
    ],
    transactions: [],
  };

  const merged = mergeIntoBank(bank, registry, "2026-07-09");
  assert.equal(merged.loans[0].loan_name, "Extracted mortgage");
  assert.equal(merged.loans[0].monthly_payment, 900);
  assert.equal(merged.loans[0].next_due_date, "2026-07-15");
});

test("mergeIntoBank fills card closing date from registry", () => {
  const registry = normalizeItemsDoc({
    bank_id: "demo",
    bank_name: "Demo",
    credit_cards: [
      {
        key: "****2222|DOP",
        card_id_masked: "****2222",
        card_name: "Visa",
        currency: "DOP",
        credit_limit: 1000,
        statement_closing_day: 25,
        payment_due_day: null,
        notes: "",
        user_edited: [],
      },
    ],
    accounts: [],
    loans: [],
  });

  const bank = {
    bank_id: "demo",
    bank_name: "Demo",
    accounts: [],
    loans: [],
    credit_cards: [
      {
        card_id_masked: "****2222",
        card_name: "Visa",
        currency: "DOP",
        current_balance: 100,
        credit_limit: null,
        due_date: null,
        confidence: "high",
        needs_review: false,
      },
    ],
    transactions: [],
  };

  const merged = mergeIntoBank(bank, registry, "2026-07-09");
  assert.equal(merged.credit_cards[0].statement_closing_date, "2026-07-25");
  assert.equal(merged.credit_cards[0].credit_limit, 1000);
});

test("applyEdit marks user_edited fields", () => {
  const registry = normalizeItemsDoc({
    bank_id: "demo",
    bank_name: "Demo",
    loans: [
      {
        key: "****3333|DOP",
        loan_id_masked: "****3333",
        loan_name: "Auto",
        loan_type: "vehicle",
        currency: "DOP",
        monthly_payment: 250,
        payment_due_day: null,
        term_months: null,
        notes: "",
        user_edited: [],
      },
    ],
    accounts: [],
    credit_cards: [],
  });

  applyEdit(registry, "loans", "****3333|DOP", { payment_due_day: 20 });
  assert.equal(registry.loans[0].payment_due_day, 20);
  assert.deepEqual(registry.loans[0].user_edited, ["payment_due_day"]);
});

test("read and write bank items file", async () => {
  const tmpRoot = mkdtempSync(path.join(os.tmpdir(), "bank-atlas-items-"));
  const orig = PATHS.configItems;
  PATHS.configItems = path.join(tmpRoot, "items");
  mkdirSync(PATHS.configItems, { recursive: true });

  try {
    const doc = emptyItems("demo", "Demo Bank");
    doc.accounts.push({
      key: "****1111|DOP",
      account_id_masked: "****1111",
      account_name: "Checking",
      account_type: "checking",
      currency: "DOP",
      notes: "",
      user_edited: [],
    });
    await writeBankItems("demo", doc);
    const back = await readBankItems("demo");
    assert.equal(back.accounts.length, 1);
    assert.equal(back.accounts[0].account_name, "Checking");
  } finally {
    PATHS.configItems = orig;
    rmSync(tmpRoot, { recursive: true, force: true });
  }
});
