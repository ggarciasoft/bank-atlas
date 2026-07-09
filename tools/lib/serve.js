// Local static + snapshot server for the web dashboard, plus a small local
// administration API.
//
//   GET  /api/snapshot            read latest snapshot from output/finance.db
//   GET  /api/history             list snapshots in output/finance.db
//   GET  /api/history/<date>      read one snapshot from output/finance.db
//   GET  /api/banks               list banks (config profiles + input files)
//   POST /api/banks               scaffold a new bank { name }
//   GET  /api/banks/<id>/config   read config/banks/<id>.md
//   PUT  /api/banks/<id>/config   write config/banks/<id>.md { content }
//   POST /api/build               regenerate output/ from current inputs
//   POST /api/validate            validate inputs + snapshot
//   POST /api/audit               safety scan
//   GET  /api/review              read-only snapshot summary
//   POST /api/db                  save current snapshot into output/finance.db
//   GET  /api/trends              cash/debt trends from output/finance.db
//
// The admin routes write to config/ and input/ on this machine (the same files
// the CLI edits). They never touch a browser or a bank. No external
// dependencies — just Node's http/fs modules. Binds to 127.0.0.1 by default.

import http from "node:http";
import { promises as fs } from "node:fs";
import path from "node:path";
import { PATHS, exists } from "./io.js";
import {
  listBanks,
  getBankConfig,
  saveBankConfig,
  createBank,
  isValidBankId,
} from "./admin.js";
import { filterSnapshotForFrontend } from "./filter-snapshot.js";

const WEB_DIR = path.join(PATHS.root, "web");
const SNAPSHOT = path.join(PATHS.output, "financial-snapshot.json");
const HISTORY_DB = path.join(PATHS.output, "finance.db");

/** @type {{ excludeExampleBank: boolean }} */
let dashboardOptions = { excludeExampleBank: true };

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
};

function sendJson(res, status, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
  });
  res.end(body);
}

/** Read and JSON-parse a request body (small, local requests only). */
function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (chunk) => {
      data += chunk;
      if (data.length > 1_000_000) {
        reject(new Error("request body too large"));
        req.destroy();
      }
    });
    req.on("end", () => {
      if (!data.trim()) return resolve({});
      try {
        resolve(JSON.parse(data));
      } catch {
        reject(new Error("invalid JSON body"));
      }
    });
    req.on("error", reject);
  });
}

const rel = (p) => path.relative(PATHS.root, p);

/** Resolve a URL path to a file inside web/, blocking traversal. */
function resolveStatic(urlPath) {
  const clean = decodeURIComponent(urlPath.split("?")[0]);
  const rel = clean === "/" ? "index.html" : clean.replace(/^\/+/, "");
  const full = path.join(WEB_DIR, rel);
  const normalized = path.normalize(full);
  if (!normalized.startsWith(WEB_DIR)) return null;
  return normalized;
}

async function loadLatestSnapshot() {
  if (await exists(HISTORY_DB)) {
    const { readLatestSnapshotFromDb } = await import("./db.js");
    const fromDb = readLatestSnapshotFromDb();
    if (fromDb) return fromDb;
  }
  if (await exists(SNAPSHOT)) {
    const raw = await fs.readFile(SNAPSHOT, "utf8");
    return JSON.parse(raw);
  }
  return null;
}

async function serveSnapshot(res) {
  const snapshot = await loadLatestSnapshot();
  if (!snapshot) {
    return sendJson(res, 404, {
      error: "no snapshot found — run `npm run build` first",
    });
  }
  const filtered = filterSnapshotForFrontend(snapshot, {
    excludeExampleBank: dashboardOptions.excludeExampleBank,
  });
  res.writeHead(200, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
  });
  return res.end(JSON.stringify(filtered));
}

async function serveHistorySnapshot(res, snapshotDate) {
  if (!(await exists(HISTORY_DB))) {
    return sendJson(res, 404, {
      error: "no history database — run `npm run build` first",
    });
  }
  const { readSnapshotFromDb } = await import("./db.js");
  const snapshot = readSnapshotFromDb(snapshotDate);
  if (!snapshot) {
    return sendJson(res, 404, { error: `no snapshot for ${snapshotDate}` });
  }
  const filtered = filterSnapshotForFrontend(snapshot, {
    excludeExampleBank: dashboardOptions.excludeExampleBank,
  });
  res.writeHead(200, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
  });
  return res.end(JSON.stringify(filtered));
}

/** Admin API. Returns true if the request was handled. */
async function handleApi(req, res, pathname, method) {
  if (pathname === "/api/snapshot") {
    if (method !== "GET" && method !== "HEAD") {
      sendJson(res, 405, { error: "method not allowed" });
      return true;
    }
    await serveSnapshot(res);
    return true;
  }

  if (pathname === "/api/history") {
    if (method !== "GET" && method !== "HEAD") {
      sendJson(res, 405, { error: "method not allowed" });
      return true;
    }
    if (!(await exists(HISTORY_DB))) {
      return sendJson(res, 200, { snapshots: [] });
    }
    const { listSnapshots } = await import("./db.js");
    sendJson(res, 200, { snapshots: listSnapshots() });
    return true;
  }

  const historyMatch = pathname.match(/^\/api\/history\/([^/]+)$/);
  if (historyMatch) {
    if (method !== "GET" && method !== "HEAD") {
      sendJson(res, 405, { error: "method not allowed" });
      return true;
    }
    await serveHistorySnapshot(res, decodeURIComponent(historyMatch[1]));
    return true;
  }

  if (pathname === "/api/banks") {
    if (method === "GET") {
      sendJson(res, 200, { banks: await listBanks() });
      return true;
    }
    if (method === "POST") {
      try {
        const body = await readJsonBody(req);
        const result = await createBank(body.name, { force: !!body.force });
        sendJson(res, result.created.length ? 201 : 200, {
          id: result.id,
          created: result.created.map(rel),
        });
      } catch (err) {
        sendJson(res, 400, { error: err.message });
      }
      return true;
    }
    sendJson(res, 405, { error: "method not allowed" });
    return true;
  }

  const configMatch = pathname.match(/^\/api\/banks\/([^/]+)\/config$/);
  if (configMatch) {
    const id = decodeURIComponent(configMatch[1]);
    if (!isValidBankId(id)) {
      sendJson(res, 400, { error: "invalid bank id" });
      return true;
    }
    if (method === "GET") {
      sendJson(res, 200, await getBankConfig(id));
      return true;
    }
    if (method === "PUT" || method === "POST") {
      try {
        const body = await readJsonBody(req);
        const saved = await saveBankConfig(id, body.content);
        sendJson(res, 200, { ok: true, id: saved.id, path: rel(saved.path), bytes: saved.bytes });
      } catch (err) {
        sendJson(res, 400, { error: err.message });
      }
      return true;
    }
    sendJson(res, 405, { error: "method not allowed" });
    return true;
  }

  if (pathname === "/api/build") {
    if (method !== "POST") {
      sendJson(res, 405, { error: "method not allowed" });
      return true;
    }
    try {
      const { build } = await import("./build.js");
      const { snapshot, files } = await build();
      sendJson(res, 200, {
        ok: true,
        command: "build",
        snapshot_date: snapshot.snapshot_date,
        banks: snapshot.banks.length,
        partial: snapshot.partial,
        files: files.map(rel),
      });
    } catch (err) {
      sendJson(res, 500, { error: err.message });
    }
    return true;
  }

  if (pathname === "/api/validate") {
    if (method !== "POST") {
      sendJson(res, 405, { error: "method not allowed" });
      return true;
    }
    try {
      const { runValidate } = await import("./commands.js");
      sendJson(res, 200, await runValidate());
    } catch (err) {
      sendJson(res, 500, { error: err.message });
    }
    return true;
  }

  if (pathname === "/api/audit") {
    if (method !== "POST") {
      sendJson(res, 405, { error: "method not allowed" });
      return true;
    }
    try {
      const { runAudit } = await import("./commands.js");
      sendJson(res, 200, await runAudit());
    } catch (err) {
      sendJson(res, 500, { error: err.message });
    }
    return true;
  }

  if (pathname === "/api/review") {
    if (method !== "GET" && method !== "HEAD") {
      sendJson(res, 405, { error: "method not allowed" });
      return true;
    }
    try {
      const { runReview } = await import("./commands.js");
      sendJson(res, 200, await runReview());
    } catch (err) {
      sendJson(res, 500, { error: err.message });
    }
    return true;
  }

  if (pathname === "/api/db") {
    if (method !== "POST") {
      sendJson(res, 405, { error: "method not allowed" });
      return true;
    }
    try {
      const { runDbSave } = await import("./commands.js");
      const result = await runDbSave();
      sendJson(res, result.ok ? 200 : 400, result);
    } catch (err) {
      sendJson(res, 500, { error: err.message });
    }
    return true;
  }

  if (pathname === "/api/trends") {
    if (method !== "GET" && method !== "HEAD") {
      sendJson(res, 405, { error: "method not allowed" });
      return true;
    }
    try {
      const { runTrends } = await import("./commands.js");
      const result = runTrends();
      sendJson(res, result.ok ? 200 : 404, result);
    } catch (err) {
      sendJson(res, 500, { error: err.message });
    }
    return true;
  }

  return false;
}

async function handle(req, res) {
  const url = req.url || "/";
  const method = req.method || "GET";
  const pathname = url.split("?")[0];

  if (pathname.startsWith("/api/")) {
    const handled = await handleApi(req, res, pathname, method);
    if (handled) return;
    return sendJson(res, 404, { error: "not found" });
  }

  // Static files are read-only.
  if (method !== "GET" && method !== "HEAD") {
    return sendJson(res, 405, { error: "method not allowed" });
  }

  const file = resolveStatic(url);
  if (!file) return sendJson(res, 403, { error: "forbidden" });

  try {
    const data = await fs.readFile(file);
    const ext = path.extname(file).toLowerCase();
    res.writeHead(200, {
      "content-type": MIME[ext] || "application/octet-stream",
      "cache-control": "no-store",
    });
    res.end(method === "HEAD" ? undefined : data);
  } catch {
    sendJson(res, 404, { error: "not found" });
  }
}

/**
 * Start the dashboard server.
 * @param {{ port?: number, host?: string, excludeExampleBank?: boolean }} [opts]
 * @returns {Promise<{ url: string, close: () => void }>}
 */
export function serve({ port = 4173, host = "127.0.0.1", excludeExampleBank = true } = {}) {
  dashboardOptions = { excludeExampleBank };
  const server = http.createServer((req, res) => {
    handle(req, res).catch((err) => sendJson(res, 500, { error: err.message }));
  });
  return new Promise((resolve, reject) => {
    server.on("error", reject);
    server.listen(port, host, () => {
      const addr = server.address();
      const boundPort = typeof addr === "object" && addr ? addr.port : port;
      resolve({
        url: `http://${host}:${boundPort}/`,
        close: () => server.close(),
      });
    });
  });
}
