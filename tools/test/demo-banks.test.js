import { test } from "node:test";
import assert from "node:assert/strict";
import { unlinkSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import http from "node:http";

import { getDemoBankDefinitions, DEMO_BANK_IDS } from "../lib/demo-banks-data.js";
import { startDemoBanks, stopDemoBanks } from "../lib/demo-banks-server.js";
import { seedDemoBanks } from "../lib/seed-demo-banks.js";
import { saveBankConfigsToDb, listBankConfigs } from "../lib/db.js";

test("demo bank definitions are distinct", () => {
  const banks = getDemoBankDefinitions();
  assert.equal(banks.length, 3);
  const ports = new Set(banks.map((b) => b.port));
  assert.equal(ports.size, 3);
  for (const id of DEMO_BANK_IDS) {
    const bank = banks.find((b) => b.id === id);
    assert.ok(bank, id);
    assert.ok(bank.input.accounts.length > 0 || bank.input.credit_cards.length > 0 || bank.input.loans.length > 0);
  }
  const savings = banks.find((b) => b.id === "demo-savings");
  const cards = banks.find((b) => b.id === "demo-cards");
  const loans = banks.find((b) => b.id === "demo-loans");
  assert.equal(savings.input.loans.length, 0);
  assert.ok(cards.input.credit_cards.length >= 2);
  assert.equal(cards.input.loans.length, 0);
  assert.equal(loans.input.credit_cards.length, 0);
  assert.ok(loans.input.loans.length >= 2);
});

test("saveBankConfigsToDb and listBankConfigs round-trip", () => {
  const dbPath = path.join(os.tmpdir(), `bank-atlas-banks-${Date.now()}.db`);
  try {
    const rows = getDemoBankDefinitions().map((b) => ({
      bank_id: b.id,
      bank_name: b.name,
      login_url: b.login_url,
      dashboard_url: b.dashboard_url,
      demo_port: b.port,
      is_demo: true,
      config_path: `config/banks/${b.id}.md`,
    }));
    const { count } = saveBankConfigsToDb(rows, dbPath);
    assert.equal(count, 3);
    const back = listBankConfigs(dbPath);
    assert.equal(back.length, 3);
    assert.equal(back[0].bank_id, "demo-cards");
    assert.equal(back.find((r) => r.bank_id === "demo-loans")?.demo_port, 5183);
    assert.equal(back.every((r) => r.is_demo), true);
  } finally {
    try {
      unlinkSync(dbPath);
    } catch {
      /* ignore */
    }
  }
});

test("seedDemoBanks writes files and database rows", async () => {
  const dbPath = path.join(os.tmpdir(), `bank-atlas-seed-${Date.now()}.db`);
  try {
    const result = await seedDemoBanks({ force: true, dbPath });
    assert.equal(result.db_count, 3);
    assert.equal(result.banks.length, 3);
    const listed = listBankConfigs(dbPath);
    assert.equal(listed.length, 3);
  } finally {
    try {
      unlinkSync(dbPath);
    } catch {
      /* ignore */
    }
  }
});

test("demo bank server serves login and dashboard", async () => {
  const banks = getDemoBankDefinitions();
  const port = 55181;
  const { servers } = await startDemoBanks({ ports: { "demo-savings": port } });
  try {
    const login = await fetchText(`http://127.0.0.1:${port}/login`);
    assert.match(login, /Atlas Savings/);
    assert.match(login, /demo\.user/);
    const dash = await fetchText(`http://127.0.0.1:${port}/home`);
    assert.match(dash, /Cuenta Ahorro Personal/);
    assert.match(dash, /\*\*\*\*2101/);
    assert.match(dash, /Visa Clasica/);
    assert.match(dash, /RD\$ 8,450\.00/);
  } finally {
    stopDemoBanks(servers);
  }
});

function fetchText(url) {
  return new Promise((resolve, reject) => {
    http
      .get(url, (res) => {
        let data = "";
        res.on("data", (c) => (data += c));
        res.on("end", () => resolve(data));
      })
      .on("error", reject);
  });
}
