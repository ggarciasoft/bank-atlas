// Structured wrappers for CLI commands exposed via the local web API.

import { existsSync } from "node:fs";
import path from "node:path";

import { PATHS, listJson, readJson, exists } from "./io.js";
import { validateSnapshot, validateBank, partition } from "./validate.js";
import { audit } from "./audit.js";
import { review } from "./review.js";
import { saveSnapshotToDb, listSnapshots, getTrends, DEFAULT_DB } from "./db.js";

function dedupeIssues(issues) {
  const seen = new Set();
  const out = [];
  for (const i of issues) {
    const key = `${i.level}|${i.where}|${i.message}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(i);
  }
  return out;
}

/**
 * @returns {Promise<{ ok: boolean, command: string, banks_checked: number, errors: number, warnings: number, issues: import("./validate.js").Issue[] }>}
 */
export async function runValidate() {
  const files = await listJson(PATHS.inputBanks);
  const allIssues = [];
  for (const f of files) {
    const bank = await readJson(f);
    allIssues.push(...validateBank(bank));
  }
  const snapPath = path.join(PATHS.output, "financial-snapshot.json");
  if (await exists(snapPath)) {
    const snap = await readJson(snapPath);
    allIssues.push(...validateSnapshot(snap));
  }
  const { errors, warnings } = partition(dedupeIssues(allIssues));
  return {
    ok: errors.length === 0,
    command: "validate",
    banks_checked: files.length,
    errors: errors.length,
    warnings: warnings.length,
    issues: [...warnings, ...errors],
  };
}

/**
 * @returns {Promise<{ ok: boolean, command: string, errors: number, warnings: number, findings: import("./audit.js").Finding[] }>}
 */
export async function runAudit() {
  const findings = await audit();
  const errors = findings.filter((f) => f.level === "error");
  const warnings = findings.filter((f) => f.level === "warning");
  return {
    ok: errors.length === 0,
    command: "audit",
    errors: errors.length,
    warnings: warnings.length,
    findings,
  };
}

/** @returns {Promise<{ ok: boolean, command: string, text: string }>} */
export async function runReview() {
  const text = await review();
  return { ok: true, command: "review", text };
}

/**
 * @returns {Promise<{ ok: boolean, command: string, snapshot_date?: string, db_path?: string, counts?: Record<string, number>, error?: string }>}
 */
export async function runDbSave() {
  const snapPath = path.join(PATHS.output, "financial-snapshot.json");
  if (!(await exists(snapPath))) {
    return { ok: false, command: "db", error: "No snapshot found. Run build first." };
  }
  const snapshot = await readJson(snapPath);
  const { counts, dbPath } = saveSnapshotToDb(snapshot);
  return {
    ok: true,
    command: "db",
    snapshot_date: snapshot.snapshot_date,
    db_path: path.relative(PATHS.root, dbPath),
    counts,
  };
}

/** @returns {{ ok: boolean, command: string, snapshots: { snapshot_date: string, generated_at: string | null, partial: boolean }[], error?: string }} */
export function runDbList() {
  if (!existsSync(DEFAULT_DB)) {
    return { ok: false, command: "db:list", snapshots: [], error: "No history database. Save a snapshot first." };
  }
  return { ok: true, command: "db:list", snapshots: listSnapshots() };
}

/** @returns {{ ok: boolean, command: string, snapshots: number, dates: string[], cash: object[], card_debt: object[], loan_debt: object[], error?: string }} */
export function runTrends() {
  if (!existsSync(DEFAULT_DB)) {
    return {
      ok: false,
      command: "trends",
      snapshots: 0,
      dates: [],
      cash: [],
      card_debt: [],
      loan_debt: [],
      error: "No history database. Save a snapshot first.",
    };
  }
  const { dates, cash, cardDebt, loanDebt } = getTrends();
  return {
    ok: true,
    command: "trends",
    snapshots: dates.length,
    dates,
    cash,
    card_debt: cardDebt,
    loan_debt: loanDebt,
  };
}

