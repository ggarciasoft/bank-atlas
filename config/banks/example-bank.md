# Bank Profile: Example Bank

## Basic information

- Bank name: Example Bank
- Country: Dominican Republic
- Website URL: https://example.com
- Login URL: https://example.com/login
- Currency defaults: DOP, USD
- Last reviewed: 2026-07-06

## Authentication notes

- Login is manual: yes
- 2FA expected: unknown
- CAPTCHA expected: unknown
- Session usually persists: unknown
- Do not store password: yes

## Safe pages

The AI agent may visit:

- Account overview
- Checking/savings list
- Credit card summary
- Loan summary
- Transaction list

## Forbidden pages

The AI agent must not visit or interact with:

- Transfers
- Payments
- Beneficiaries
- Credit applications
- Profile/settings
- Card controls

## Extraction targets

Extract all visible balances, debts, due dates, and recent transactions. Mask account numbers before saving.

