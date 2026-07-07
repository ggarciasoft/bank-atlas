# 03 - MCP Environment Setup

## Purpose

This workspace uses MCP to give the AI agent access to controlled tools. The main tool is Playwright MCP, which lets the agent operate a visible browser.

## Required MCP server

- Playwright MCP

## Recommended mode

Use a visible browser, not headless mode.

Reason:

- You can see what the agent is doing.
- You can manually complete 2FA.
- You can stop the agent if it reaches a sensitive page.

## VS Code MCP example

Create `.vscode/mcp.json` in the workspace.

See `.vscode/mcp.json.example` in this pack.

```json
{
  "servers": {
    "playwright-finance": {
      "command": "npx",
      "args": [
        "@playwright/mcp@latest",
        "--browser=chrome",
        "--user-data-dir=./.browser-profiles/finance",
        "--viewport-size=1366x768"
      ]
    }
  }
}
```

## Cursor MCP example

Create `.cursor/mcp.json` in the workspace.

See `.cursor/mcp.json.example` in this pack.

```json
{
  "mcpServers": {
    "playwright-finance": {
      "command": "npx",
      "args": [
        "@playwright/mcp@latest",
        "--browser=chrome",
        "--user-data-dir=./.browser-profiles/finance",
        "--viewport-size=1366x768"
      ]
    }
  }
}
```

## Persistent browser session

Use a dedicated browser profile for this workflow:

```text
.browser-profiles/finance
```

Do not point Playwright MCP to your regular Chrome profile. Use a separate profile dedicated to this financial workflow.

## Optional per-bank profile strategy

For stronger isolation, use one profile per bank:

```text
.browser-profiles/bank-popular
.browser-profiles/bhd
.browser-profiles/banreservas
.browser-profiles/paypal
```

This requires changing the MCP config or running separate MCP servers for each profile.

## First-run process

1. Start Cursor or VS Code.
2. Confirm Playwright MCP is connected.
3. Ask the AI agent to open a test page.
4. Confirm a visible browser opens.
5. Ask the AI agent to open the first bank URL.
6. Complete login manually.
7. Let the agent read the page after you confirm.

