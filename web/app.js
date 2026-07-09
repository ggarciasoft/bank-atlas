"use strict";

const SYMBOLS = { DOP: "RD$", USD: "US$", EUR: "\u20ac" };
// Categories that are internal money movement, not real spending.
const NON_SPEND = new Set(["transfer", "payment"]);

const state = {
  snapshot: null,
  bank: "ALL", // bank_id or "ALL"
  currency: "ALL", // "ALL" | "DOP" | "USD" | ...
  direction: "ALL", // "ALL" | "debit" | "credit"
  search: "",
  route: "dashboard", // "dashboard" | "admin"
  error: null, // dashboard load error, if any
};

// Admin view state (create bank, edit config, run commands).
const admin = {
  banks: null, // null = not loaded yet
  notice: null, // { kind: "success"|"warn"|"error", text }
  editing: null, // bank_id currently being edited, or null
  editingContent: "",
  itemsEditing: null, // bank_id for items registry editor
  itemsDoc: null,
  itemForm: null, // { kind, mode: "add"|"edit", data }
  busy: false,
  commandOutput: null, // { command, ok, text }
};

const ACCOUNT_TYPES = ["checking", "savings", "cash", "wallet", "investment", "other"];
const LOAN_TYPES = ["mortgage", "vehicle", "personal", "student", "line_of_credit", "other"];
const ITEM_KINDS = [
  { id: "accounts", label: "Accounts", idField: "account_id_masked" },
  { id: "credit_cards", label: "Credit cards", idField: "card_id_masked" },
  { id: "loans", label: "Loans", idField: "loan_id_masked" },
];

function money(amount, currency) {
  const sym = SYMBOLS[currency] || currency + " ";
  return (
    sym +
    Number(amount || 0).toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  );
}

function titleCase(s) {
  if (!s) return "";
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function el(tag, attrs, children) {
  const node = document.createElement(tag);
  if (attrs) {
    for (const [k, v] of Object.entries(attrs)) {
      if (k === "class") node.className = v;
      else if (k === "html") node.innerHTML = v;
      else if (k.startsWith("on") && typeof v === "function") {
        node.addEventListener(k.slice(2).toLowerCase(), v);
      } else if (v !== null && v !== undefined) {
        node.setAttribute(k, v);
      }
    }
  }
  if (children != null) {
    for (const c of [].concat(children)) {
      if (c == null) continue;
      node.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
    }
  }
  return node;
}

/** Banks matching the current bank filter. */
function activeBanks() {
  const banks = state.snapshot.banks || [];
  return state.bank === "ALL"
    ? banks
    : banks.filter((b) => b.bank_id === state.bank);
}

function collect(key) {
  const out = [];
  for (const b of activeBanks()) {
    for (const item of b[key] || []) out.push({ ...item, bank_name: b.bank_name, bank_id: b.bank_id });
  }
  return out;
}

function sumByCurrency(items, field) {
  const map = {};
  for (const it of items) {
    const cur = it.currency || "?";
    map[cur] = (map[cur] || 0) + Number(it[field] || 0);
  }
  return map;
}

/* ---------- Renderers ---------- */

function renderHeader() {
  const s = state.snapshot;
  const right = el("div", { class: "spacer" });
  const badges = el("div", { style: "display:flex;gap:8px;align-items:center" }, [
    s.partial ? el("span", { class: "badge warn" }, "Partial") : null,
    el("span", { class: "badge" }, `${(s.banks || []).length} bank(s)`),
  ]);
  return el("div", { class: "header" }, [
    el("div", {}, [
      el("h1", {}, "Financial Snapshot"),
      el(
        "div",
        { class: "sub" },
        `Snapshot ${s.snapshot_date} · generated ${new Date(s.generated_at).toLocaleString()}`
      ),
    ]),
    right,
    badges,
  ]);
}

function renderTabs() {
  const banks = state.snapshot.banks || [];
  const tabs = [el("div", {
    class: "tab" + (state.bank === "ALL" ? " active" : ""),
    onClick: () => setState({ bank: "ALL" }),
  }, "All banks")];
  for (const b of banks) {
    tabs.push(
      el("div", {
        class: "tab" + (state.bank === b.bank_id ? " active" : ""),
        onClick: () => setState({ bank: b.bank_id }),
      }, b.bank_name)
    );
  }
  return el("div", { class: "tabs" }, tabs);
}

function renderSummary() {
  const cash = sumByCurrency(collect("accounts"), "available_balance");
  const debt = sumByCurrency(collect("credit_cards"), "current_balance");
  const loans = sumByCurrency(collect("loans"), "remaining_balance");

  const stats = [];
  for (const [cur, total] of Object.entries(cash)) {
    stats.push(statEl(money(total, cur), `Cash available (${cur})`, "success"));
  }
  for (const [cur, total] of Object.entries(debt)) {
    stats.push(statEl(money(total, cur), `Card balance (${cur})`, "warning"));
  }
  for (const [cur, total] of Object.entries(loans)) {
    stats.push(statEl(money(total, cur), `Loan balance (${cur})`, "danger"));
  }

  return el("section", {}, [
    el("h2", { class: "section-title" }, "Summary"),
    el("div", { class: "stat-grid" }, stats),
  ]);
}

function statEl(value, label, tone) {
  return el("div", { class: "stat" }, [
    el("div", { class: "value " + (tone || "") }, value),
    el("div", { class: "label" }, label),
  ]);
}

function renderUpcoming() {
  const payments = (state.snapshot.summary?.upcoming_payments || []).filter(
    (p) => state.bank === "ALL" || p.bank_id === state.bank
  );
  if (payments.length === 0) return null;
  const rows = payments.map((p) =>
    el("tr", {}, [
      el("td", {}, p.date),
      el("td", {}, p.bank_name),
      el("td", {}, [el("span", { class: "chip" }, p.type.replace("_", " "))]),
      el("td", {}, p.description),
      el("td", { class: "num" }, money(p.amount, p.currency)),
      el("td", { class: "num" }, `${p.days_until}d`),
    ])
  );
  return el("section", {}, [
    el("h2", { class: "section-title" }, "Upcoming payments"),
    tableEl(["Date", "Bank", "Type", "Description", "Amount", "In"], rows, [
      false, false, false, false, true, true,
    ]),
  ]);
}

function renderCards() {
  const cards = collect("credit_cards");
  if (cards.length === 0) return null;
  const grid = el("div", { class: "card-grid" });
  for (const c of cards) {
    const limit = Number(c.credit_limit || 0);
    const bal = Number(c.current_balance || 0);
    const pct = limit > 0 ? Math.round((bal / limit) * 100) : 0;
    const fillClass = pct >= 75 ? "danger" : pct >= 50 ? "hot" : "";
    grid.appendChild(
      el("div", { class: "card" }, [
        el("div", { class: "card-head" }, [
          el("div", {}, [
            el("div", { class: "card-name" }, `${c.card_name} ${c.card_id_masked}`),
            el("div", { class: "card-meta" }, `${c.bank_name} · ${c.currency}`),
          ]),
          c.due_date ? el("div", { class: "card-meta" }, `Due ${c.due_date}`) : null,
          c.statement_closing_date
            ? el("div", { class: "card-meta" }, `Closes ${c.statement_closing_date}`)
            : null,
        ]),
        el("div", { class: "usage" }, [
          el("div", { class: "usage-top" }, [
            el("span", {}, `${pct}% used`),
            el("span", {}, `${money(bal, c.currency)} / ${money(limit, c.currency)}`),
          ]),
          el("div", { class: "track" }, [
            el("div", { class: "fill " + fillClass, style: `width:${Math.min(pct, 100)}%` }),
          ]),
        ]),
        el("div", { class: "metrics" }, [
          metric("Balance", money(bal, c.currency)),
          metric("Available", money(c.available_credit, c.currency)),
          metric("Statement", money(c.statement_balance, c.currency)),
        ]),
      ])
    );
  }
  return el("section", {}, [
    el("h2", { class: "section-title" }, "Credit cards"),
    grid,
  ]);
}

function metric(label, value) {
  return el("div", { class: "m" }, [
    el("div", { class: "mv" }, value),
    el("div", { class: "ml" }, label),
  ]);
}

function renderAccountsAndSpend() {
  const accounts = collect("accounts");
  const left = [];
  if (accounts.length > 0) {
    const rows = accounts.map((a) =>
      el("tr", {}, [
        el("td", {}, `${a.account_name} ${a.account_id_masked}`),
        el("td", {}, [el("span", { class: "chip" }, titleCase(a.account_type))]),
        el("td", {}, `${a.bank_name}`),
        el("td", { class: "num" }, money(a.available_balance, a.currency)),
      ])
    );
    left.push(el("h2", { class: "section-title" }, "Cash accounts"));
    left.push(tableEl(["Account", "Type", "Bank", "Balance"], rows, [false, false, false, true]));
  }

  const right = [
    el("h2", { class: "section-title" }, "Real spending by category"),
    renderSpendBars(),
    el("div", { class: "muted" }, "Debits only; excludes internal transfers and card payments."),
  ];

  return el("section", {}, [
    el("div", { class: "two-col" }, [el("div", {}, left), el("div", {}, right)]),
  ]);
}

function renderSpendBars() {
  const txns = collect("transactions").filter(
    (t) => t.direction === "debit" && !NON_SPEND.has(t.category_guess)
  );
  const byCur = {};
  for (const t of txns) {
    const cur = t.currency;
    byCur[cur] = byCur[cur] || {};
    const cat = t.category_guess || "other";
    byCur[cur][cat] = (byCur[cur][cat] || 0) + Number(t.amount || 0);
  }
  const container = el("div", {});
  const currencies = Object.keys(byCur);
  if (currencies.length === 0) {
    return el("div", { class: "muted" }, "No categorized spending in this view.");
  }
  for (const cur of currencies) {
    const entries = Object.entries(byCur[cur]).sort((a, b) => b[1] - a[1]);
    const max = Math.max(...entries.map((e) => e[1]));
    container.appendChild(el("div", { class: "cur-head" }, cur));
    const bars = el("div", { class: "catbars" });
    for (const [cat, val] of entries) {
      bars.appendChild(
        el("div", { class: "catbar" }, [
          el("div", { class: "catbar-top" }, [
            el("span", { class: "cname" }, titleCase(cat)),
            el("span", { class: "cval" }, money(val, cur)),
          ]),
          el("div", { class: "track" }, [
            el("div", { class: "fill", style: `width:${max > 0 ? (val / max) * 100 : 0}%` }),
          ]),
        ])
      );
    }
    container.appendChild(bars);
  }
  return container;
}

function renderTransactions() {
  let txns = collect("transactions");
  if (state.currency !== "ALL") txns = txns.filter((t) => t.currency === state.currency);
  if (state.direction !== "ALL") txns = txns.filter((t) => t.direction === state.direction);
  if (state.search.trim()) {
    const q = state.search.trim().toLowerCase();
    txns = txns.filter(
      (t) =>
        (t.description || "").toLowerCase().includes(q) ||
        (t.category_guess || "").toLowerCase().includes(q) ||
        (t.account_id_masked || "").toLowerCase().includes(q)
    );
  }
  txns.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));

  const allTxns = collect("transactions");
  const currencies = Array.from(new Set(allTxns.map((t) => t.currency)));

  const rows = txns.map((t) =>
    el("tr", {}, [
      el("td", {}, t.date),
      el("td", {}, t.account_id_masked),
      el("td", {}, t.description),
      el("td", {}, [el("span", { class: "chip" }, titleCase(t.category_guess))]),
      el("td", {}, t.direction === "credit" ? "In" : "Out"),
      el(
        "td",
        { class: "num " + (t.direction === "credit" ? "amt-in" : "amt-out") },
        (t.direction === "credit" ? "+" : "-") + money(t.amount, t.currency)
      ),
    ])
  );

  const filters = el("div", { class: "filters" }, [
    filterGroup("Currency", ["ALL", ...currencies], state.currency, (v) => setState({ currency: v })),
    filterGroup("Flow", ["ALL", "credit", "debit"], state.direction, (v) => setState({ direction: v }), {
      credit: "In",
      debit: "Out",
    }),
    el("input", {
      type: "search",
      placeholder: "Search description, category…",
      value: state.search,
      onInput: (e) => setState({ search: e.target.value }, true),
    }),
  ]);

  return el("section", {}, [
    el("h2", { class: "section-title" }, "Transactions"),
    filters,
    tableEl(
      ["Date", "Account", "Description", "Category", "Flow", "Amount"],
      rows,
      [false, false, false, false, false, true],
      `No transactions match the current filters.`
    ),
    el("div", { class: "muted" }, `Showing ${txns.length} of ${allTxns.length} transactions.`),
  ]);
}

function filterGroup(label, values, current, onPick, labelMap) {
  const children = [el("span", { class: "glabel" }, label)];
  for (const v of values) {
    const text = v === "ALL" ? "All" : (labelMap && labelMap[v]) || titleCase(v);
    children.push(
      el("span", {
        class: "mini" + (current === v ? " active" : ""),
        onClick: () => onPick(v),
      }, text)
    );
  }
  return el("div", { class: "filter-group" }, children);
}

function tableEl(headers, rows, numericCols, emptyMessage) {
  const thead = el("thead", {}, [
    el(
      "tr",
      {},
      headers.map((h, i) =>
        el("th", { class: numericCols && numericCols[i] ? "num" : "" }, h)
      )
    ),
  ]);
  const body =
    rows.length > 0
      ? rows
      : [
          el("tr", {}, [
            el("td", { colspan: String(headers.length), style: "color:var(--text-tertiary);text-align:center;padding:24px" }, emptyMessage || "No data."),
          ]),
        ];
  return el("div", { class: "table-wrap" }, [el("table", {}, [thead, el("tbody", {}, body)])]);
}

function renderNotes() {
  const items = [];
  for (const b of activeBanks()) {
    for (const w of b.warnings || []) items.push({ bank: b.bank_name, text: w, warn: true });
  }
  if (items.length === 0) return null;
  return el("section", {}, [
    el("h2", { class: "section-title" }, "Warnings"),
    el(
      "div",
      { style: "display:flex;flex-direction:column;gap:10px" },
      items.map((it) =>
        el("div", { class: "callout" }, [
          el("div", { class: "dot", style: "background:var(--warning)" }),
          el("div", {}, [
            el("div", { class: "title" }, it.bank),
            el("div", { class: "body" }, it.text),
          ]),
        ])
      )
    ),
  ]);
}

/* ---------- Admin: API helpers ---------- */

function setNotice(kind, text) {
  admin.notice = text ? { kind, text } : null;
}

async function api(pathname, options) {
  const opts = { cache: "no-store", ...options };
  if (opts.body) opts.headers = { "content-type": "application/json", ...(opts.headers || {}) };
  const res = await fetch(pathname, opts);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

async function loadBanks() {
  const data = await api("/api/banks");
  admin.banks = data.banks || [];
}

async function createBankAction() {
  const input = document.getElementById("new-bank-name");
  const name = input ? input.value.trim() : "";
  if (!name) {
    setNotice("error", "Enter a bank name first.");
    return render();
  }
  admin.busy = true;
  render();
  try {
    const data = await api("/api/banks", { method: "POST", body: JSON.stringify({ name }) });
    if (data.created && data.created.length) {
      setNotice("success", `Created "${data.id}": ${data.created.join(", ")}. Fill its config below, then rebuild.`);
    } else {
      setNotice("warn", `Bank "${data.id}" already exists — nothing created.`);
    }
    await loadBanks();
  } catch (err) {
    setNotice("error", String(err.message || err));
  } finally {
    admin.busy = false;
    render();
  }
}

async function editConfig(id) {
  admin.itemsEditing = null;
  admin.itemsDoc = null;
  admin.itemForm = null;
  admin.busy = true;
  render();
  try {
    const data = await api(`/api/banks/${encodeURIComponent(id)}/config`);
    admin.editing = id;
    admin.editingContent = data.content || "";
    setNotice(null);
  } catch (err) {
    setNotice("error", String(err.message || err));
  } finally {
    admin.busy = false;
    render();
  }
}

async function saveConfig() {
  const ta = document.getElementById("config-editor");
  const content = ta ? ta.value : admin.editingContent;
  admin.editingContent = content;
  admin.busy = true;
  render();
  try {
    await api(`/api/banks/${encodeURIComponent(admin.editing)}/config`, {
      method: "PUT",
      body: JSON.stringify({ content }),
    });
    setNotice("success", `Saved config for "${admin.editing}".`);
    await loadBanks();
  } catch (err) {
    setNotice("error", String(err.message || err));
  } finally {
    admin.busy = false;
    render();
  }
}

function closeEditor() {
  admin.editing = null;
  admin.editingContent = "";
  render();
}

function closeItemsEditor() {
  admin.itemsEditing = null;
  admin.itemsDoc = null;
  admin.itemForm = null;
  render();
}

async function editItems(id) {
  admin.busy = true;
  admin.editing = null;
  admin.itemForm = null;
  render();
  try {
    const data = await api(`/api/banks/${encodeURIComponent(id)}/items`);
    admin.itemsEditing = id;
    admin.itemsDoc = data;
    setNotice(null);
  } catch (err) {
    setNotice("error", String(err.message || err));
  } finally {
    admin.busy = false;
    render();
  }
}

async function syncItemsRegistry() {
  admin.busy = true;
  render();
  try {
    const data = await api("/api/items/sync", { method: "POST" });
    setNotice("success", `Synced items for ${(data.banks_updated || []).length} bank(s). Rebuild to apply.`);
    await loadBanks();
    if (admin.itemsEditing) await editItems(admin.itemsEditing);
  } catch (err) {
    setNotice("error", String(err.message || err));
  } finally {
    admin.busy = false;
    render();
  }
}

function openItemForm(kind, mode, data) {
  admin.itemForm = { kind, mode, data: { ...data } };
  render();
}

function closeItemForm() {
  admin.itemForm = null;
  render();
}

function readItemFormFields(kind) {
  const val = (id) => {
    const node = document.getElementById(id);
    return node ? node.value.trim() : "";
  };
  const num = (id) => {
    const s = val(id);
    return s === "" ? null : Number(s);
  };
  const day = (id) => {
    const n = num(id);
    return n === null || !Number.isInteger(n) ? null : n;
  };

  if (kind === "accounts") {
    return {
      account_id_masked: val("item-id"),
      account_name: val("item-name") || null,
      account_type: val("item-type") || "other",
      currency: val("item-currency") || null,
      notes: val("item-notes") || "",
    };
  }
  if (kind === "credit_cards") {
    return {
      card_id_masked: val("item-id"),
      card_name: val("item-name") || null,
      currency: val("item-currency") || null,
      credit_limit: num("item-limit"),
      statement_closing_day: day("item-closing-day"),
      payment_due_day: day("item-due-day"),
      notes: val("item-notes") || "",
    };
  }
  return {
    loan_id_masked: val("item-id"),
    loan_name: val("item-name") || null,
    loan_type: val("item-type") || "other",
    currency: val("item-currency") || null,
    monthly_payment: num("item-payment"),
    payment_due_day: day("item-due-day"),
    term_months: day("item-term"),
    notes: val("item-notes") || "",
  };
}

async function saveItemForm() {
  if (!admin.itemForm || !admin.itemsEditing) return;
  const { kind, mode, data } = admin.itemForm;
  const payload = readItemFormFields(kind);
  const idField = ITEM_KINDS.find((k) => k.id === kind).idField;
  if (!payload[idField]) {
    setNotice("error", "Masked number (last 4 digits) is required.");
    render();
    return;
  }
  const currency = payload.currency || "?";
  const key = `${payload[idField]}|${currency}`;

  admin.busy = true;
  render();
  try {
    if (mode === "edit" && data.key) {
      await api(
        `/api/banks/${encodeURIComponent(admin.itemsEditing)}/items/${encodeURIComponent(kind)}/${encodeURIComponent(data.key)}`,
        { method: "PATCH", body: JSON.stringify(payload) }
      );
    } else {
      await api(`/api/banks/${encodeURIComponent(admin.itemsEditing)}/items/${encodeURIComponent(kind)}`, {
        method: "POST",
        body: JSON.stringify({ item: { ...payload, key } }),
      });
    }
    setNotice("success", "Item saved. Rebuild snapshot to apply to the dashboard.");
    admin.itemForm = null;
    await editItems(admin.itemsEditing);
  } catch (err) {
    setNotice("error", String(err.message || err));
  } finally {
    admin.busy = false;
    render();
  }
}

async function deleteItem(kind, key) {
  if (!admin.itemsEditing) return;
  if (!confirm(`Delete ${kind} item ${key}?`)) return;
  admin.busy = true;
  render();
  try {
    await api(
      `/api/banks/${encodeURIComponent(admin.itemsEditing)}/items/${encodeURIComponent(kind)}/${encodeURIComponent(key)}`,
      { method: "DELETE" }
    );
    setNotice("success", "Item deleted.");
    await editItems(admin.itemsEditing);
  } catch (err) {
    setNotice("error", String(err.message || err));
  } finally {
    admin.busy = false;
    render();
  }
}

const COMMANDS = [
  { id: "build", label: "Rebuild snapshot", method: "POST", path: "/api/build", primary: true },
  { id: "validate", label: "Validate", method: "POST", path: "/api/validate" },
  { id: "audit", label: "Audit", method: "POST", path: "/api/audit" },
  { id: "review", label: "Review", method: "GET", path: "/api/review" },
  { id: "db", label: "Re-save to SQLite", method: "POST", path: "/api/db" },
  { id: "history", label: "List history", method: "GET", path: "/api/history" },
  { id: "trends", label: "Trends", method: "GET", path: "/api/trends" },
];

function formatCommandOutput(data) {
  if (data.error && !data.command) return data.error;
  const lines = [];
  switch (data.command) {
    case "build":
      lines.push(`Built snapshot ${data.snapshot_date} (${data.banks} bank(s), partial: ${data.partial})`);
      for (const f of data.files || []) lines.push(`  wrote ${f}`);
      break;
    case "validate":
      if (data.errors === 0 && data.warnings === 0) {
        lines.push(`Validation passed — ${data.banks_checked} bank input(s), no issues.`);
      } else {
        lines.push(`${data.errors} error(s), ${data.warnings} warning(s) across ${data.banks_checked} bank input(s):`);
        for (const i of data.issues || []) {
          lines.push(`  [${i.level}] ${i.where}: ${i.message}`);
        }
      }
      break;
    case "audit":
      if (data.errors === 0 && data.warnings === 0) {
        lines.push("Safety audit passed — no secrets or unmasked numbers found.");
      } else {
        lines.push(`${data.errors} error(s), ${data.warnings} warning(s):`);
        for (const f of data.findings || []) {
          const loc = f.line ? `${f.file}:${f.line}` : f.file;
          lines.push(`  [${f.level}] ${loc}  ${f.message}`);
        }
      }
      break;
    case "review":
      return data.text || "";
    case "db":
      if (data.error) return data.error;
      lines.push(`Saved snapshot ${data.snapshot_date} to ${data.db_path}`);
      if (data.counts) {
        lines.push(
          `  rows: accounts ${data.counts.accounts}, cards ${data.counts.credit_cards}, loans ${data.counts.loans}, transactions ${data.counts.transactions}`
        );
      }
      break;
    case undefined:
      if (data.snapshots) {
        if (data.snapshots.length === 0) {
          lines.push("No snapshots recorded yet. Run Save to SQLite after a build.");
        } else {
          lines.push(`${data.snapshots.length} snapshot(s):`);
          for (const s of data.snapshots) {
            const partial = s.partial ? " (partial)" : "";
            lines.push(`  ${s.snapshot_date}  ${s.generated_at || "—"}${partial}`);
          }
        }
        break;
      }
      if (data.error) return data.error;
      break;
    case "trends":
      if (data.error) return data.error;
      if ((data.snapshots || 0) === 0) {
        lines.push("No snapshots recorded yet.");
        break;
      }
      lines.push(`History: ${data.snapshots} snapshot(s) — ${data.dates[0]} → ${data.dates[data.dates.length - 1]}`);
      const printSeries = (title, rows) => {
        lines.push("");
        lines.push(title);
        if (!rows || rows.length === 0) lines.push("  (none)");
        else {
          for (const r of rows) {
            lines.push(`  ${r.snapshot_date}  ${r.currency}  ${Number(r.total).toLocaleString("en-US")}`);
          }
        }
      };
      printSeries("Cash available:", data.cash);
      printSeries("Credit card debt:", data.card_debt);
      printSeries("Loan debt:", data.loan_debt);
      break;
    default:
      if (data.error) return data.error;
      lines.push(JSON.stringify(data, null, 2));
  }
  return lines.join("\n");
}

async function runCommand(id) {
  const cmd = COMMANDS.find((c) => c.id === id);
  if (!cmd) return;
  admin.busy = true;
  admin.commandOutput = null;
  setNotice(null);
  render();
  try {
    const data = await api(cmd.path, { method: cmd.method });
    const text = formatCommandOutput(data);
    admin.commandOutput = { command: id, ok: data.ok !== false, text };
    if (id === "build" && data.ok !== false) {
      state.snapshot = null;
      state.error = null;
    }
    if (data.ok === false) {
      setNotice(data.error ? "error" : "warn", data.error || `${cmd.label} finished with issues — see output below.`);
    } else if (id === "validate" && (data.errors > 0 || data.warnings > 0)) {
      setNotice("warn", `${cmd.label} finished with ${data.errors} error(s), ${data.warnings} warning(s).`);
    } else if (id === "audit" && (data.errors > 0 || data.warnings > 0)) {
      setNotice("warn", `${cmd.label} found ${data.errors} error(s), ${data.warnings} warning(s).`);
    } else {
      setNotice("success", `${cmd.label} completed.`);
    }
  } catch (err) {
    admin.commandOutput = { command: id, ok: false, text: String(err.message || err) };
    setNotice("error", String(err.message || err));
  } finally {
    admin.busy = false;
    render();
  }
}

/* ---------- Admin: renderers ---------- */

function renderAdminInto(view) {
  view.appendChild(
    el("div", {}, [
      el("h2", { class: "section-title" }, "Administration"),
      el(
        "div",
        { class: "muted" },
        "Create banks, edit their config profile, and run local tooling commands. These write to config/, input/, and output/ on this machine — the same files the CLI edits."
      ),
    ])
  );

  if (admin.notice) {
    view.appendChild(el("div", { class: "notice " + (admin.notice.kind || "") }, admin.notice.text));
  }

  view.appendChild(renderCommands());
  view.appendChild(renderAddBank());
  if (admin.itemsEditing) view.appendChild(renderItemsEditor());
  else if (admin.editing) view.appendChild(renderConfigEditor());
  else view.appendChild(renderBankList());
}

function renderCommands() {
  const buttons = COMMANDS.map((cmd) =>
    el(
      "button",
      {
        class: "btn" + (cmd.primary ? " primary" : ""),
        disabled: admin.busy ? "" : null,
        onClick: () => runCommand(cmd.id),
      },
      cmd.label
    )
  );
  const output =
    admin.commandOutput &&
    el("pre", { class: "cmd-output" + (admin.commandOutput.ok ? "" : " error") }, admin.commandOutput.text);
  return el("section", { class: "admin-card" }, [
    el("h3", { class: "admin-title" }, "Commands"),
    el("div", { class: "muted" }, "Same as npm run build, validate, audit, review, db (re-save), db:list, and trends."),
    el("div", { class: "cmd-grid" }, buttons),
    output,
  ]);
}

function renderAddBank() {
  return el("section", { class: "admin-card" }, [
    el("h3", { class: "admin-title" }, "Add a new bank"),
    el("div", { class: "muted" }, "Scaffolds config/banks/<id>.md and input/banks/<id>.json — same as npm run new-bank."),
    el("div", { class: "admin-row" }, [
      el("input", {
        type: "text",
        id: "new-bank-name",
        class: "admin-input",
        placeholder: "Bank name, e.g. Banco Popular",
        onKeydown: (e) => {
          if (e.key === "Enter" && !admin.busy) createBankAction();
        },
      }),
      el(
        "button",
        { class: "btn primary", disabled: admin.busy ? "" : null, onClick: () => createBankAction() },
        "Create bank"
      ),
    ]),
  ]);
}

function renderBankList() {
  const wrap = el("section", { class: "admin-card" }, [el("h3", { class: "admin-title" }, "Banks")]);
  if (admin.banks === null) {
    wrap.appendChild(el("div", { class: "loading" }, "Loading banks…"));
    return wrap;
  }
  if (admin.banks.length === 0) {
    wrap.appendChild(el("div", { class: "muted" }, "No banks yet. Add one above."));
    return wrap;
  }
  const list = el("div", { class: "bank-list" });
  for (const b of admin.banks) {
    list.appendChild(
      el("div", { class: "bank-item" }, [
        el("div", {}, [
          el("div", { class: "bank-name" }, b.name),
          el("div", { class: "bank-meta" }, [
            el("code", {}, b.id),
            b.has_config
              ? el("span", { class: "chip" }, "config")
              : el("span", { class: "chip missing" }, "no config"),
            b.has_input
              ? el("span", { class: "chip" }, "input")
              : el("span", { class: "chip missing" }, "no input"),
            b.has_items
              ? el("span", { class: "chip" }, "items")
              : el("span", { class: "chip missing" }, "no items"),
          ]),
        ]),
        el("div", { class: "bank-actions" }, [
          el(
            "button",
            { class: "btn", disabled: admin.busy ? "" : null, onClick: () => editConfig(b.id) },
            "Edit config"
          ),
          el(
            "button",
            { class: "btn", disabled: admin.busy ? "" : null, onClick: () => editItems(b.id) },
            "Edit items"
          ),
        ]),
      ])
    );
  }
  wrap.appendChild(list);
  return wrap;
}

function renderItemsEditor() {
  const doc = admin.itemsDoc || { accounts: [], credit_cards: [], loans: [] };
  const sections = ITEM_KINDS.map((meta) => renderItemsSection(meta, doc[meta.id] || []));
  const form = admin.itemForm ? renderItemForm() : null;

  return el("section", { class: "admin-card" }, [
    el("div", { class: "editor-head" }, [
      el("h3", { class: "admin-title" }, ["Items registry — ", el("code", {}, admin.itemsEditing)]),
      el("div", { class: "muted" }, `config/items/${admin.itemsEditing}.json — reference metadata merged at build time.`),
    ]),
    el("div", { class: "admin-row" }, [
      el(
        "button",
        { class: "btn", disabled: admin.busy ? "" : null, onClick: () => syncItemsRegistry() },
        "Sync from inputs"
      ),
      el(
        "button",
        { class: "btn primary", disabled: admin.busy ? "" : null, onClick: () => runCommand("build") },
        "Rebuild snapshot"
      ),
      el("button", { class: "btn", disabled: admin.busy ? "" : null, onClick: () => closeItemsEditor() }, "Back to list"),
    ]),
    ...sections,
    form,
  ]);
}

function renderItemsSection(meta, items) {
  const rows = items.map((item) =>
    el("tr", {}, [
      el("td", {}, item[meta.idField] || "—"),
      el("td", {}, labelForItem(meta.id, item)),
      el("td", {}, item.currency || "—"),
      el("td", {}, extraItemFields(meta.id, item)),
      el("td", {}, (item.user_edited || []).length ? el("span", { class: "chip" }, "edited") : "—"),
      el("td", { class: "item-actions" }, [
        el(
          "button",
          {
            class: "btn mini-btn",
            disabled: admin.busy ? "" : null,
            onClick: () => openItemForm(meta.id, "edit", item),
          },
          "Edit"
        ),
        el(
          "button",
          {
            class: "btn mini-btn danger",
            disabled: admin.busy ? "" : null,
            onClick: () => deleteItem(meta.id, item.key),
          },
          "Delete"
        ),
      ]),
    ])
  );

  return el("div", { class: "items-section" }, [
    el("div", { class: "items-section-head" }, [
      el("h4", {}, meta.label),
      el(
        "button",
        {
          class: "btn mini-btn",
          disabled: admin.busy ? "" : null,
          onClick: () => openItemForm(meta.id, "add", {}),
        },
        "Add"
      ),
    ]),
    tableEl(
      ["Number", "Name", "Currency", "Details", "Locked", "Actions"],
      rows,
      [false, false, false, false, false, false],
      `No ${meta.label.toLowerCase()} in the registry yet. Sync from inputs or add manually.`
    ),
  ]);
}

function labelForItem(kind, item) {
  if (kind === "accounts") return item.account_name || "—";
  if (kind === "credit_cards") return item.card_name || "—";
  return item.loan_name || "—";
}

function extraItemFields(kind, item) {
  if (kind === "credit_cards") {
    const parts = [];
    if (item.credit_limit != null) parts.push(`limit ${item.credit_limit}`);
    if (item.statement_closing_day) parts.push(`closes day ${item.statement_closing_day}`);
    if (item.payment_due_day) parts.push(`due day ${item.payment_due_day}`);
    return parts.join(" · ") || "—";
  }
  if (kind === "loans") {
    const parts = [];
    if (item.monthly_payment != null) parts.push(`pay ${item.monthly_payment}`);
    if (item.payment_due_day) parts.push(`due day ${item.payment_due_day}`);
    return parts.join(" · ") || "—";
  }
  return item.account_type || "—";
}

function fieldInput(id, label, value, attrs) {
  return el("label", { class: "item-field" }, [
    el("span", {}, label),
    el("input", { id, class: "admin-input", value: value ?? "", ...(attrs || {}) }),
  ]);
}

function renderItemForm() {
  const { kind, mode, data } = admin.itemForm;
  const meta = ITEM_KINDS.find((k) => k.id === kind);
  const fields = [];

  fields.push(fieldInput("item-id", "Masked number", data[meta.idField] || "", mode === "edit" ? { readonly: "readonly" } : {}));
  fields.push(
    fieldInput(
      "item-name",
      "Name",
      kind === "accounts"
        ? data.account_name || ""
        : kind === "credit_cards"
          ? data.card_name || ""
          : data.loan_name || ""
    )
  );
  fields.push(fieldInput("item-currency", "Currency", data.currency || ""));

  if (kind === "accounts") {
    fields.push(
      el("label", { class: "item-field" }, [
        el("span", {}, "Type"),
        el(
          "select",
          { id: "item-type", class: "admin-input" },
          ACCOUNT_TYPES.map((t) =>
            el("option", { value: t, ...(data.account_type === t ? { selected: "selected" } : {}) }, titleCase(t))
          )
        ),
      ])
    );
  } else if (kind === "credit_cards") {
    fields.push(fieldInput("item-limit", "Credit limit", data.credit_limit ?? ""));
    fields.push(fieldInput("item-closing-day", "Statement closing day (1-31)", data.statement_closing_day ?? ""));
    fields.push(fieldInput("item-due-day", "Payment due day (1-31)", data.payment_due_day ?? ""));
  } else {
    fields.push(
      el("label", { class: "item-field" }, [
        el("span", {}, "Loan type"),
        el(
          "select",
          { id: "item-type", class: "admin-input" },
          LOAN_TYPES.map((t) =>
            el("option", { value: t, ...(data.loan_type === t ? { selected: "selected" } : {}) }, titleCase(t))
          )
        ),
      ])
    );
    fields.push(fieldInput("item-payment", "Monthly payment", data.monthly_payment ?? ""));
    fields.push(fieldInput("item-due-day", "Payment due day (1-31)", data.payment_due_day ?? ""));
    fields.push(fieldInput("item-term", "Term (months)", data.term_months ?? ""));
  }

  fields.push(fieldInput("item-notes", "Notes", data.notes || ""));

  return el("div", { class: "item-form" }, [
    el("h4", {}, `${mode === "add" ? "Add" : "Edit"} ${meta.label.slice(0, -1).toLowerCase()}`),
    el("div", { class: "item-form-grid" }, fields),
    el("div", { class: "admin-row" }, [
      el(
        "button",
        { class: "btn primary", disabled: admin.busy ? "" : null, onClick: () => saveItemForm() },
        "Save item"
      ),
      el("button", { class: "btn", disabled: admin.busy ? "" : null, onClick: () => closeItemForm() }, "Cancel"),
    ]),
  ]);
}

function renderConfigEditor() {
  return el("section", { class: "admin-card" }, [
    el("div", { class: "editor-head" }, [
      el("h3", { class: "admin-title" }, ["Edit config — ", el("code", {}, admin.editing)]),
      el("div", { class: "muted" }, `config/banks/${admin.editing}.md`),
    ]),
    el(
      "textarea",
      { id: "config-editor", class: "config-editor", spellcheck: "false" },
      admin.editingContent
    ),
    el("div", { class: "admin-row" }, [
      el(
        "button",
        { class: "btn primary", disabled: admin.busy ? "" : null, onClick: () => saveConfig() },
        "Save config"
      ),
      el("button", { class: "btn", disabled: admin.busy ? "" : null, onClick: () => closeEditor() }, "Back to list"),
    ]),
  ]);
}

/* ---------- App shell ---------- */

function renderNav() {
  return el("nav", { class: "topnav" }, [
    el("div", { class: "brand" }, "Bank Atlas"),
    el("div", { class: "navlinks" }, [
      el("a", { class: "navlink" + (state.route === "dashboard" ? " active" : ""), href: "#/" }, "Dashboard"),
      el("a", { class: "navlink" + (state.route === "admin" ? " active" : ""), href: "#/admin" }, "Admin"),
    ]),
  ]);
}

function renderDashboardInto(view) {
  if (state.error) {
    view.appendChild(
      el("div", {
        class: "error",
        html:
          "Could not load snapshot: " +
          state.error +
          "<br/><br/>Run <code>npm run build</code> (or use Admin &rarr; Rebuild), then reload.",
      })
    );
    return;
  }
  if (!state.snapshot) {
    view.appendChild(el("div", { class: "loading" }, "Loading snapshot…"));
    return;
  }
  [
    renderHeader(),
    renderTabs(),
    renderSummary(),
    renderCards(),
    renderUpcoming(),
    renderAccountsAndSpend(),
    renderNotes(),
    renderTransactions(),
  ].forEach((n) => n && view.appendChild(n));
}

function render() {
  const app = document.getElementById("app");
  app.innerHTML = "";
  const frag = document.createDocumentFragment();
  frag.appendChild(renderNav());
  const view = el("div", { class: "view" });
  if (state.route === "admin") renderAdminInto(view);
  else renderDashboardInto(view);
  frag.appendChild(view);
  app.appendChild(frag);
}

function setState(patch, keepFocus) {
  Object.assign(state, patch);
  const active = document.activeElement;
  const wasSearch = active && active.getAttribute && active.getAttribute("type") === "search";
  render();
  if (keepFocus && wasSearch) {
    const input = document.querySelector('input[type="search"]');
    if (input) {
      input.focus();
      const len = input.value.length;
      input.setSelectionRange(len, len);
    }
  }
}

async function loadDashboard() {
  try {
    state.error = null;
    const res = await fetch("/api/snapshot", { cache: "no-store" });
    if (!res.ok) {
      const msg = await res.json().catch(() => ({}));
      throw new Error(msg.error || `HTTP ${res.status}`);
    }
    state.snapshot = await res.json();
  } catch (err) {
    state.error = String(err.message || err);
  }
  if (state.route === "dashboard") render();
}

async function loadAdmin() {
  try {
    await loadBanks();
  } catch (err) {
    setNotice("error", String(err.message || err));
  }
  if (state.route === "admin") render();
}

function handleRoute() {
  const hash = (location.hash || "").replace(/^#/, "");
  state.route = hash.indexOf("admin") !== -1 ? "admin" : "dashboard";
  render();
  if (state.route === "admin") {
    if (admin.banks === null) loadAdmin();
  } else if (!state.snapshot && !state.error) {
    loadDashboard();
  }
}

window.addEventListener("hashchange", handleRoute);
handleRoute();
