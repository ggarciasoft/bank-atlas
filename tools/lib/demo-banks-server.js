// Local HTTP servers for the three demo banks (one port each).

import http from "node:http";

import { getDemoBankDefinitions } from "./demo-banks-data.js";
import { renderLoginPage, renderDashboardPage, renderForbiddenPage } from "./demo-banks-pages.js";

const MIME = { ".html": "text/html; charset=utf-8" };

/**
 * @param {import("./demo-banks-data.js").DemoBank} bank
 * @param {import("node:http").IncomingMessage} req
 * @param {import("node:http").ServerResponse} res
 */
function handleDemoRequest(bank, req, res) {
  const url = new URL(req.url || "/", `http://127.0.0.1:${bank.port}`);
  const path = url.pathname.replace(/\/+$/, "") || "/";

  let html = null;
  let status = 200;

  if (path === "/" || path === "/login") {
    html = renderLoginPage(bank);
  } else if (path === "/home" || path === "/dashboard") {
    html = renderDashboardPage(bank);
  } else if (["/transfer", "/pay", "/beneficiaries", "/apply", "/settings", "/card-controls"].includes(path)) {
    html = renderForbiddenPage(bank, "Acción no permitida");
    status = 403;
  } else {
    html = `<!DOCTYPE html><html><body><h1>404</h1><p><a href="/login">Login</a></p></body></html>`;
    status = 404;
  }

  res.writeHead(status, { "content-type": MIME[".html"], "cache-control": "no-store" });
  res.end(html);
}

/**
 * Start demo bank servers (bind 127.0.0.1 only).
 * @param {{ ports?: Record<string, number> }} [opts]
 * @returns {Promise<{ servers: import("node:http").Server[], banks: { id: string, name: string, port: number, login_url: string, dashboard_url: string }[] }>}
 */
export function startDemoBanks(opts = {}) {
  const banks = getDemoBankDefinitions();
  const servers = [];

  for (const bank of banks) {
    const port = opts.ports?.[bank.id] ?? bank.port;
    const bound = { ...bank, port, login_url: `http://127.0.0.1:${port}/login`, dashboard_url: `http://127.0.0.1:${port}/home` };
    const server = http.createServer((req, res) => handleDemoRequest(bound, req, res));
    server.listen(port, "127.0.0.1");
    servers.push(server);
  }

  return Promise.resolve({
    servers,
    banks: banks.map((b) => {
      const port = opts.ports?.[b.id] ?? b.port;
      return {
        id: b.id,
        name: b.name,
        port,
        login_url: `http://127.0.0.1:${port}/login`,
        dashboard_url: `http://127.0.0.1:${port}/home`,
      };
    }),
  });
}

/**
 * Stop all demo bank servers.
 * @param {import("node:http").Server[]} servers
 */
export function stopDemoBanks(servers) {
  for (const s of servers) {
    try {
      s.close();
    } catch {
      /* ignore */
    }
  }
}
