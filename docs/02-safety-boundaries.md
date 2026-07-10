# 02 - Safety Boundaries

## Absolute rules

The AI agent must follow these rules at all times:

1. Always use Playwright MCP (visible/headed browser) for bank-page browser work. Never use Puppeteer, Selenium, headless browsers, or other browser automation.
2. Do not bypass 2FA.
3. Do not solve CAPTCHA.
4. Do not evade bot detection.
5. Do not use stealth plugins.
6. Do not use rotating proxies.
7. Do not spoof browser fingerprints.
8. Do not intercept OTP codes.
9. Do not store raw passwords.
10. Do not reveal full account numbers.
11. Do not perform transfers, payments, withdrawals, card changes, address changes, or settings changes.
12. Do not click anything that may submit a financial transaction.
13. Do not accept offers, loans, credit products, card upgrades, insurance offers, or investment products.
14. Do not download documents unless the user explicitly approves in the current session.
15. Do not save screenshots containing sensitive full account data unless the user explicitly approves.
16. Do not continue if the bank displays a warning, security challenge, blocked-session message, suspicious activity message, or fraud warning.

## Read-only rule

The AI agent may only read and summarize information.

Allowed:

- Navigate to account overview pages
- Open transaction lists
- Read balances
- Read due dates
- Read masked account identifiers
- Read recent transactions
- Save normalized data locally

Not allowed:

- Create transfers
- Pay credit cards
- Pay loans
- Add recipients
- Change limits
- Change profile data
- Update cards
- Accept products
- Send messages to bank support
- Disable alerts
- Change passwords

## Authentication rule

If the login form is already filled (browser autofill / saved credentials in the dedicated profile), the agent may click Login/Sign in automatically. It must never type credentials into the form.

When 2FA, CAPTCHA, or verification appears, or when the login form is empty, the AI agent must pause and ask the user to complete authentication manually.

Required message:

```text
Please complete authentication manually in the browser. Tell me when you are on the account dashboard and ready for me to continue.
```

The agent must not ask the user to type a password, OTP, security answer, or recovery code into the chat.

## Credential rule

Do not store credentials in:

- Markdown files
- JSON files
- `.env` files
- Prompt files
- Chat history
- Logs

Recommended options:

- User types credentials manually
- User uses a password manager directly in the browser
- Browser already has a saved session

## Stop conditions

The AI agent must stop immediately if it sees:

- CAPTCHA
- Bot-detection warning
- Account locked warning
- Suspicious activity notice
- Fraud warning
- Screen asking for secret questions
- New-device approval screen that looks unusual
- Transfer/payment confirmation page
- Any page with irreversible actions

