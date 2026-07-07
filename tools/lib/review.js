// Read-only review of the existing snapshot. No browser, no rebuild.
// Mirrors docs/10 Runbook E and docs/11 "Review financial situation".

import path from "node:path";

import { PATHS, readJson, exists } from "./io.js";

function fmtCurrencyList(list) {
  if (!list || list.length === 0) return "none";
  return list.map((x) => `${x.currency} ${Number(x.total).toLocaleString("en-US")}`).join(", ");
}

/**
 * @returns {Promise<string>} A human-readable summary of the current snapshot.
 */
export async function review() {
  const file = path.join(PATHS.output, "financial-snapshot.json");
  if (!(await exists(file))) {
    return "No snapshot found. Run `npm run build` after adding data to input/banks/.";
  }
  const snap = await readJson(file);
  const s = snap.summary || {};
  const lines = [];

  lines.push(`Financial review — snapshot ${snap.snapshot_date || "?"} (partial: ${snap.partial ? "yes" : "no"})`);
  lines.push("");
  lines.push(`Net cash available:    ${fmtCurrencyList(s.cash_by_currency)}`);
  lines.push(`Credit card debt:      ${fmtCurrencyList(s.credit_card_debt_by_currency)}`);
  lines.push(`Loan debt:             ${fmtCurrencyList(s.loan_debt_by_currency)}`);
  lines.push("");

  const upcoming = s.upcoming_payments || [];
  lines.push(`Upcoming payments (${upcoming.length}):`);
  if (upcoming.length === 0) lines.push("  none");
  for (const u of upcoming.slice(0, 15)) {
    const days = u.days_until === null || u.days_until === undefined ? "" : ` (${u.days_until}d)`;
    lines.push(`  ${u.date}${days}  ${u.bank_name}  ${u.description}  ${u.currency} ${u.amount ?? "?"}`);
  }
  lines.push("");

  const large = s.large_movements || [];
  lines.push(`Large / unusual movements (${large.length}):`);
  if (large.length === 0) lines.push("  none");
  for (const m of large.slice(0, 15)) {
    lines.push(`  ${m.date}  ${m.bank_name}  ${m.description}  ${m.currency} ${m.amount}  — ${m.reason}`);
  }
  lines.push("");

  const review = s.needs_review || [];
  lines.push(`Needs manual review (${review.length}):`);
  if (review.length === 0) lines.push("  none");
  for (const r of review.slice(0, 20)) {
    lines.push(`  ${r.bank_name}  ${r.kind}  ${r.label || r.id_masked || ""}  — ${r.reason}`);
  }

  const banks = snap.banks || [];
  const incomplete = banks.filter((b) => b.extraction_status !== "completed");
  if (incomplete.length) {
    lines.push("");
    lines.push("Banks needing another pass:");
    for (const b of incomplete) lines.push(`  ${b.bank_name} (${b.extraction_status})`);
  }

  return lines.join("\n");
}
