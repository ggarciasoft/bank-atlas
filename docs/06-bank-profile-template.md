# 06 - Bank Profile Template

Create one profile file per bank under `config/banks/`.

Example:

```text
config/banks/banco-popular.md
config/banks/bhd.md
config/banks/banreservas.md
```

## Template

```md
# Bank Profile: <Bank Name>

## Basic information

- Bank name:
- Country:
- Website URL:
- Login URL:
- Currency defaults:
- Last reviewed:

## Authentication notes

- Login is manual: yes (when form fields are empty)
- Auto-login if form filled: yes
- 2FA expected: yes/no/unknown
- CAPTCHA expected: yes/no/unknown
- Session usually persists: yes/no/unknown
- Do not store password: yes

## Safe pages

The AI agent may visit:

- Account overview:
- Checking/savings list:
- Credit card summary:
- Loan summary:
- Transaction list:

## Forbidden pages

The AI agent must not visit or interact with:

- Transfers:
- Payments:
- Beneficiaries:
- Credit applications:
- Profile/settings:
- Card controls:

## Extraction targets

### Cash accounts

Expected fields:

- Account type
- Masked account ID
- Available balance
- Current balance
- Currency

### Credit cards

Expected fields:

- Card name
- Masked card ID
- Current balance
- Statement balance
- Minimum payment
- Due date
- Available credit
- Credit limit, if visible
- Currency

### Loans

Expected fields:

- Loan type
- Masked loan ID
- Remaining balance
- Monthly payment
- Next due date
- Currency

### Transactions

Expected fields:

- Date
- Description
- Amount
- Debit/credit type
- Account/card
- Currency
- Source section

## Extraction notes

- Any table headers to look for:
- Any date format used:
- Any decimal format used:
- Any currency symbols used:
- Any pages that load slowly:

## Known risks

- Popups:
- Session timeouts:
- Pages that look like action pages:
- Misleading labels:

```

