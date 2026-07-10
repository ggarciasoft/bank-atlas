# Demo banks

Three local mock bank websites for practicing extraction without touching real banks.

| Bank | ID | Port | Focus |
|------|-----|------|-------|
| Atlas Savings | `demo-savings` | 5181 | Savings accounts + one card |
| Nova Credit | `demo-cards` | 5182 | Multi-currency credit cards |
| Prime Lending | `demo-loans` | 5183 | Mortgage + personal loans |

## Setup

```bash
npm run seed-demo-banks    # write config + input + items + finance.db rows
npm run demo-banks         # start all three mock servers (Ctrl+C to stop)
```

Each bank serves:

- `/login` — pre-filled login form (auto-login testing)
- `/home` — dashboard with accounts, cards, loans, and transactions

Forbidden demo paths (403): `/transfer`, `/pay`, `/settings`, etc.

## Verify configs in the database

```bash
npm run banks:list
```

## Include in a snapshot

```bash
npm run build
```

Demo bank JSON files are committed under `input/banks/` and `config/items/`.
