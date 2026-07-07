# 14 - Future Upgrades

Start with the no-app workflow. Add complexity only when it is useful.

## Implemented (current workspace)

These upgrades are already available:

| Feature | How |
|---|---|
| Historical snapshots | `output/history/<date>-*` — written automatically by `npm run build` |
| SQLite history | `output/finance.db` via `npm run db`; trends via `npm run trends` |
| Statement ingestion | `statements/` + `npm run ingest -- --bank <id> --file <csv>` |
| Local web dashboard | `web/` served by `npm run serve` (reads `output/` live, `127.0.0.1` only) |
| Spending categories | Category guesses on transactions; dashboard shows real spend by category |

## Upgrade 1 - Email ingestion

Use Gmail or another email tool only if available and approved.

Extract:

- Card charge alerts
- Payment confirmations
- Deposit alerts
- Subscription receipts

Do not extract OTP/security emails.

## Upgrade 2 - Budget assistant

Use extracted transactions to produce:

- Category spend over time (beyond the current snapshot view)
- Subscription list with recurrence confidence
- Debt payoff suggestions
- Cash-flow forecast

## Upgrade 3 - Alert system

Create local rules (CLI or dashboard):

- Credit card due in N days
- Cash below threshold
- Unusual transaction above threshold
- New recurring subscription detected

## Upgrade 4 - Multi-snapshot dashboard charts

Extend `web/` or `npm run trends` output with line charts for cash, card debt, and loan
debt by currency across all dates in `output/finance.db`.

## Upgrade 5 - Bank-specific parsers

Optional per-bank statement parsers (PDF layout) instead of agent-read PDFs only.

## Upgrade 6 - Scheduled refresh reminders

Local cron or IDE automation to prompt: rebuild snapshot, run audit, open dashboard —
without automating login or 2FA.
