// Compute the snapshot summary block from the per-bank data.
// Mirrors docs/08 (summary) and docs/04 (final response requirement).

import { money } from "./normalize.js";

const DEFAULT_UPCOMING_HORIZON_DAYS = 45;

function addByCurrency(map, currency, amount) {
  if (!currency || amount === null || amount === undefined) return;
  const value = Number(amount);
  if (!Number.isFinite(value)) return;
  map.set(currency, (map.get(currency) || 0) + value);
}

function mapToList(map) {
  return [...map.entries()]
    .map(([currency, total]) => ({ currency, total: money(total) }))
    .sort((a, b) => a.currency.localeCompare(b.currency));
}

function daysBetween(fromIso, toIso) {
  const from = new Date(`${fromIso}T00:00:00Z`);
  const to = new Date(`${toIso}T00:00:00Z`);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) return null;
  return Math.round((to - from) / (1000 * 60 * 60 * 24));
}

/**
 * @param {any[]} banks
 * @param {string} snapshotDate ISO date used to compute days_until.
 * @param {number} [horizonDays]
 */
export function buildSummary(banks, snapshotDate, horizonDays = DEFAULT_UPCOMING_HORIZON_DAYS) {
  const cash = new Map();
  const cardDebt = new Map();
  const loanDebt = new Map();
  const upcoming = [];
  const largeMovements = [];
  const needsReview = [];

  for (const bank of banks) {
    for (const acc of bank.accounts || []) {
      addByCurrency(cash, acc.currency, acc.available_balance ?? acc.current_balance);
      flagReview(needsReview, bank, "account", acc, acc.account_id_masked, acc.account_name);
    }

    for (const card of bank.credit_cards || []) {
      addByCurrency(cardDebt, card.currency, card.current_balance);
      if (card.due_date) {
        upcoming.push({
          date: card.due_date,
          bank_id: bank.bank_id,
          bank_name: bank.bank_name,
          type: "credit_card",
          description: `${card.card_name || "Credit card"} statement payment`,
          currency: card.currency,
          amount: money(card.statement_balance ?? card.minimum_payment ?? null),
          days_until: snapshotDate ? daysBetween(snapshotDate, card.due_date) : null,
        });
      }
      flagReview(needsReview, bank, "credit_card", card, card.card_id_masked, card.card_name);
    }

    for (const loan of bank.loans || []) {
      addByCurrency(loanDebt, loan.currency, loan.remaining_balance);
      if (loan.next_due_date) {
        upcoming.push({
          date: loan.next_due_date,
          bank_id: bank.bank_id,
          bank_name: bank.bank_name,
          type: "loan",
          description: `${loan.loan_name || "Loan"} monthly payment`,
          currency: loan.currency,
          amount: money(loan.monthly_payment ?? null),
          days_until: snapshotDate ? daysBetween(snapshotDate, loan.next_due_date) : null,
        });
      }
      flagReview(needsReview, bank, "loan", loan, loan.loan_id_masked, loan.loan_name);
    }

    for (const tx of bank.transactions || []) {
      if (tx.is_large_movement === true) {
        largeMovements.push({
          date: tx.date,
          bank_id: bank.bank_id,
          bank_name: bank.bank_name,
          account_id_masked: tx.account_id_masked,
          description: tx.description,
          currency: tx.currency,
          amount: money(tx.amount),
          direction: tx.direction,
          reason: reasonFor(tx),
        });
      }
      flagReview(needsReview, bank, "transaction", tx, tx.account_id_masked, tx.description);
    }
  }

  const withinHorizon = (u) =>
    u.days_until === null || (u.days_until >= -3 && u.days_until <= horizonDays);

  upcoming.sort((a, b) => String(a.date).localeCompare(String(b.date)));
  largeMovements.sort((a, b) => String(b.date).localeCompare(String(a.date)));

  return {
    cash_by_currency: mapToList(cash),
    credit_card_debt_by_currency: mapToList(cardDebt),
    loan_debt_by_currency: mapToList(loanDebt),
    upcoming_payments: upcoming.filter(withinHorizon),
    large_movements: largeMovements,
    needs_review: needsReview,
  };
}

function flagReview(list, bank, kind, obj, id, label) {
  if (obj.needs_review === true || obj.confidence === "low") {
    list.push({
      bank_id: bank.bank_id,
      bank_name: bank.bank_name,
      kind,
      id_masked: id || null,
      label: label || null,
      confidence: obj.confidence || null,
      reason: obj.needs_review === true ? "marked needs_review" : "low confidence",
    });
  }
}

function reasonFor(tx) {
  if (tx.reason) return tx.reason;
  return "flagged as large or noteworthy movement";
}
