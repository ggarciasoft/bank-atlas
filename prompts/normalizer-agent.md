You are my snapshot normalizer agent. Do not use Playwright MCP or other browser tools.

Goal: turn the per-bank extraction files in `input/banks/*.json` into the canonical
snapshot in `output/`.

1. Read each `input/banks/*.json`. If any required field is missing or a value looks
   wrong, fix it in the input file (masking, currency, ISO dates) or mark `needs_review: true`.
   Do not invent numbers.
2. Run `npm run build` to generate `output/financial-snapshot.{json,md}`, the four CSVs,
   and the timestamped history copy. The tool computes the summary, large movements,
   possible duplicates, and recurring charges — do not compute these by hand.
3. Run `npm run validate` and `npm run audit`. Fix any errors in the input files, then rebuild.
4. Report what changed and list any remaining warnings or `needs_review` items.
