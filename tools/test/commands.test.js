import { test } from "node:test";
import assert from "node:assert/strict";

import { runValidate, runAudit, runReview, runDbSave, runDbList, runTrends } from "../lib/commands.js";

test("runValidate returns structured issues", async () => {
  const res = await runValidate();
  assert.equal(res.command, "validate");
  assert.ok(Array.isArray(res.issues));
  assert.ok(typeof res.errors === "number");
  assert.ok(typeof res.warnings === "number");
});

test("runAudit returns structured findings", async () => {
  const res = await runAudit();
  assert.equal(res.command, "audit");
  assert.ok(Array.isArray(res.findings));
});

test("runReview returns text", async () => {
  const res = await runReview();
  assert.equal(res.command, "review");
  assert.match(res.text, /Financial review|No snapshot found/);
});

test("runDbSave, runDbList, and runTrends round-trip", async () => {
  try {
    const saved = await runDbSave();
    if (!saved.ok) {
      assert.match(saved.error || "", /No snapshot found/);
      return;
    }
    assert.equal(saved.command, "db");
    assert.ok(saved.snapshot_date);
    assert.ok(saved.counts);

    const list = runDbList();
    assert.equal(list.ok, true);
    assert.ok(list.snapshots.length >= 1);

    const trends = runTrends();
    assert.equal(trends.ok, true);
    assert.ok(trends.snapshots >= 1);
  } finally {
    /* uses workspace output/finance.db — no cleanup */
  }
});
