# 05 - Browser Session Workflow

## Why persistent sessions matter

Bank websites often remember a browser profile for a limited period. If Playwright MCP uses a persistent user-data directory, login state, cookies, and localStorage may be preserved between sessions.

This does not guarantee that 2FA will be skipped. The bank can require 2FA again based on time, risk, device checks, location, or internal policies.

## Standard workflow

```text
Start AI agent
    ↓
Open bank URL with Playwright MCP
    ↓
Check whether user is already logged in
    ↓
If logged in:
    Read financial data
    Save output

If not logged in:
    Ask user to authenticate manually
    Wait for user confirmation
    Read financial data
    Save output
```

## Agent login detection

The agent should infer login state using safe signals:

Logged out signals:

- Login form visible
- Username field visible
- Password field visible
- Button says login/sign in/acceder/entrar
- URL includes login/auth/session

Logged in signals:

- Account overview visible
- Balance cards visible
- User name visible
- Navigation includes accounts/cards/loans/transactions
- No password field visible

## 2FA flow

If a verification screen appears, the agent must not interact with it except to wait.

Allowed:

- Stop and tell the user to complete 2FA manually
- Wait until the user says to continue
- Continue after the dashboard is visible

Not allowed:

- Request OTP in chat
- Read OTP from email or SMS
- Use backup codes
- Automate security questions
- Attempt repeated retries

## Session expiration

If the bank logs out during extraction:

1. Stop extraction.
2. Save partial data with `partial: true`.
3. Ask user to authenticate manually again.
4. Continue only after user confirms.

## Recommended browser profile location

Use:

```text
.browser-profiles/finance
```

Optional stronger isolation:

```text
.browser-profiles/<bank-slug>
```

## Important warning

Do not use your normal Chrome profile. Use a dedicated profile for this workflow.

