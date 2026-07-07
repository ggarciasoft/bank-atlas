// Web dashboard settings (frontend snapshot filtering, etc.).

import path from "node:path";

import { PATHS, exists, readJson } from "./io.js";

/** bank_id of the shipped sample data — hidden from the dashboard by default. */
export const EXAMPLE_BANK_ID = "example-bank";

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
