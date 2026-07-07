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
Read `04-ai-agent-operating-instructions.md` and follow it strictly.
Open the first bank profile in `config/banks/`.
Use Playwright MCP to open the bank login URL in a visible browser.
If I am not logged in, stop and ask me to authenticate manually.
After I confirm I am on the dashboard, extract only read-only financial data and update the files in `output/`.
```

Expected result:

- Agent opens bank page.
- User logs in manually.
- Agent extracts data only after confirmation.
- Output files are updated.

## Runbook C - Refresh all banks

Prompt:

```text
Read all bank profiles under `config/banks/`.
For each bank, open it with Playwright MCP and check whether I am already logged in.
If authentication is required, stop for that bank and ask me to complete it manually.
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
Do not use browser tools.
Normalize the data into the schema from `08-data-schema.md`.
Update the output files.
```

Expected result:

- Agent processes local files.
- No bank website interaction is needed.

## Runbook E - Review only, no browser

Prompt:

```text
Do not use browser tools.
Read the existing files under `output/`.
Give me a financial summary, identify missing data, flag large or unusual movements, and suggest what I should review manually.
```

Expected result:

- Agent summarizes existing data only.
- No browser actions occur.

