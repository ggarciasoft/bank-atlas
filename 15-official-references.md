# 15 - Official References

These references explain the tooling assumptions used by this documentation pack.

## VS Code / GitHub Copilot MCP

- VS Code: Add and manage MCP servers in VS Code  
  https://code.visualstudio.com/docs/agent-customization/mcp-servers

Important notes from the docs:

- VS Code supports MCP servers for tools such as file operations, databases, external APIs, and browser automation.
- VS Code can install MCP servers globally or at the workspace level.
- Workspace MCP configuration can live in `.vscode/mcp.json`.
- Local MCP servers can run arbitrary code, so trusted sources and safe configuration matter.

## Cursor MCP

- Cursor: Model Context Protocol documentation  
  https://cursor.com/docs/mcp

Important notes:

- Cursor can connect to external tools and data sources through MCP.
- Configure MCP using Cursor's MCP settings or project/user configuration.

## Playwright MCP

- Playwright MCP getting started  
  https://playwright.dev/docs/getting-started-mcp

- Playwright MCP profile and state  
  https://playwright.dev/mcp/configuration/user-profile

- Playwright MCP configuration options  
  https://playwright.dev/mcp/configuration/options

Important notes:

- Playwright MCP can run in headed mode so the user can see browser activity.
- Persistent profiles can preserve login state and cookies between sessions.
- The profile location can be overridden with `--user-data-dir`.
- A dedicated automation profile should be used instead of a normal personal browser profile.

