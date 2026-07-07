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
snapshot_date,bank_id,bank_name,card_name,card_id_masked,currency,current_balance,statement_balance,minimum_payment,due_date,available_credit,credit_limit,confidence,needs_review
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

