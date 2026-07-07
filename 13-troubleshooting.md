# 13 - Troubleshooting

## Browser does not open

Possible causes:

- MCP server is not running.
- Node.js or npx is unavailable.
- The IDE did not load the MCP config.
- The MCP server is disabled.

Try:

- Restart Cursor or VS Code.
- Confirm MCP server appears in the tool list.
- Run a simple test prompt with `https://example.com`.
- Check whether Node.js is installed.

## Login state is not saved

Possible causes:

- You are using isolated mode.
- `--user-data-dir` points to a temporary folder.
- Bank invalidated the session.
- Browser profile was deleted.
- Bank always requires 2FA.

Try:

- Confirm `--user-data-dir` is configured.
- Use a dedicated profile folder.
- Do not use `--isolated`.
- Complete login manually again.

## Bank asks for 2FA every time

This may be normal. Banks can require 2FA based on their own risk checks.

Do not try to bypass it.

Use the workflow:

```text
Agent opens page → user completes 2FA → agent continues
```

## Bank shows CAPTCHA or bot warning

Stop.

Do not ask the agent to solve or bypass it.

Options:

- Continue manually without the agent.
- Use downloaded statements instead.
- Use email alerts or CSV exports.
- Try again later only if the bank permits normal access.

## Agent clicks unsafe page

Stop the agent immediately.

Then:

1. Close the browser tab.
2. Review `02-safety-boundaries.md`.
3. Tighten the bank profile forbidden pages.
4. Restart from a safe page.

## Extracted numbers look wrong

Possible causes:

- Table columns were misread.
- Currency was inferred incorrectly.
- Amount was copied from another row.
- Pending and posted balances were mixed.

Fix:

- Mark the value as `needs_review`.
- Add extraction notes to the bank profile.
- Ask the agent to compare the visible page again.

