// HTML generators for local demo bank pages (login + dashboard).

function fmtMoney(amount, currency) {
  const n = Number(amount);
  const formatted = n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (currency === "USD") return `US$ ${formatted}`;
  return `RD$ ${formatted}`;
}

function themeVars(theme) {
  if (theme === "purple") {
    return {
      primary: "#6d28d9",
      primaryDark: "#5b21b6",
      accent: "#a78bfa",
      bg: "#f5f3ff",
      card: "#ffffff",
      text: "#1e1b4b",
    };
  }
  if (theme === "blue") {
    return {
      primary: "#1d4ed8",
      primaryDark: "#1e40af",
      accent: "#60a5fa",
      bg: "#eff6ff",
      card: "#ffffff",
      text: "#1e3a8a",
    };
  }
  return {
    primary: "#15803d",
    primaryDark: "#166534",
    accent: "#4ade80",
    bg: "#f0fdf4",
    card: "#ffffff",
    text: "#14532d",
  };
}

function baseStyles(theme) {
  const c = themeVars(theme);
  return `
    :root { --primary: ${c.primary}; --primary-dark: ${c.primaryDark}; --accent: ${c.accent}; --bg: ${c.bg}; --card: ${c.card}; --text: ${c.text}; }
    * { box-sizing: border-box; }
    body { margin: 0; font-family: "Segoe UI", system-ui, sans-serif; background: var(--bg); color: var(--text); }
    header { background: var(--primary); color: #fff; padding: 1rem 1.5rem; display: flex; justify-content: space-between; align-items: center; }
    header h1 { margin: 0; font-size: 1.25rem; }
    header nav a { color: #fff; margin-left: 1rem; text-decoration: none; opacity: 0.9; }
    main { max-width: 960px; margin: 1.5rem auto; padding: 0 1rem 2rem; }
    .card { background: var(--card); border-radius: 10px; padding: 1.25rem; margin-bottom: 1rem; box-shadow: 0 1px 4px rgba(0,0,0,.08); }
    h2 { margin: 0 0 1rem; font-size: 1.1rem; }
    table { width: 100%; border-collapse: collapse; font-size: 0.95rem; }
    th, td { text-align: left; padding: 0.55rem 0.4rem; border-bottom: 1px solid #e5e7eb; }
    th { font-weight: 600; color: #374151; }
    .amount { font-variant-numeric: tabular-nums; white-space: nowrap; }
    .login-wrap { max-width: 380px; margin: 4rem auto; }
    .login-wrap label { display: block; margin: 0.75rem 0 0.25rem; font-weight: 600; }
    .login-wrap input { width: 100%; padding: 0.6rem; border: 1px solid #d1d5db; border-radius: 6px; font-size: 1rem; }
    .btn { display: inline-block; margin-top: 1rem; padding: 0.65rem 1.25rem; background: var(--primary); color: #fff; border: none; border-radius: 6px; font-size: 1rem; cursor: pointer; text-decoration: none; }
    .btn:hover { background: var(--primary-dark); }
    .badge { display: inline-block; background: var(--accent); color: var(--text); padding: 0.15rem 0.5rem; border-radius: 999px; font-size: 0.75rem; font-weight: 600; }
    .empty { color: #6b7280; font-style: italic; }
  `;
}

/** @param {import("./demo-banks-data.js").DemoBank} bank */
export function renderLoginPage(bank) {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${bank.name} — Iniciar sesión</title>
  <style>${baseStyles(bank.theme)}</style>
</head>
<body>
  <header><h1>${bank.name}</h1><span class="badge">DEMO</span></header>
  <main>
    <div class="card login-wrap">
      <h2>Iniciar sesión</h2>
      <form action="/home" method="get">
        <label for="user">Usuario</label>
        <input id="user" name="user" type="text" value="demo.user" autocomplete="username" />
        <label for="pass">Contraseña</label>
        <input id="pass" name="pass" type="password" value="demo-password" autocomplete="current-password" />
        <button class="btn" type="submit">Entrar</button>
      </form>
    </div>
  </main>
</body>
</html>`;
}

function accountsTable(accounts) {
  if (!accounts.length) return '<p class="empty">No hay cuentas.</p>';
  const rows = accounts
    .map(
      (a) => `<tr>
        <td>${a.account_name}</td>
        <td>${a.account_id_masked}</td>
        <td>${a.account_type}</td>
        <td>${a.currency}</td>
        <td class="amount">${fmtMoney(a.available_balance, a.currency)}</td>
        <td class="amount">${fmtMoney(a.current_balance, a.currency)}</td>
      </tr>`
    )
    .join("");
  return `<table>
    <thead><tr><th>Cuenta</th><th>Número</th><th>Tipo</th><th>Moneda</th><th>Disponible</th><th>Saldo actual</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>`;
}

function cardsTable(cards) {
  if (!cards.length) return '<p class="empty">No hay tarjetas de crédito.</p>';
  const rows = cards
    .map(
      (c) => `<tr>
        <td>${c.card_name}</td>
        <td>${c.card_id_masked}</td>
        <td>${c.currency}</td>
        <td class="amount">${fmtMoney(c.current_balance, c.currency)}</td>
        <td class="amount">${fmtMoney(c.statement_balance, c.currency)}</td>
        <td class="amount">${fmtMoney(c.minimum_payment, c.currency)}</td>
        <td>${c.due_date || "—"}</td>
        <td class="amount">${fmtMoney(c.available_credit, c.currency)}</td>
        <td class="amount">${fmtMoney(c.credit_limit, c.currency)}</td>
      </tr>`
    )
    .join("");
  return `<table>
    <thead><tr><th>Tarjeta</th><th>Número</th><th>Moneda</th><th>Saldo actual</th><th>Estado de cuenta</th><th>Pago mínimo</th><th>Fecha límite</th><th>Crédito disponible</th><th>Límite</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>`;
}

function loansTable(loans) {
  if (!loans.length) return '<p class="empty">No hay préstamos.</p>';
  const rows = loans
    .map(
      (l) => `<tr>
        <td>${l.loan_name}</td>
        <td>${l.loan_id_masked}</td>
        <td>${l.loan_type}</td>
        <td>${l.currency}</td>
        <td class="amount">${fmtMoney(l.remaining_balance, l.currency)}</td>
        <td class="amount">${fmtMoney(l.monthly_payment, l.currency)}</td>
        <td>${l.next_due_date || "—"}</td>
      </tr>`
    )
    .join("");
  return `<table>
    <thead><tr><th>Préstamo</th><th>Número</th><th>Tipo</th><th>Moneda</th><th>Saldo pendiente</th><th>Cuota mensual</th><th>Próximo pago</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>`;
}

function transactionsTable(transactions) {
  if (!transactions.length) return '<p class="empty">No hay movimientos recientes.</p>';
  const rows = transactions
    .map(
      (t) => `<tr>
        <td>${t.date}</td>
        <td>${t.account_id_masked}</td>
        <td>${t.description}</td>
        <td>${t.direction === "credit" ? "Crédito" : "Débito"}</td>
        <td class="amount">${fmtMoney(t.amount, t.currency)}</td>
        <td>${t.currency}</td>
      </tr>`
    )
    .join("");
  return `<table>
    <thead><tr><th>Fecha</th><th>Cuenta</th><th>Descripción</th><th>Tipo</th><th>Monto</th><th>Moneda</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>`;
}

/** @param {import("./demo-banks-data.js").DemoBank} bank */
export function renderDashboardPage(bank) {
  const data = bank.input;
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${bank.name} — Resumen de cuenta</title>
  <style>${baseStyles(bank.theme)}</style>
</head>
<body>
  <header>
    <h1>${bank.name}</h1>
    <nav>
      <a href="/home">Resumen</a>
      <a href="/login">Cerrar sesión</a>
    </nav>
  </header>
  <main>
    <div class="card">
      <h2>Cuentas de ahorro y corriente</h2>
      ${accountsTable(data.accounts)}
    </div>
    <div class="card">
      <h2>Tarjetas de crédito</h2>
      ${cardsTable(data.credit_cards)}
    </div>
    <div class="card">
      <h2>Préstamos</h2>
      ${loansTable(data.loans)}
    </div>
    <div class="card">
      <h2>Movimientos recientes</h2>
      ${transactionsTable(data.transactions)}
    </div>
  </main>
</body>
</html>`;
}

/** @param {import("./demo-banks-data.js").DemoBank} bank */
export function renderForbiddenPage(bank, title) {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <title>${bank.name} — ${title}</title>
  <style>${baseStyles(bank.theme)}</style>
</head>
<body>
  <header><h1>${bank.name}</h1></header>
  <main><div class="card"><h2>${title}</h2><p class="empty">Página de demostración — no usar en extracción.</p></div></main>
</body>
</html>`;
}
