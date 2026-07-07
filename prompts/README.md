# Agent roster

Five focused agents drive this workspace. Paste a prompt file's contents into a
Cursor / Copilot chat to run that agent. The always-on safety rule
(`.cursor/rules/00-safety-boundaries.mdc`) applies to all of them.

| Agent | File | Uses browser? | Purpose |
|---|---|---|---|
| Extraction | `extraction-agent.md` | yes (Playwright MCP) | Read visible bank data → `input/banks/<id>.json` |
| Statement ingest | `statement-ingest-agent.md` | no | Import CSV/PDF statements from `statements/` → inputs |
| Normalizer | `normalizer-agent.md` | no | Build `output/` snapshot from inputs via the tools |
| Review | `review-agent.md` | no | Summarize the current snapshot, flag what to check |
| History & trends | `history-trends-agent.md` | no | Record snapshots in SQLite and analyze trends over time |
| Safety audit | `safety-audit-agent.md` | no | Scan for secrets / unmasked numbers / unsafe patterns |
| New bank | `new-bank-agent.md` | no | Scaffold a bank profile + input file (non-sensitive info only) |

Typical run: **Extraction** and/or **Statement ingest** (per bank) → **Normalizer** →
**Review** → **History & trends**, with **Safety audit** before you trust or commit anything.
