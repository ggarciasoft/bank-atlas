# 14 - Future Upgrades

Start with the no-app workflow. Add complexity only when it is useful.

## Upgrade 1 - Historical snapshots

Store daily or weekly copies under:

```text
output/history/
```

Benefits:

- Track net worth over time
- Track debt reduction
- Compare spending trends

## Upgrade 2 - SQLite database

Add a local SQLite database only after JSON/CSV becomes hard to manage.

Suggested tables:

- banks
- accounts
- credit_cards
- loans
- transactions
- snapshots
- extraction_runs

## Upgrade 3 - Statement ingestion

Add a `statements/` folder for PDFs, CSVs, and Excel files.

The agent can parse these without browser access.

## Upgrade 4 - Email ingestion

Use Gmail or another email tool only if available and approved.

Extract:

- Card charge alerts
- Payment confirmations
- Deposit alerts
- Subscription receipts

Do not extract OTP/security emails.

## Upgrade 5 - Local dashboard

Only build a small dashboard if Markdown/CSV reports are no longer enough.

Possible stack:

- Streamlit
- Next.js local app
- .NET local API + simple frontend

## Upgrade 6 - Budget assistant

Use extracted transactions to produce:

- Category spend
- Subscription list
- Debt payoff suggestions
- Cash-flow forecast

## Upgrade 7 - Alert system

Create local rules:

- Credit card due in 5 days
- Cash below threshold
- Unusual transaction above threshold
- New recurring subscription detected

