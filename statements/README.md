# statements

Drop bank statement files here for **offline ingestion** (no browser needed).

- **CSV / TSV** — import deterministically:
  ```
  npm run ingest -- --bank <bank_id> --file statements/<file>.csv [--name "Bank"] [--account ****1234] [--currency DOP]
  ```
  Columns are auto-detected (English/Spanish). Override with `--date-col`, `--desc-col`,
  `--amount-col`, `--debit-col`, `--credit-col`, `--currency-col`. Duplicates are skipped.
- **PDF / images** — ask the statement ingest agent (`prompts/statement-ingest-agent.md`)
  to read the file and write `input/banks/<bank_id>.json` directly.

Then run `npm run build && npm run validate && npm run audit`.

Everything in this folder except this README is git-ignored — statement files may
contain full account numbers. Never commit them; the tools mask identifiers on import.

A sample CSV lives at `examples/sample-statement.csv`.
