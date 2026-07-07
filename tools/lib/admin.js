// Local administration helpers for the web dashboard: list banks, read/write a
// bank's config profile (config/banks/<id>.md), and scaffold a new bank.
//
// These wrap the same file operations the CLI performs (npm run new-bank) so
// the local dashboard can trigger them without the console. Everything stays
// on disk in config/ and input/; nothing here touches a browser or a bank.

import { promises as fs } from "node:fs";
import path from "node:path";

import { PATHS, exists, readText, writeText, readJson, listJson } from "./io.js";
import { newBank } from "./newbank.js";

// A bank id is the slug produced by newBank(): lowercase letters, digits, and
// dashes. Validating against it also blocks path traversal in API routes.
const ID_RE = /^[a-z0-9][a-z0-9-]*$/;

export function isValidBankId(id) {
  return typeof id === "string" && ID_RE.test(id);
}

export function bankConfigPath(id) {
  return path.join(PATHS.configBanks, `${id}.md`);
}

export function bankInputPath(id) {
  return path.join(PATHS.inputBanks, `${id}.json`);
}

async function listByExt(dir, ext) {
  try {
    const entries = await fs.readdir(dir);
    return entries.filter((f) => f.toLowerCase().endsWith(ext));
  } catch {
    return [];
  }
}

/** Pull a display name out of a config profile markdown, if present. */
function nameFromMarkdown(md) {
  const m =
    md.match(/^#\s*Bank Profile:\s*(.+?)\s*$/m) ||
    md.match(/^-\s*Bank name:\s*(.+?)\s*$/m);
  return m ? m[1].trim() : null;
}

/**
 * List every known bank (union of config profiles and input files).
 * @returns {Promise<Array<{ id: string, name: string, has_config: boolean, has_input: boolean }>>}
 */
export async function listBanks() {
  const ids = new Set();
  for (const f of await listByExt(PATHS.configBanks, ".md")) {
    ids.add(f.replace(/\.md$/i, ""));
  }
  for (const f of await listJson(PATHS.inputBanks)) {
    ids.add(path.basename(f).replace(/\.json$/i, ""));
  }

  const banks = [];
  for (const id of Array.from(ids).sort()) {
    const configPath = bankConfigPath(id);
    const inputPath = bankInputPath(id);
    const has_config = await exists(configPath);
    const has_input = await exists(inputPath);

    let name = null;
    if (has_input) {
      try {
        name = (await readJson(inputPath)).bank_name || null;
      } catch {
        /* ignore malformed input, fall back to config/id */
      }
    }
    if (!name && has_config) {
      try {
        name = nameFromMarkdown(await readText(configPath));
      } catch {
        /* ignore */
      }
    }

    banks.push({ id, name: name || id, has_config, has_input });
  }
  return banks;
}

/**
 * Read a bank's config profile markdown.
 * @param {string} id
 * @returns {Promise<{ id: string, exists: boolean, content: string }>}
 */
export async function getBankConfig(id) {
  if (!isValidBankId(id)) throw new Error("invalid bank id");
  const p = bankConfigPath(id);
  if (!(await exists(p))) return { id, exists: false, content: "" };
  return { id, exists: true, content: await readText(p) };
}

/**
 * Write a bank's config profile markdown. The bank must already exist (has a
 * config or input file) so a typo can't create an orphan profile.
 * @param {string} id
 * @param {string} content
 * @returns {Promise<{ id: string, path: string, bytes: number }>}
 */
export async function saveBankConfig(id, content) {
  if (!isValidBankId(id)) throw new Error("invalid bank id");
  if (typeof content !== "string") throw new Error("content must be a string");

  const configPath = bankConfigPath(id);
  const known = (await exists(configPath)) || (await exists(bankInputPath(id)));
  if (!known) throw new Error(`unknown bank "${id}" — create it first`);

  await writeText(configPath, content);
  return { id, path: configPath, bytes: Buffer.byteLength(content, "utf8") };
}

/**
 * Scaffold a new bank (config profile + empty input file), mirroring the CLI.
 * @param {string} name
 * @param {{ force?: boolean }} [opts]
 */
export async function createBank(name, opts = {}) {
  if (!name || !String(name).trim()) throw new Error("bank name is required");
  return newBank(String(name).trim(), opts);
}
