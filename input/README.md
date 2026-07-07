# input/banks

Per-bank extraction files live here as `input/banks/<bank_id>.json`. The
**extraction agent** writes them from visible bank pages; the **normalizer**
(`npm run build`) reads all of them and generates `output/`.

- One file per bank. `bank_id` should match the config profile in `config/banks/`.
- Follow the schema in `docs/08-data-schema.md`. Every amount needs a `currency` and a
  `confidence` (`high|medium|low`); mask all identifiers to `****1234`.
- Real bank files are git-ignored for privacy; only `example-bank.json` is committed.
- Scaffold a new one with: `npm run new-bank -- "Bank Name"`.

Minimal shape:

```json
{
  "bank_id": "my-bank",
  "bank_name": "My Bank",
  "extraction_status": "completed",
  "extracted_at": "2026-07-06T23:00:00-04:00",
  "accounts": [],
  "credit_cards": [],
  "loans": [],
  "transactions": [],
  "notes": [],
  "warnings": []
}
```
