# bank-atlas — MCP Personal Finance Workspace

A local, **no-app** personal finance workflow for an AI coding agent (Cursor Agent or
VS Code GitHub Copilot Agent Mode) plus **Playwright MCP**. It is not a SaaS, backend,
or dashboard — it is a repeatable workspace where an agent reads your own bank pages and
produces a local financial snapshot.

The workspace has three parts:

- **Docs** (`01`–`15`, root) — the goal, safety boundaries, schema, and playbooks.
- **Agents** (`prompts/` + `.cursor/rules/`) — focused roles the agent plays.
- **Code** (`tools/`) — zero-dependency Node tooling that normalizes data and builds the
  output files, so nothing is hand-written.

## What the agent does

1. Opens a bank website in a **visible** browser through Playwright MCP.
2. Pauses while **you** manually complete login, 2FA, CAPTCHA, or any verification.
3. Reads only visible financial information after you are authenticated.
4. Records it as structured input, then builds a snapshot as Markdown, JSON, and CSV.
5. Never bypasses security controls or performs account-changing actions.

## Core safety principle

The agent is an assistant operating tools under your supervision. It must **never** bypass
banking security, evade bot detection, solve CAPTCHA, intercept OTP codes, store passwords
or full account numbers, or perform transfers/payments/settings changes. Full rules live in
`02-safety-boundaries.md` and the always-on rule `.cursor/rules/00-safety-boundaries.mdc`.

## How it works (data flow)

```text
Bank website (visible browser)          statements/*.csv, *.pdf
        │  extraction agent                     │  ingest agent
        ▼                                        ▼
        input/banks/<bank_id>.json   ◄───────────┘   (source of truth)
                    │  npm run build
                    ▼
        output/  financial-snapshot.{md,json} + accounts/credit_cards/loans/transactions.csv
                 output/history/<date>-*  •  output/finance.db (SQLite, optional)
```

`input/` is the source of truth; everything in `output/` is generated — treat it as build
artifacts. Rerun `npm run build` anytime to regenerate.

## Quick start

Requires Node.js >= 18. No dependencies to install (`npm install` is optional; there are none).

```bash
npm run new-bank -- "My Bank"        # scaffold config/banks/<id>.md + input/banks/<id>.json
# then fill input/banks/<id>.json — via the extraction agent (browser) or:
npm run ingest -- --bank my-bank --file statements/jul.csv   # import a statement CSV

npm run build                        # normalize inputs -> output/ (md, json, 4 csv) + history
npm run validate                     # schema + masking checks
npm run audit                        # scan for secrets / unmasked account numbers
npm run review                       # read-only summary of the current snapshot

npm run db                           # (optional) record the snapshot into output/finance.db
npm run trends                       # (optional) cash/debt trends by currency over time

npm test                             # unit tests for the tooling
```

A worked example ships in `input/banks/example-bank.json` — `npm run build` turns it into a
complete `output/` snapshot out of the box.

## Commands

| Command | Browser? | Description |
|---|---|---|
| `npm run new-bank -- "Name"` | no | Scaffold a bank profile (`config/banks/`) + input file (`input/banks/`) |
| `npm run ingest -- --bank <id> --file <csv>` | no | Import a statement CSV into `input/banks/<id>.json` |
| `npm run build [-- --date YYYY-MM-DD]` | no | Normalize inputs → `output/` files + timestamped history + summary |
| `npm run validate` | no | Check inputs and snapshot against the schema and masking rules |
| `npm run audit` | no | Scan the workspace for secrets and unmasked (>=12-digit) numbers |
| `npm run review` | no | Print a read-only summary of the current snapshot |
| `npm run db` | no | Save the current snapshot into `output/finance.db` (idempotent per date) |
| `npm run trends` | no | Show cash / card-debt / loan-debt by currency across snapshots |
| `npm test` | no | Run the unit tests |

All commands are also available directly: `node tools/cli.js <command>` (or `atlas <command>`).

## Agents

Reusable prompts live in `prompts/`; always-on behavior lives in `.cursor/rules/`.

| Agent | Prompt | Browser? | Purpose |
|---|---|---|---|
| Extraction | `prompts/extraction-agent.md` | yes | Read visible bank data → `input/banks/` |
| Statement ingest | `prompts/statement-ingest-agent.md` | no | Import CSV/PDF statements → `input/banks/` |
| Normalizer | `prompts/normalizer-agent.md` | no | Build `output/` from inputs via the tools |
| Review | `prompts/review-agent.md` | no | Summarize the snapshot, flag what to check |
| History & trends | `prompts/history-trends-agent.md` | no | Record snapshots in SQLite, analyze trends |
| Safety audit | `prompts/safety-audit-agent.md` | no | Scan for secrets / unmasked numbers / unsafe patterns |
| New bank | `prompts/new-bank-agent.md` | no | Onboard a bank using non-sensitive info only |

Typical run: **Extraction** and/or **Statement ingest** → **Normalizer** → **Review** →
**History & trends**, with **Safety audit** before you trust or commit anything.
See `prompts/README.md` for details.

## Statement ingestion & history

- **CSV/TSV import** auto-detects common English/Spanish columns (date/fecha,
  description/concepto, debit/debito, credit/credito, amount/monto, currency/moneda),
  handles single-amount or split debit/credit layouts, masks identifiers, and skips
  duplicates. Override detection with `--date-col`, `--desc-col`, `--amount-col`,
  `--debit-col`, `--credit-col`, `--currency-col`. Sample: `examples/sample-statement.csv`.
- **PDF/image statements** are read by the ingestion agent (there is no binary parser).
- **History** uses Node's built-in `node:sqlite` (no external dependency). `output/finance.db`
  and `output/history/` hold real data and are git-ignored.

## Project structure

```text
├─ 01-…-15-*.md            Reference documentation (read these first)
├─ .cursor/                mcp.json + rules/ (agent behavior)
├─ .vscode/                mcp.json (Copilot Agent Mode)
├─ config/banks/           One profile per bank (safe/forbidden pages, risks)
├─ input/banks/            Per-bank extracted data (source of truth; real files git-ignored)
├─ statements/             Drop CSV/PDF statements here for offline ingestion
├─ examples/               Sample statement CSV
├─ output/                 Generated snapshot: md, json, 4 csv, history/, finance.db
├─ prompts/                Agent prompt files
└─ tools/                  Zero-dependency Node CLI + libs + tests
```

## Tool stack

- Cursor Agent or VS Code GitHub Copilot Agent Mode
- Playwright MCP server (visible browser) — configured in `.cursor/mcp.json` / `.vscode/mcp.json`
- Node.js >= 18 (built-in `node:sqlite` for optional history)
- Local files: Markdown, JSON, CSV, and an optional SQLite database

## Reference documentation

Read these in order for the full workflow:

1. `01-goal-and-scope.md`
2. `02-safety-boundaries.md`
3. `03-mcp-environment-setup.md`
4. `04-ai-agent-operating-instructions.md`
5. `05-browser-session-workflow.md`
6. `06-bank-profile-template.md`
7. `07-extraction-playbook.md`
8. `08-data-schema.md`
9. `09-output-formats.md`
10. `10-runbooks.md`
11. `11-prompt-library.md`
12. `12-quality-checklist.md`
13. `13-troubleshooting.md`
14. `14-future-upgrades.md`
15. `15-official-references.md`
