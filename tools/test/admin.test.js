import { test } from "node:test";
import assert from "node:assert/strict";
import { promises as fs } from "node:fs";

import {
  isValidBankId,
  listBanks,
  getBankConfig,
  saveBankConfig,
  createBank,
  bankConfigPath,
  bankInputPath,
} from "../lib/admin.js";

test("isValidBankId accepts slugs and rejects traversal", () => {
  assert.equal(isValidBankId("banco-popular"), true);
  assert.equal(isValidBankId("bsc"), true);
  assert.equal(isValidBankId("../etc"), false);
  assert.equal(isValidBankId("Bad Id"), false);
  assert.equal(isValidBankId(""), false);
  assert.equal(isValidBankId(undefined), false);
});

test("listBanks includes the shipped example bank", async () => {
  const banks = await listBanks();
  const example = banks.find((b) => b.id === "example-bank");
  assert.ok(example, "example-bank should be listed");
  assert.equal(example.has_config, true);
  assert.equal(example.has_input, true);
  assert.equal(example.name, "Example Bank");
});

test("getBankConfig reads the profile markdown", async () => {
  const cfg = await getBankConfig("example-bank");
  assert.equal(cfg.exists, true);
  assert.match(cfg.content, /Bank Profile: Example Bank/);
});

test("getBankConfig rejects an invalid id", async () => {
  await assert.rejects(() => getBankConfig("../secret"), /invalid bank id/);
});

test("createBank + saveBankConfig round-trip and reflect in listBanks", async () => {
  const name = `ZZ Admin Test ${process.pid}`;
  const id = `zz-admin-test-${process.pid}`;
  const configPath = bankConfigPath(id);
  const inputPath = bankInputPath(id);
  try {
    const res = await createBank(name);
    assert.equal(res.id, id);
    assert.equal(res.created.length, 2, "should scaffold config + input");

    const banks = await listBanks();
    const found = banks.find((b) => b.id === id);
    assert.ok(found, "new bank should be listed");
    assert.equal(found.name, name);
    assert.equal(found.has_config, true);
    assert.equal(found.has_input, true);

    const marker = "## Custom section\n\n- Edited via admin API\n";
    const saved = await saveBankConfig(id, marker);
    assert.ok(saved.bytes > 0);

    const reread = await getBankConfig(id);
    assert.equal(reread.content, marker);
  } finally {
    await fs.rm(configPath, { force: true });
    await fs.rm(inputPath, { force: true });
  }
});

test("saveBankConfig refuses unknown banks and bad input", async () => {
  await assert.rejects(
    () => saveBankConfig(`zz-nope-${process.pid}`, "x"),
    /unknown bank/
  );
  await assert.rejects(() => saveBankConfig("example-bank", 123), /must be a string/);
});
