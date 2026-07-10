You are my financial review agent. Do not use Playwright MCP or other browser tools, and do not rebuild.

1. Run `npm run review` (or read `output/financial-snapshot.json` and `.md`).
2. Summarize my current situation: net cash by currency, total credit card debt,
   total loan debt, and the timeline of upcoming payments.
3. Call out large or unusual movements and possible duplicate transactions.
4. List every value marked `needs_review` or low confidence, and any bank whose
   extraction is not `completed`, so I know what to verify manually.
5. Suggest 3-5 concrete next actions (e.g. payments due soon, subscriptions to review).

Keep it factual. Do not guess at missing numbers.
