# GitHub Copilot Agent Instructions — bank-atlas

## Browser automation — always use the `playwright-finance` MCP server

For **all** bank-page browser work, use the **`playwright-finance`** MCP server
(configured in `.vscode/mcp.json`). This is the only permitted browser automation tool.

```
Never use: Puppeteer, Selenium, headless browsers, Chrome DevTools scripts,
           the VS Code built-in browser, or any MCP server other than playwright-finance.
Always use: playwright-finance (visible/headed Chrome, dedicated profile)
```

The server launches a headed Chrome browser with a dedicated, persistent user-data
directory (`.browser-profiles/finance`) so login sessions are preserved between runs.

## Authentication rules

- If the login form is already filled (browser autofill / saved profile), **click
  Login/Sign in automatically**. Never type credentials into the form.
- If 2FA, CAPTCHA, verification, or an empty login form appears, **stop** and say:
  > "Please complete authentication manually in the browser. Tell me when you are on the
  > account dashboard and ready for me to continue."
- Never ask the user to paste passwords, OTP codes, security questions, or recovery codes
  into chat.

## Safe navigation

Visit only pages listed under `## Safe pages` in the relevant `config/banks/<bank>.md`
profile. Read visible values only. Do not click Transfer, Pay, Add beneficiary,
Confirm/Authorize/Apply, Settings, Profile, Card controls, or any action button.

## Data recording

Write extracted data to `input/banks/<bank_id>.json` following `docs/08-data-schema.md`.
Mask all identifiers to last 4 digits (`****1234`). After all banks are done run:

```
npm run build && npm run validate && npm run audit
```

## Full rules

- Safety boundaries: `docs/02-safety-boundaries.md` and `.cursor/rules/00-safety-boundaries.mdc`
- Extraction workflow: `docs/04-ai-agent-operating-instructions.md` and `.cursor/rules/10-extraction-agent.mdc`
- Browser session: `docs/05-browser-session-workflow.md`
