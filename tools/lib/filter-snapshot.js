// Remove banks that should not appear in the web dashboard and rebuild summary.

import { buildSummary } from "./summarize.js";
import { EXCLUDED_SAMPLE_BANK_IDS } from "./web-config.js";

/**
 * Return a snapshot suitable for the dashboard API.
 * When excludeExampleBank is true, drops example-bank and all demo banks.
 * @param {any} snapshot
 * @param {{ excludeExampleBank?: boolean }} [opts]
 */
export function filterSnapshotForFrontend(snapshot, { excludeExampleBank = true } = {}) {
  if (!snapshot || !excludeExampleBank) return snapshot;

  const banks = (snapshot.banks || []).filter((b) => !EXCLUDED_SAMPLE_BANK_IDS.has(b.bank_id));
  if (banks.length === (snapshot.banks || []).length) return snapshot;

  return {
    ...snapshot,
    banks,
    summary: buildSummary(banks, snapshot.snapshot_date),
  };
}
