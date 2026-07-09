// Filesystem, path, and CSV helpers. Zero dependencies.

import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.resolve(here, "..", "..");

export const PATHS = {
  root: ROOT,
  inputBanks: path.join(ROOT, "input", "banks"),
  output: path.join(ROOT, "output"),
  history: path.join(ROOT, "output", "history"),
  configBanks: path.join(ROOT, "config", "banks"),
  configItems: path.join(ROOT, "config", "items"),
};

export async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true });
}

export async function readJson(file) {
  const raw = await fs.readFile(file, "utf8");
  return JSON.parse(raw);
}

export async function writeJson(file, data) {
  await ensureDir(path.dirname(file));
  await fs.writeFile(file, JSON.stringify(data, null, 2) + "\n", "utf8");
}

export async function writeText(file, text) {
  await ensureDir(path.dirname(file));
  await fs.writeFile(file, text, "utf8");
}

export async function readText(file) {
  return fs.readFile(file, "utf8");
}

export async function exists(file) {
  try {
    await fs.access(file);
    return true;
  } catch {
    return false;
  }
}

/**
 * List *.json files in a directory (absolute paths). Returns [] if dir missing.
 * @param {string} dir
 * @returns {Promise<string[]>}
 */
export async function listJson(dir) {
  try {
    const entries = await fs.readdir(dir);
    return entries
      .filter((f) => f.toLowerCase().endsWith(".json"))
      .sort()
      .map((f) => path.join(dir, f));
  } catch {
    return [];
  }
}

/** Escape a single CSV field per RFC 4180. */
export function csvField(value) {
  if (value === null || value === undefined) return "";
  const s = String(value);
  if (/[",\r\n]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

/**
 * Render rows (array of objects) to a CSV string given a column order.
 * @param {string[]} columns
 * @param {Record<string, unknown>[]} rows
 * @returns {string}
 */
export function toCsv(columns, rows) {
  const lines = [columns.join(",")];
  for (const row of rows) {
    lines.push(columns.map((c) => csvField(row[c])).join(","));
  }
  return lines.join("\n") + "\n";
}
