import { test } from "node:test";
import assert from "node:assert/strict";

import {
  parseAmount,
  parseGroupedNumber,
  normalizeDate,
  maskIdentifier,
  looksLikeFullAccountNumber,
  normalizeCurrency,
} from "../lib/normalize.js";
import { annotateTransactions } from "../lib/analyze.js";
import { buildSummary } from "../lib/summarize.js";
import { validateBank, partition } from "../lib/validate.js";

test("parseAmount handles currency symbols and signs", () => {
  assert.deepEqual(parseAmount("RD$ 12,500.75"), { amount: 12500.75, direction: "credit", currency: "DOP" });
  assert.deepEqual(parseAmount("(1,500.00)"), { amount: 1500, direction: "debit", currency: null });
  assert.deepEqual(parseAmount("-1.500,00"), { amount: 1500, direction: "debit", currency: null });
  assert.equal(parseAmount(-42).direction, "debit");
});

test("parseGroupedNumber picks the right decimal separator", () => {
  assert.equal(parseGroupedNumber("12,500.75"), 12500.75);
  assert.equal(parseGroupedNumber("12.500,75"), 12500.75);
  assert.equal(parseGroupedNumber("1000"), 1000);
});

test("normalizeDate is ISO or flagged ambiguous", () => {
  assert.deepEqual(normalizeDate("2026-07-06"), { date: "2026-07-06", ambiguous: false });
  assert.deepEqual(normalizeDate("25/12/2026"), { date: "2026-12-25", ambiguous: false });
  assert.equal(normalizeDate("07/06/2026").ambiguous, true);
});

test("masking and full-number detection", () => {
  assert.equal(maskIdentifier("1234567890123456"), "****3456");
  assert.equal(maskIdentifier("****3456"), "****3456");
  assert.equal(looksLikeFullAccountNumber("1234 5678 9012 3456"), true);
  assert.equal(looksLikeFullAccountNumber("****3456"), false);
  assert.equal(normalizeCurrency("RD$"), "DOP");
});

test("annotateTransactions flags keywords and duplicates", () => {
  const txs = [
    { bank_id: "b", currency: "DOP", direction: "debit", amount: 100, description: "coffee", date: "2026-07-01" },
    { bank_id: "b", currency: "DOP", direction: "debit", amount: 100, description: "coffee shop", date: "2026-07-01" },
    { bank_id: "b", currency: "DOP", direction: "debit", amount: 5000, description: "INTERES", date: "2026-07-02" },
  ];
  annotateTransactions(txs);
  assert.equal(txs[2].is_large_movement, true, "keyword flags large movement");
  assert.equal(txs[0].possible_duplicate, true, "same amount+date+desc = duplicate");
});

test("buildSummary totals by currency and lists upcoming", () => {
  const banks = [
    {
      bank_id: "b",
      bank_name: "B",
      accounts: [{ currency: "DOP", available_balance: 100, confidence: "high" }],
      credit_cards: [{ currency: "DOP", current_balance: 50, minimum_payment: 5, due_date: "2026-07-20", confidence: "high" }],
      loans: [{ currency: "DOP", remaining_balance: 1000, monthly_payment: 100, next_due_date: "2026-07-30", confidence: "low" }],
      transactions: [],
    },
  ];
  const s = buildSummary(banks, "2026-07-06");
  assert.deepEqual(s.cash_by_currency, [{ currency: "DOP", total: 100 }]);
  assert.equal(s.upcoming_payments.length, 2);
  assert.equal(s.needs_review.length, 1, "low-confidence loan needs review");
});

test("buildSummary uses statement balance for credit card upcoming payments", () => {
  const banks = [
    {
      bank_id: "b",
      bank_name: "B",
      credit_cards: [
        {
          card_name: "Visa",
          currency: "DOP",
          statement_balance: 420,
          minimum_payment: 35,
          due_date: "2026-07-20",
          confidence: "high",
        },
      ],
    },
  ];
  const s = buildSummary(banks, "2026-07-06");
  assert.equal(s.upcoming_payments.length, 1);
  assert.equal(s.upcoming_payments[0].description, "Visa statement payment");
  assert.equal(s.upcoming_payments[0].amount, 420);
});

test("validateBank flags unmasked numbers and missing currency", () => {
  const issues = validateBank({
    bank_id: "b",
    accounts: [{ account_id_masked: "1234567890123456", confidence: "high", available_balance: 10 }],
  });
  const { errors } = partition(issues);
  assert.ok(errors.some((e) => /full account number/.test(e.message)));
  assert.ok(errors.some((e) => /currency is required/.test(e.message)));
});
