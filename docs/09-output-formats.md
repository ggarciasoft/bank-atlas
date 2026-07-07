# 09 - Output Formats

## Markdown report

File:

```text
output/financial-snapshot.md
```

Template:

```md
# Financial Snapshot

Generated at: <timestamp>
Snapshot date: <date>
Partial: yes/no

## Executive summary

- Net cash available:
- Total credit card debt:
- Total loan debt:
- Upcoming payments:
- Data needing review:

## Cash balances

| Bank | Account | Currency | Available | Current | Confidence |
|---|---|---:|---:|---:|---|

## Credit cards

| Bank | Card | Currency | Current Balance | Minimum Payment | Due Date | Available Credit | Confidence |
|---|---|---:|---:|---:|---|---:|---|

## Loans

| Bank | Loan | Currency | Remaining Balance | Monthly Payment | Next Due Date | Confidence |
|---|---|---:|---:|---:|---|---|

## Upcoming payments

| Date | Bank | Type | Description | Currency | Amount |
|---|---|---|---|---:|---:|

## Recent large or unusual movements

| Date | Bank | Account | Description | Currency | Amount | Reason |
|---|---|---|---|---:|---:|---|

## Recent transactions

| Date | Bank | Account | Description | Direction | Currency | Amount | Category |
|---|---|---|---|---|---:|---:|---|

## Missing or uncertain data

- <item>

## Agent notes

- <note>
```

## JSON report

File:

```text
output/financial-snapshot.json
```

Use the schema in `08-data-schema.md`.

## CSV reports

Files:

```text
output/accounts.csv
output/credit_cards.csv
output/loans.csv
output/transactions.csv
```

Use CSV when you want to open the results in Excel, Numbers, Google Sheets, or a future dashboard.

## Naming convention for historical runs

For historical snapshots, also create a timestamped copy:

```text
output/history/2026-07-06-financial-snapshot.json
output/history/2026-07-06-financial-snapshot.md
```

