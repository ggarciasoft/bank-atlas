// Scaffold a new bank: a config profile (config/banks/<id>.md) and an empty
// extraction input (input/banks/<id>.json). Mirrors docs/06.

import path from "node:path";

import { PATHS, exists, writeText, writeJson } from "./io.js";
import { emptyBank } from "./schema.js";

export function slugify(name) {
  return String(name)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function profileTemplate(name) {
  return `# Bank Profile: ${name}

## Basic information

- Bank name: ${name}
- Country:
- Website URL:
- Login URL:
- Currency defaults:
- Last reviewed:

## Authentication notes

- Login is manual: yes
- 2FA expected: unknown
- CAPTCHA expected: unknown
- Session usually persists: unknown
- Do not store password: yes

## Safe pages

The AI agent may visit:

- Account overview:
- Checking/savings list:
- Credit card summary:
- Loan summary:
- Transaction list:

## Forbidden pages

The AI agent must not visit or interact with:

- Transfers:
- Payments:
- Beneficiaries:
- Credit applications:
- Profile/settings:
- Card controls:

## Extraction notes

- Table headers to look for:
- Date format used:
- Decimal format used:
- Currency symbols used:
- Pages that load slowly:

## Known risks

- Popups:
- Session timeouts:
- Pages that look like action pages:
- Misleading labels:
`;
}

/**
 * @param {string} name Bank display name.
 * @param {{ force?: boolean }} [opts]
 * @returns {Promise<{ id: string, profile: string, input: string, created: string[] }>}
 */
export async function newBank(name, opts = {}) {
  if (!name) throw new Error("bank name is required");
  const id = slugify(name);
  const profilePath = path.join(PATHS.configBanks, `${id}.md`);
  const inputPath = path.join(PATHS.inputBanks, `${id}.json`);
  const created = [];

  if (opts.force || !(await exists(profilePath))) {
    await writeText(profilePath, profileTemplate(name));
    created.push(profilePath);
  }
  if (opts.force || !(await exists(inputPath))) {
    await writeJson(inputPath, emptyBank(id, name));
    created.push(inputPath);
  }

  return { id, profile: profilePath, input: inputPath, created };
}
