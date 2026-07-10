// Web dashboard settings (frontend snapshot filtering, etc.).

import path from "node:path";

import { DEMO_BANK_IDS } from "./demo-banks-data.js";
import { PATHS, exists, readJson } from "./io.js";

/** bank_id of the shipped sample data — hidden from the dashboard by default. */
export const EXAMPLE_BANK_ID = "example-bank";

/** Sample + demo bank ids excluded from the dashboard when exclude_example_bank is true. */
export const EXCLUDED_SAMPLE_BANK_IDS = new Set([EXAMPLE_BANK_ID, ...DEMO_BANK_IDS]);

export const DEFAULT_WEB_CONFIG = {
  exclude_example_bank: true,
};

/**
 * Load config/web.json merged over defaults.
 * @returns {Promise<{ exclude_example_bank: boolean }>}
 */
export async function loadWebConfig() {
  const file = path.join(PATHS.root, "config", "web.json");
  if (!(await exists(file))) return { ...DEFAULT_WEB_CONFIG };
  try {
    const raw = await readJson(file);
    return { ...DEFAULT_WEB_CONFIG, ...raw };
  } catch {
    return { ...DEFAULT_WEB_CONFIG };
  }
}
