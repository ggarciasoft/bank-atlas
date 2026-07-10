# Bank Profile: Prime Lending

## Basic information

- Bank name: Prime Lending
- Country: Dominican Republic (demo)
- Website URL: http://127.0.0.1:5183/
- Login URL: http://127.0.0.1:5183/login
- Dashboard URL: http://127.0.0.1:5183/home
- Currency defaults: DOP, USD
- Last reviewed: 2026-07-09
- Demo bank: yes (local mock server, port 5183)

## Authentication notes

- Login is manual: yes (when form fields are empty)
- Auto-login if form filled: yes
- 2FA expected: no
- CAPTCHA expected: no
- Session usually persists: yes
- Do not store password: yes

## Safe pages

The AI agent may visit:

- Account overview: http://127.0.0.1:5183/home
- Checking/savings list: http://127.0.0.1:5183/home
- Credit card summary: http://127.0.0.1:5183/home
- Loan summary: http://127.0.0.1:5183/home
- Transaction list: http://127.0.0.1:5183/home

## Forbidden pages

The AI agent must not visit or interact with:

- Transfers: /transfer
- Payments: /pay
- Beneficiaries: /beneficiaries
- Credit applications: /apply
- Profile/settings: /settings
- Card controls: /card-controls

## Extraction notes

- Demo data only — amounts are fictional.
- Table headers use Spanish labels where applicable.
- Date format: YYYY-MM-DD in transaction tables.
- Decimal format: comma thousands, dot decimals in display (RD$ 8,450.00).
- Login form is pre-filled for auto-login testing.

## Known risks

- Popups: none
- Session timeouts: none (static demo)
- Pages that look like action pages: /transfer and /pay exist but are forbidden
- Misleading labels: none
