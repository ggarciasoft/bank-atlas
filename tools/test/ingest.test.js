import { test } from "node:test";
import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";

import { parseCsv, parseCsvRecords } from "../lib/csvparse.js";
import { ingestCsv } from "../lib/ingest.js";
import { PATHS } from "../lib/io.js";

test("parseCsv handles quotes, escaped quotes, and CRLF", () => {
  const rows = parseCsv('a,b\r\n"x,y","he said ""hi"""\r\n');
  assert.deepEqual(rows, [
    ["a", "b"],
    ["x,y", 'he said "hi"'],
  ]);
});

test("parseCsvRecords keys by header and skips blank lines", () => {
  const { headers, records } = parseCsvRecords("Date,Amount\n2026-07-01,100\n\n2026-07-02,200\n");
  assert.deepEqual(headers, ["Date", "Amount"]);
  assert.equal(records.length, 2);
  assert.equal(records[1].Amount, "200");
});

test("ingestCsv maps debit/credit columns and dedups", async () => {
  const tmp = path.join(os.tmpdir(), `atlas-stmt-${Date.now()}.csv`);
  await fs.writeFile(
    tmp,
    "Fecha,Concepto,Debito,Credito,Moneda\n2026-07-05,COMPRA,3500.00,,DOP\n2026-07-02,SALARIO,,85000.00,DOP\n",
    "utf8"
  );
  const bankId = `zz-test-${process.pid}`;
  const inputPath = path.join(PATHS.inputBanks, `${bankId}.json`);
  try {
    const first = await ingestCsv({ file: tmp, bankId, bankName: "ZZ Test" });
    assert.equal(first.added, 2);
    assert.equal(first.mapping.debit, "Debito");
    assert.equal(first.mapping.credit, "Credito");

    const saved = JSON.parse(await fs.readFile(inputPath, "utf8"));
    const compra = saved.transactions.find((t) => t.description === "COMPRA");
    const salario = saved.transactions.find((t) => t.description === "SALARIO");
    assert.equal(compra.direction, "debit");
    assert.equal(compra.amount, 3500);
    assert.equal(salario.direction, "credit");
    assert.equal(salario.currency, "DOP");

    const second = await ingestCsv({ file: tmp, bankId });
    assert.equal(second.added, 0, "re-ingest should skip duplicates");
    assert.equal(second.skipped, 2);
  } finally {
    await fs.rm(tmp, { force: true });
    await fs.rm(inputPath, { force: true });
  }
});
