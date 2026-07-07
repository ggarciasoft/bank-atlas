// Safety audit: scan the workspace for things that must never be stored.
// Mirrors docs/02-safety-boundaries.md and the safety audit prompt in docs/11.

import { promises as fs } from "node:fs";
import path from "node:path";

import { ROOT } from "./io.js";

const SKIP_DIRS = new Set([
  "node_modules",
  ".git",
  ".browser-profiles",
  ".vscode-test",
]);

const TEXT_EXT = new Set([
  ".md",
  ".json",
  ".csv",
  ".txt",
  ".js",
  ".mjs",
  ".cjs",
  ".ts",
  ".log",
  ".env",
  ".example",
  ".mdc",
  ".yml",
  ".yaml",
]);

const IMAGE_EXT = new Set([".png", ".jpg", ".jpeg", ".webp", ".gif", ".bmp"]);

// Secret-like assignments: keyword followed by a value. The value is captured
// so we can ignore safe/boolean values (e.g. "Do not store password: yes").
const SECRET_PATTERNS = [
  { re: /\b(?:password|passwd|pwd|contrase[nñ]a|clave)\b\s*[:=]\s*(\S+)/i, label: "possible password" },
  { re: /\b(?:otp|one[-\s]?time|token|codigo|c[oó]digo)\b\s*[:=]\s*(\d{3,})/i, label: "possible OTP/token" },
  { re: /\bcvv\b\s*[:=]\s*(\d{3,4})/i, label: "possible CVV" },
  { re: /\bpin\b\s*[:=]\s*(\d{3,})/i, label: "possible PIN" },
  { re: /\b(?:secret|api[_-]?key|apikey)\b\s*[:=]\s*(\S+)/i, label: "possible secret/API key" },
];

// Values that are clearly not secrets (booleans, placeholders, doc words).
const SAFE_VALUES = new Set([
  "yes", "no", "true", "false", "unknown", "manual", "required", "optional",
  "none", "n/a", "na", "null", "-", "...", "<value>", "value", "here",
]);

// Lines that describe a rule rather than store a value.
const NEGATION_RE = /\b(do not|don'?t|never|no\s+se|not\s+store|avoid|must not)\b/i;

function isRealSecret(line, value) {
  if (NEGATION_RE.test(line)) return false;
  const cleaned = String(value).replace(/[.,;"'`]+$/g, "").toLowerCase();
  if (SAFE_VALUES.has(cleaned)) return false;
  if (cleaned.length < 3) return false;
  return true;
}

// >= 12 consecutive digits (after removing spaces/dashes) = possible full PAN/account.
const FULL_NUMBER_RE = /(?:\d[ -]?){12,}/;

/**
 * @typedef {{ level: "error"|"warning", file: string, line: number, message: string }} Finding
 */

async function walk(dir, acc) {
  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return acc;
  }
  for (const e of entries) {
    if (e.isDirectory()) {
      if (SKIP_DIRS.has(e.name)) continue;
      await walk(path.join(dir, e.name), acc);
    } else {
      acc.push(path.join(dir, e.name));
    }
  }
  return acc;
}

/**
 * Run the safety audit over the workspace.
 * @returns {Promise<Finding[]>}
 */
export async function audit() {
  /** @type {Finding[]} */
  const findings = [];
  const files = await walk(ROOT, []);

  for (const file of files) {
    const rel = path.relative(ROOT, file);
    const ext = path.extname(file).toLowerCase();
    const base = path.basename(file).toLowerCase();

    // Committed real .env files (allow .env.example).
    if (base === ".env" || (base.startsWith(".env.") && base !== ".env.example")) {
      findings.push({ level: "error", file: rel, line: 0, message: "environment file present; never store secrets here" });
    }

    // Screenshots in output/ likely contain sensitive full data (docs/02 rule 14).
    if (IMAGE_EXT.has(ext) && rel.replace(/\\/g, "/").startsWith("output/")) {
      findings.push({ level: "warning", file: rel, line: 0, message: "image in output/ may contain sensitive data; confirm it was approved" });
    }

    if (!TEXT_EXT.has(ext)) continue;

    let content;
    try {
      content = await fs.readFile(file, "utf8");
    } catch {
      continue;
    }

    const lines = content.split(/\r?\n/);
    lines.forEach((line, idx) => {
      for (const { re, label } of SECRET_PATTERNS) {
        const m = line.match(re);
        if (m && isRealSecret(line, m[1])) {
          findings.push({ level: "error", file: rel, line: idx + 1, message: label });
        }
      }
      // Only flag full numbers in data files (input/output), not docs/tooling.
      const relUnix = rel.replace(/\\/g, "/");
      const isDataFile = relUnix.startsWith("input/") || relUnix.startsWith("output/");
      if (isDataFile && FULL_NUMBER_RE.test(line)) {
        const digits = line.replace(/[^\d]/g, "");
        if (digits.length >= 12) {
          findings.push({ level: "error", file: rel, line: idx + 1, message: "possible unmasked full account/card number (>=12 digits)" });
        }
      }
    });
  }

  return findings;
}
