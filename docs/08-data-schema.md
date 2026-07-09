# 08 - Data Schema

## Financial snapshot JSON

File:

```text
output/financial-snapshot.json
```

Schema:

```json
{
  "snapshot_date": "2026-07-06",
  "generated_at": "2026-07-06T23:00:00-04:00",
  "partial": false,
  "banks": [
    {
      "bank_id": "banco-popular",
      "bank_name": "Banco Popular",
      "extraction_status": "completed",
      "extracted_at": "2026-07-06T23:00:00-04:00",
      "accounts": [],
      "credit_cards": [],
      "loans": [],
      "transactions": [],
      "notes": [],
      "warnings": []
    }
  ],
  "summary": {
    "cash_by_currency": [],
    "credit_card_debt_by_currency": [],
    "loan_debt_by_currency": [],
    "upcoming_payments": [],
    "large_movements": [],
    "needs_review": []
  }
}
```

## Account object

```json
{
  "account_id_masked": "****1234",
  "account_name": "Cuenta de Ahorro",
  "account_type": "savings",
  "currency": "DOP",
  "available_balance": 125000.5,
  "current_balance": 125000.5,
  "source_page": "account overview",
  "confidence": "high",
  "needs_review": false
}
```

## Credit card object

```json
{
  "card_id_masked": "****5678",
  "card_name": "Visa Platinum",
  "currency": "DOP",
  "current_balance": 45000,
  "statement_balance": 42000,
  "minimum_payment": 3500,
  "due_date": "2026-07-20",
  "statement_closing_date": "2026-07-25",
  "available_credit": 155000,
  "credit_limit": 200000,
  "source_page": "credit card summary",
  "confidence": "high",
  "needs_review": false
}
```

## Loan object

```json
{
  "loan_id_masked": "****9012",
  "loan_name": "Vehicle Loan",
  "loan_type": "vehicle",
  "currency": "DOP",
  "remaining_balance": 750000,
  "monthly_payment": 28000,
  "next_due_date": "2026-07-30",
  "source_page": "loan summary",
  "confidence": "medium",
  "needs_review": false
}
```

## Transaction object

```json
{
  "transaction_id_local": "generated-local-id",
  "bank_id": "banco-popular",
  "account_id_masked": "****1234",
  "date": "2026-07-05",
  "description": "SUPERMERCADO NACIONAL",
  "amount": 3500,
  "direction": "debit",
  "currency": "DOP",
  "category_guess": "groceries",
  "is_pending": false,
  "is_large_movement": false,
  "possible_duplicate": false,
  "source_page": "transactions",
  "confidence": "high",
  "needs_review": false
}
```

## CSV files

### `output/accounts.csv`

Columns:

```text
snapshot_date,bank_id,bank_name,account_type,account_name,account_id_masked,currency,available_balance,current_balance,confidence,needs_review
```

### `output/credit_cards.csv`

Columns:

```text
snapshot_date,bank_id,bank_name,card_name,card_id_masked,currency,current_balance,statement_balance,minimum_payment,due_date,statement_closing_date,available_credit,credit_limit,confidence,needs_review
```

### `output/loans.csv`

Columns:

```text
snapshot_date,bank_id,bank_name,loan_name,loan_id_masked,currency,remaining_balance,monthly_payment,next_due_date,confidence,needs_review
```

### `output/transactions.csv`

Columns:

```text
snapshot_date,bank_id,bank_name,account_id_masked,date,description,amount,direction,currency,category_guess,is_pending,is_large_movement,possible_duplicate,confidence,needs_review
```

## Items registry (persistent reference metadata)

File per bank:

```text
config/items/<bank_id>.json
```

The items registry stores stable metadata about accounts, credit cards, and loans.
It is auto-seeded from extraction on each build and can be edited in the Admin
dashboard. At build time the registry is merged into the snapshot.

Merge precedence per field:

```text
user frontend edit > freshly extracted value > auto-seeded registry value > null
```

Recurring calendar days (`payment_due_day`, `statement_closing_day`) are stored as
day-of-month (1–31) and converted to concrete dates at build time
(`next_due_date`, `statement_closing_date`, and card `due_date` when applicable).

Registry entries are keyed by `masked_id|currency`. Fields the user edits in the
frontend are listed in `user_edited` and are never overwritten by extraction or
auto-seed.

Example:

```json
{
  "bank_id": "apap",
  "bank_name": "APAP",
  "accounts": [],
  "credit_cards": [
    {
      "key": "****7962|DOP",
      "card_id_masked": "****7962",
      "card_name": "VISA FAMILIAR APAP (Pesos)",
      "currency": "DOP",
      "credit_limit": 293000,
      "statement_closing_day": 25,
      "payment_due_day": 11,
      "notes": "",
      "user_edited": ["payment_due_day"]
    }
  ],
  "loans": []
}
```

