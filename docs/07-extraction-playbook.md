# 07 - Extraction Playbook

## Extraction priority

Extract data in this order:

1. Bank name
2. Timestamp
3. Currency
4. Cash balances
5. Credit card debt
6. Loan balances
7. Upcoming due dates
8. Recent transactions
9. Alerts, holds, or pending movements
10. Missing or uncertain values

## Page reading strategy

For each bank page:

1. Identify the page type.
2. Read only visible financial data.
3. Avoid action buttons.
4. Extract structured values.
5. Normalize amounts and dates.
6. Save source notes.
7. Mark low-confidence data for review.

## Amount normalization

Normalize these examples:

```text
RD$ 12,500.75 => 12500.75 DOP
DOP 12,500.75 => 12500.75 DOP
US$ 1,250.50 => 1250.50 USD
USD 1,250.50 => 1250.50 USD
-1,500.00 => debit 1500.00
(1,500.00) => debit 1500.00
```

## Date normalization

Store dates as ISO format when possible:

```text
2026-07-06
```

If the page uses ambiguous dates like `07/06/2026`, infer format from bank country and page language only if clear. Otherwise mark as `needs_review`.

## Account masking

Allowed:

```text
****1234
Cuenta terminada en 1234
Visa ****5678
```

Not allowed:

```text
1234567890123456
001234567890
```

## Confidence levels

Use `high` when:

- The value is visible with clear label and currency.

Use `medium` when:

- Label is clear but currency is inferred.
- Table alignment is slightly ambiguous.

Use `low` when:

- The label is unclear.
- The amount may belong to another row.
- The date format is ambiguous.

Use `needs_review: true` when in doubt.

## Duplicate detection

Possible duplicates across banks or files:

- Same date
- Same amount
- Similar merchant description
- Transfer out from one account and transfer in to another

Do not delete duplicates automatically. Mark them as possible duplicates.

## Recurring charge detection

Flag possible recurring charges when:

- Same merchant appears monthly
- Similar amount appears regularly
- Description includes subscription, membership, insurance, loan, fee, interest, maintenance, app, cloud, streaming

