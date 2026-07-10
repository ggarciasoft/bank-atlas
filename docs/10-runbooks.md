# 10 - Runbooks

## Runbook A - First setup test

Use this to verify the MCP setup before using bank pages.

Prompt:

```text
Use Playwright MCP to open https://example.com in a visible browser. Confirm that the browser opened and tell me what page title you see. Do not save screenshots.
```

Expected result:

- Visible browser opens.
- Agent can read basic page content.
- No financial data is involved.

## Runbook B - First bank session

Prompt:

```text
Read `docs/04-ai-agent-operating-instructions.md` and follow it strictly.
Open the first bank profile in `config/banks/`.
Use Playwright MCP to open the bank login URL in a visible browser.
If I am not logged in and the login form is empty, stop and ask me to authenticate manually.
If the login form is already filled, click Login/Sign in automatically (never type credentials).
If 2FA or verification appears, stop and ask me to authenticate manually.
After I confirm I am on the dashboard, extract only read-only financial data into `input/banks/<bank_id>.json`.
Then run `npm run build && npm run validate && npm run audit`.
```

Expected result:

- Agent opens bank page.
- User logs in manually when the form is empty, or the agent clicks Login when the form is already filled.
- Agent extracts data only after the dashboard is visible (and after user confirmation if manual auth was needed).
- Output files are updated.

## Runbook C - Refresh all banks

Prompt:

```text
Read all bank profiles under `config/banks/`.
For each bank, open it with Playwright MCP and check whether I am already logged in.
If authentication is required (empty login form or 2FA/verification), stop for that bank and ask me to complete it manually.
If the login form is already filled, click Login/Sign in automatically (never type credentials).
Extract balances, credit cards, loans, upcoming payments, and recent transactions.
Update all output files.
Mark missing or uncertain values as `needs_review`.
```

Expected result:

- Each bank is processed one by one.
- Partial results are saved if one bank fails.
- The final report shows completed and incomplete banks.

## Runbook D - Use downloaded statements instead of browser

Prompt:

```text
Read the statement files I placed in `statements/`.
Extract transactions and balances from the files.
Do not use Playwright MCP or other browser tools.
Normalize the data into the schema from `docs/08-data-schema.md`.
Write to `input/banks/<bank_id>.json`, then run `npm run build`.
```

Expected result:

- Agent processes local files.
- No bank website interaction is needed.

## Runbook E - Review only, no browser

Prompt:

```text
Do not use Playwright MCP or other browser tools.
Read the existing files under `output/`.
Give me a financial summary, identify missing data, flag large or unusual movements, and suggest what I should review manually.
```

Expected result:

- Agent summarizes existing data only.
- No browser actions occur.

## Runbook F - Browse snapshot in the web dashboard

Prompt:

```text
Do not use Playwright MCP for bank login.
Run `npm run build` if needed, then `npm run serve`.
Tell me the local URL to open and what I should check on the dashboard.
```

Expected result:

- Server runs at http://127.0.0.1:4173/ (or custom `--port`).
- Dashboard shows summary, accounts, cards, and transactions from `output/financial-snapshot.json`.
- Refresh the browser after a new `npm run build`.

