// Render output/financial-snapshot.md from the snapshot object.
// Mirrors the template in docs/09-output-formats.md.

function fmtMoney(amount, currency) {
  if (amount === null || amount === undefined || amount === "") return "";
  const n = Number(amount);
  if (!Number.isFinite(n)) return String(amount);
  const formatted = n.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return currency ? `${currency} ${formatted}` : formatted;
}

function currencyList(list) {
  if (!list || list.length === 0) return "none";
  return list.map((x) => fmtMoney(x.total, x.currency)).join(", ");
}

function table(headers, aligns, rows) {
  const head = `| ${headers.join(" | ")} |`;
  const sep = `|${aligns.map((a) => (a === "r" ? "---:" : "---")).join("|")}|`;
  const body =
    rows.length === 0
      ? `| ${headers.map(() => "").join(" | ")} |`
      : rows.map((r) => `| ${r.join(" | ")} |`).join("\n");
  return [head, sep, body].join("\n");
}

/**
 * @param {any} snapshot The full financial-snapshot.json object.
 * @returns {string}
 */
export function renderMarkdown(snapshot) {
  const { summary } = snapshot;
  const banks = snapshot.banks || [];

  const cashRows = [];
  const cardRows = [];
  const loanRows = [];
  const txRows = [];
  for (const bank of banks) {
    for (const a of bank.accounts || []) {
      cashRows.push([
        bank.bank_name,
        `${a.account_name || ""} ${a.account_id_masked || ""}`.trim(),
        a.currency || "",
        fmtMoney(a.available_balance),
        fmtMoney(a.current_balance),
        a.confidence || "",
      ]);
    }
    for (const c of bank.credit_cards || []) {
      cardRows.push([
        bank.bank_name,
        `${c.card_name || ""} ${c.card_id_masked || ""}`.trim(),
        c.currency || "",
        fmtMoney(c.current_balance),
        fmtMoney(c.minimum_payment),
        c.due_date || "",
        fmtMoney(c.available_credit),
        c.confidence || "",
      ]);
    }
    for (const l of bank.loans || []) {
      loanRows.push([
        bank.bank_name,
        `${l.loan_name || ""} ${l.loan_id_masked || ""}`.trim(),
        l.currency || "",
        fmtMoney(l.remaining_balance),
        fmtMoney(l.monthly_payment),
        l.next_due_date || "",
        l.confidence || "",
      ]);
    }
    for (const t of bank.transactions || []) {
      txRows.push([
        t.date || "",
        bank.bank_name,
        t.account_id_masked || "",
        t.description || "",
        t.direction || "",
        t.currency || "",
        fmtMoney(t.amount),
        t.category_guess || "",
      ]);
    }
  }
  txRows.sort((a, b) => String(b[0]).localeCompare(String(a[0])));

  const upcomingRows = (summary.upcoming_payments || []).map((u) => [
    u.date || "",
    u.bank_name || "",
    u.type || "",
    u.description || "",
    u.currency || "",
    fmtMoney(u.amount),
  ]);

  const largeRows = (summary.large_movements || []).map((m) => [
    m.date || "",
    m.bank_name || "",
    m.account_id_masked || "",
    m.description || "",
    m.currency || "",
    fmtMoney(m.amount),
    m.reason || "",
  ]);

  const statusRows = banks.map(
    (b) => `- ${b.bank_name} (${b.bank_id}): ${b.extraction_status}`
  );

  const reviewRows =
    (summary.needs_review || []).length === 0
      ? ["- none"]
      : summary.needs_review.map(
          (r) =>
            `- ${r.bank_name} — ${r.kind} ${r.id_masked || ""} ${r.label || ""} (${r.reason})`.replace(
              /\s+/g,
              " "
            )
        );

  const notes = [];
  for (const b of banks) {
    for (const n of b.notes || []) notes.push(`- ${b.bank_name}: ${n}`);
    for (const w of b.warnings || []) notes.push(`- ${b.bank_name} [warning]: ${w}`);
  }
  if (notes.length === 0) notes.push("- none");

  return `# Financial Snapshot

Generated at: ${snapshot.generated_at || "pending"}
Snapshot date: ${snapshot.snapshot_date || "pending"}
Partial: ${snapshot.partial ? "yes" : "no"}

## Bank extraction status

${statusRows.length ? statusRows.join("\n") : "- none"}

## Executive summary

- Net cash available: ${currencyList(summary.cash_by_currency)}
- Total credit card debt: ${currencyList(summary.credit_card_debt_by_currency)}
- Total loan debt: ${currencyList(summary.loan_debt_by_currency)}
- Upcoming payments: ${(summary.upcoming_payments || []).length}
- Data needing review: ${(summary.needs_review || []).length}

## Cash balances

${table(
  ["Bank", "Account", "Currency", "Available", "Current", "Confidence"],
  ["l", "l", "r", "r", "r", "l"],
  cashRows
)}

## Credit cards

${table(
  ["Bank", "Card", "Currency", "Current Balance", "Minimum Payment", "Due Date", "Available Credit", "Confidence"],
  ["l", "l", "r", "r", "r", "l", "r", "l"],
  cardRows
)}

## Loans

${table(
  ["Bank", "Loan", "Currency", "Remaining Balance", "Monthly Payment", "Next Due Date", "Confidence"],
  ["l", "l", "r", "r", "r", "l", "l"],
  loanRows
)}

## Upcoming payments

${table(
  ["Date", "Bank", "Type", "Description", "Currency", "Amount"],
  ["l", "l", "l", "l", "r", "r"],
  upcomingRows
)}

## Recent large or unusual movements

${table(
  ["Date", "Bank", "Account", "Description", "Currency", "Amount", "Reason"],
  ["l", "l", "l", "l", "r", "r", "l"],
  largeRows
)}

## Recent transactions

${table(
  ["Date", "Bank", "Account", "Description", "Direction", "Currency", "Amount", "Category"],
  ["l", "l", "l", "l", "l", "r", "r", "l"],
  txRows
)}

## Missing or uncertain data

${reviewRows.join("\n")}

## Agent notes

${notes.join("\n")}
`;
}
