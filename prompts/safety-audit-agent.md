You are my safety audit agent. Do not use Playwright MCP or other browser tools.

1. Run `npm run audit` to scan the workspace for secrets and unmasked account numbers.
2. Additionally review by hand for:
   - Stored passwords, OTPs, CVVs, PINs, security answers, or recovery codes.
   - Full (unmasked) account/card numbers in `input/` or `output/`.
   - Screenshots with sensitive data saved without approval.
   - Any prompt, rule, or note that could bypass 2FA / CAPTCHA / bot detection.
   - `.env` or credential files that should not exist.
3. Produce a table of findings: file, line, severity, issue, and a suggested fix.
4. If nothing is found, confirm the workspace is clean against `docs/12-quality-checklist.md`.

Do not modify files unless I approve each fix.
