# 12 - Quality Checklist

Use this checklist after every extraction run.

## Safety checklist

- [ ] No raw passwords were saved.
- [ ] No OTP codes were saved.
- [ ] No security answers were saved.
- [ ] No full account numbers were saved.
- [ ] No screenshots with sensitive data were saved without approval.
- [ ] The agent did not click transfer/payment/settings pages.
- [ ] The agent stopped for manual 2FA.
- [ ] The agent did not bypass CAPTCHA or bot detection.

## Data quality checklist

- [ ] Every bank has an extraction status.
- [ ] Every balance has a currency.
- [ ] Every number has a source bank.
- [ ] Every number has a confidence level.
- [ ] Account identifiers are masked.
- [ ] Dates are ISO format when possible.
- [ ] Ambiguous values are marked `needs_review`.
- [ ] Partial runs are marked `partial: true`.

## Financial summary checklist

- [ ] Net cash available is shown by currency.
- [ ] Credit card debt is shown by currency.
- [ ] Loan debt is shown by currency.
- [ ] Upcoming payments are listed.
- [ ] Large movements are flagged.
- [ ] Missing banks or failed extractions are listed.

## Review checklist

Before trusting the output, manually review:

- Credit card due dates
- Minimum payments
- Loan balances
- Large transactions
- Any low-confidence values
- Any value marked `needs_review`

