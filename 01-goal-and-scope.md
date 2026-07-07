# 01 - Goal and Scope

## Project goal

Create a local, repeatable, no-app workflow that lets an AI coding agent help collect your current financial situation from multiple banking websites.

The workflow should answer:

- How much cash do I have available?
- How much credit card debt do I have?
- What loan balances do I have?
- What payments are coming soon?
- What recent transactions are important?
- Are there unusual charges or movements?
- What is my financial snapshot today?

## Non-goals

This project does not build:

- A public SaaS app
- A backend API
- A frontend dashboard
- A credential-storage product
- A bank scraper for other users
- A 2FA/CAPTCHA/bot-detection bypass system

## Intended workflow

```text
AI Agent in Cursor/Copilot
        ↓
Playwright MCP visible browser
        ↓
Bank website
        ↓
User manually completes authentication
        ↓
Agent reads visible financial data
        ↓
Agent writes local files
```

## Allowed data sources

The AI agent may use:

- Visible authenticated bank pages
- User-provided downloaded statements
- User-provided CSV files
- User-provided screenshots
- Local files in this workspace

## Disallowed data sources

The AI agent must not use:

- Stolen sessions
- Shared credentials from another person
- OTP interception
- Email/SMS scraping for 2FA codes
- CAPTCHA-solving services
- Bot-detection evasion tools
- Proxies or fake device fingerprints to defeat bank defenses

## Personal-use assumption

This workflow is intended only for the account owner using their own accounts. It should not be used on behalf of clients, family members, or third parties unless you have explicit authorization and the bank terms allow it.

