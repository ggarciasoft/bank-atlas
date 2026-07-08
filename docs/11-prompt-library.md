# 11 - Prompt Library

## Master prompt

```text
You are my local personal finance extraction assistant using MCP tools.

Read and follow:
- README.md
- docs/02-safety-boundaries.md
- docs/04-ai-agent-operating-instructions.md
- docs/08-data-schema.md
- docs/09-output-formats.md

Goal:
Create or update my current financial snapshot from the bank profiles in `config/banks/`.

Rules:
- Use a visible browser only.
- Do not bypass 2FA, CAPTCHA, or bot detection.
- Do not ask me to paste passwords, OTP codes, or security answers in chat.
- If 2FA, CAPTCHA, or verification appears, or the login form is empty, pause and ask me to complete authentication manually in the browser.
- If the login form is already filled (browser autofill), click Login/Sign in automatically — never type credentials.
- Only read visible financial information.
- Do not click transfer, payment, beneficiary, profile, settings, card controls, or confirmation buttons.
- Mask all account numbers before saving.
- Mark uncertain values as `needs_review`.
- Save results to `output/financial-snapshot.md`, `output/financial-snapshot.json`, and CSV files.
```

## Process one bank

```text
Use the bank profile at `config/banks/<bank-file>.md`.
Open the bank URL with Playwright MCP.
If I am logged out and the login form is empty, ask me to authenticate manually and wait.
If the login form is already filled, click Login/Sign in automatically (never type credentials).
If 2FA or verification appears, ask me to complete it manually and wait.
After I confirm that the dashboard is visible, extract read-only financial data.
Update output files without overwriting data from other banks unless you are refreshing the full snapshot.
```

## Refresh existing snapshot

```text
Use the existing files in `output/` as the previous snapshot.
Refresh each bank from `config/banks/`.
Preserve historical files under `output/history/`.
Create a new current snapshot.
Highlight changes compared with the previous snapshot.
```

## Review financial situation

```text
Do not use browser tools.
Read `output/financial-snapshot.json` and `output/financial-snapshot.md`.
Summarize my current financial situation.
Focus on cash available, credit card debt, loan debt, due dates, large movements, and missing data.
```

## Add a new bank profile

```text
Help me create a new bank profile under `config/banks/`.
Ask only for non-sensitive information such as bank name, website URL, and the pages I want to read.
Do not ask for username, password, account number, OTP, or security answers.
Use the template from `docs/06-bank-profile-template.md`.
```

## Extract from screenshots or PDFs

```text
Do not use browser tools.
Analyze the files I placed in `statements/`.
Extract financial data according to `docs/08-data-schema.md`.
Mask account numbers.
Mark uncertain values as `needs_review`.
Update the output files.
```

## Safety audit prompt

```text
Review this workspace for safety risks.
Check for credentials, full account numbers, OTPs, recovery codes, unsafe prompts, or instructions that could bypass 2FA/CAPTCHA/bot detection.
Do not use browser tools.
Produce a list of issues and suggested fixes.
```

