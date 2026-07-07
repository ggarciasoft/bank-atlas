// Remove banks that should not appear in the web dashboard and rebuild summary.

import { buildSummary } from "./summarize.js";
import { EXAMPLE_BANK_ID } from "./web-config.js";

/**
 * Return a snapshot suitable for the dashboard API.
 * @param {any} snapshot
 * @param {{ excludeExampleBank?: boolean }} [opts]
 */
export function filterSnapshotForFrontend(snapshot, { excludeExampleBank = true } = {}) {
  if (!snapshot || !excludeExampleBank) return snapshot;

  const banks = (snapshot.banks || []).filter((b) => b.bank_id !== EXAMPLE_BANK_ID);
  if (banks.length === (snapshot.banks || []).length) return snapshot;

  return {
    ...snapshot,
    banks,
    summary: buildSummary(banks, snapshot.snapshot_date),
  };
}
