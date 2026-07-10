// Seed the three demo banks: config profiles, input JSON, items registry, and DB rows.

import path from "node:path";

import { PATHS, writeText, writeJson, exists } from "./io.js";
import { getDemoBankDefinitions, demoBankProfile } from "./demo-banks-data.js";
import { saveBankConfigsToDb } from "./db.js";

/**
 * Write config/banks, input/banks, and config/items for all demo banks.
 * @param {{ force?: boolean }} [opts]
 * @returns {Promise<{ created: string[], updated: string[], skipped: string[], banks: object[] }>}
 */
export async function seedDemoBanks(opts = {}) {
  const created = [];
  const updated = [];
  const skipped = [];
  const banks = getDemoBankDefinitions();
  const dbRows = [];

  for (const bank of banks) {
    const profilePath = path.join(PATHS.configBanks, `${bank.id}.md`);
    const inputPath = path.join(PATHS.inputBanks, `${bank.id}.json`);
    const itemsPath = path.join(PATHS.configItems, `${bank.id}.json`);

    const files = [
      { path: profilePath, write: () => writeText(profilePath, demoBankProfile(bank)) },
      { path: inputPath, write: () => writeJson(inputPath, bank.input) },
      { path: itemsPath, write: () => writeJson(itemsPath, bank.items) },
    ];

    for (const f of files) {
      const had = await exists(f.path);
      if (had && !opts.force) {
        skipped.push(f.path);
        continue;
      }
      await f.write();
      if (had) updated.push(f.path);
      else created.push(f.path);
    }

    dbRows.push({
      bank_id: bank.id,
      bank_name: bank.name,
      login_url: bank.login_url,
      dashboard_url: bank.dashboard_url,
      demo_port: bank.port,
      is_demo: true,
      config_path: path.relative(PATHS.root, profilePath),
    });
  }

  const { dbPath, count } = saveBankConfigsToDb(dbRows, opts.dbPath);

  return {
    created: created.map((p) => path.relative(PATHS.root, p)),
    updated: updated.map((p) => path.relative(PATHS.root, p)),
    skipped: skipped.map((p) => path.relative(PATHS.root, p)),
    dbPath: path.relative(PATHS.root, dbPath),
    db_count: count,
    banks: dbRows,
  };
}
