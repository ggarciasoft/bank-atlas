#!/usr/bin/env node
// bank-atlas command-line entrypoint. Zero dependencies.
//
//   node tools/cli.js build [--date YYYY-MM-DD]   Build output/ snapshot from input/banks/*.json
//   node tools/cli.js validate                    Validate input + built snapshot against the schema
//   node tools/cli.js audit                        Safety scan for secrets / unmasked numbers
//   node tools/cli.js review                        Print a read-only summary of the current snapshot
//   node tools/cli.js new-bank "<Bank Name>"       Scaffold a bank profile + input file

import { PATHS, listJson, readJson, exists } from "./lib/io.js";
import { build } from "./lib/build.js";
import { validateSnapshot, validateBank, partition } from "./lib/validate.js";
import { audit } from "./lib/audit.js";
import { review } from "./lib/review.js";
import { newBank } from "./lib/newbank.js";
import { ingestCsv } from "./lib/ingest.js";
import path from "node:path";

const GREEN = "\x1b[32m";
const RED = "\x1b[31m";
const YELLOW = "\x1b[33m";
const DIM = "\x1b[2m";
const RESET = "\x1b[0m";

function getFlag(args, name) {
  const i = args.indexOf(name);
  return i !== -1 && args[i + 1] ? args[i + 1] : null;
}

async function cmdBuild(args) {
  const date = getFlag(args, "--date");
  const { snapshot, files } = await build(date ? { snapshotDate: date } : {});
  console.log(`${GREEN}Built snapshot${RESET} for ${snapshot.snapshot_date} (${snapshot.banks.length} bank(s), partial: ${snapshot.partial}).`);
  for (const f of files) console.log(`  ${DIM}wrote${RESET} ${path.relative(PATHS.root, f)}`);

  const issues = validateSnapshot(snapshot);
  const { errors, warnings } = partition(issues);
  if (warnings.length) console.log(`${YELLOW}${warnings.length} warning(s)${RESET} — run \`npm run validate\` for details.`);
  if (errors.length) {
    console.log(`${RED}${errors.length} error(s) in built snapshot${RESET} — run \`npm run validate\`.`);
    process.exitCode = 1;
  }
}

async function cmdValidate() {
  const files = await listJson(PATHS.inputBanks);
  const allIssues = [];
  for (const f of files) {
    const bank = await readJson(f);
    allIssues.push(...validateBank(bank));
  }
  const snapPath = path.join(PATHS.output, "financial-snapshot.json");
  if (await exists(snapPath)) {
    const snap = await readJson(snapPath);
    allIssues.push(...validateSnapshot(snap));
  }

  const { errors, warnings } = partition(dedupe(allIssues));
  for (const w of warnings) console.log(`${YELLOW}warn${RESET}  ${w.where}: ${w.message}`);
  for (const e of errors) console.log(`${RED}error${RESET} ${e.where}: ${e.message}`);

  if (errors.length === 0 && warnings.length === 0) {
    console.log(`${GREEN}Validation passed${RESET} — ${files.length} bank input(s), no issues.`);
  } else {
    console.log(`\n${errors.length} error(s), ${warnings.length} warning(s).`);
  }
  if (errors.length) process.exitCode = 1;
}

async function cmdAudit() {
  const findings = await audit();
  const errors = findings.filter((f) => f.level === "error");
  const warnings = findings.filter((f) => f.level === "warning");
  for (const w of warnings) console.log(`${YELLOW}warn${RESET}  ${w.file}${w.line ? `:${w.line}` : ""}  ${w.message}`);
  for (const e of errors) console.log(`${RED}error${RESET} ${e.file}${e.line ? `:${e.line}` : ""}  ${e.message}`);

  if (findings.length === 0) {
    console.log(`${GREEN}Safety audit passed${RESET} — no secrets or unmasked numbers found.`);
  } else {
    console.log(`\n${errors.length} error(s), ${warnings.length} warning(s).`);
  }
  if (errors.length) process.exitCode = 1;
}

async function cmdReview() {
  console.log(await review());
}

async function cmdServe(args) {
  const portFlag = getFlag(args, "--port");
  const port = portFlag ? Number(portFlag) : 4173;
  const snapPath = path.join(PATHS.output, "financial-snapshot.json");
  if (!(await exists(snapPath))) {
    console.log(`${YELLOW}No snapshot found yet.${RESET} Run \`npm run build\` first — the page will show a friendly error until then.`);
  }
  const { loadWebConfig } = await import("./lib/web-config.js");
  const webConfig = await loadWebConfig();
  let excludeExampleBank = webConfig.exclude_example_bank !== false;
  if (args.includes("--include-example")) excludeExampleBank = false;
  const { serve } = await import("./lib/serve.js");
  const { url } = await serve({ port, excludeExampleBank });
  console.log(`${GREEN}Dashboard running${RESET} at ${url}`);
  console.log(`  ${DIM}serving${RESET} web/ + live output/finance.db (latest snapshot)`);
  if (excludeExampleBank) {
    console.log(`  ${DIM}example bank hidden${RESET} (set exclude_example_bank:false in config/web.json or pass --include-example)`);
  }
  console.log(`  ${DIM}stop with${RESET} Ctrl+C`);
}

async function cmdNewBank(args) {
  const name = args.find((a) => !a.startsWith("--"));
  if (!name) {
    console.error(`${RED}Usage:${RESET} node tools/cli.js new-bank "<Bank Name>"`);
    process.exitCode = 1;
    return;
  }
  const force = args.includes("--force");
  const res = await newBank(name, { force });
  if (res.created.length === 0) {
    console.log(`${YELLOW}Nothing created${RESET} — files for "${res.id}" already exist (use --force to overwrite).`);
    return;
  }
  console.log(`${GREEN}Scaffolded${RESET} bank "${res.id}":`);
  for (const f of res.created) console.log(`  ${path.relative(PATHS.root, f)}`);
}

async function cmdIngest(args) {
  const bankId = getFlag(args, "--bank");
  const file = getFlag(args, "--file");
  if (!bankId || !file) {
    console.error(`${RED}Usage:${RESET} node tools/cli.js ingest --bank <bank_id> --file <path.csv> [--name "Bank"] [--account ****1234] [--currency DOP]`);
    process.exitCode = 1;
    return;
  }
  const res = await ingestCsv({
    file,
    bankId,
    bankName: getFlag(args, "--name"),
    account: getFlag(args, "--account"),
    currency: getFlag(args, "--currency"),
    mapping: {
      date: getFlag(args, "--date-col"),
      description: getFlag(args, "--desc-col"),
      amount: getFlag(args, "--amount-col"),
      debit: getFlag(args, "--debit-col"),
      credit: getFlag(args, "--credit-col"),
      currency: getFlag(args, "--currency-col"),
    },
  });
  const usedCols = Object.entries(res.mapping)
    .filter(([, v]) => v)
    .map(([k, v]) => `${k}=${v}`)
    .join(", ");
  console.log(`${GREEN}Ingested${RESET} ${res.added} new transaction(s) into ${path.relative(PATHS.root, res.inputPath)} (${res.skipped} duplicate(s) skipped, ${res.total} parsed).`);
  console.log(`  ${DIM}columns:${RESET} ${usedCols}`);
  console.log(`  ${DIM}next:${RESET} npm run build`);
}

async function cmdDbSave() {
  const snapPath = path.join(PATHS.output, "financial-snapshot.json");
  if (!(await exists(snapPath))) {
    console.error(`${RED}No snapshot found.${RESET} Run \`npm run build\` first.`);
    process.exitCode = 1;
    return;
  }
  const snapshot = await readJson(snapPath);
  const { saveSnapshotToDb, DEFAULT_DB } = await import("./lib/db.js");
  const { counts } = saveSnapshotToDb(snapshot);
  console.log(`${GREEN}Saved snapshot${RESET} ${snapshot.snapshot_date} to ${path.relative(PATHS.root, DEFAULT_DB)} (build saves automatically; this re-syncs from JSON)`);
  console.log(`  ${DIM}rows:${RESET} accounts ${counts.accounts}, cards ${counts.credit_cards}, loans ${counts.loans}, transactions ${counts.transactions}`);
}

async function cmdDbList() {
  const { listSnapshots, DEFAULT_DB } = await import("./lib/db.js");
  if (!(await exists(DEFAULT_DB))) {
    console.error(`${RED}No history database.${RESET} Run \`npm run build\` first.`);
    process.exitCode = 1;
    return;
  }
  const snapshots = listSnapshots();
  if (snapshots.length === 0) {
    console.log("No snapshots recorded yet.");
    return;
  }
  console.log(`${snapshots.length} snapshot(s) in ${path.relative(PATHS.root, DEFAULT_DB)}:`);
  for (const s of snapshots) {
    const partial = s.partial ? ` ${YELLOW}partial${RESET}` : "";
    console.log(`  ${s.snapshot_date}  ${DIM}${s.generated_at || "—"}${RESET}${partial}`);
  }
}

async function cmdDbRead(args) {
  const { readSnapshotFromDb, readLatestSnapshotFromDb, listSnapshots, DEFAULT_DB } = await import("./lib/db.js");
  if (!(await exists(DEFAULT_DB))) {
    console.error(`${RED}No history database.${RESET} Run \`npm run build\` first.`);
    process.exitCode = 1;
    return;
  }
  const date = getFlag(args, "--date");
  const asJson = args.includes("--json");
  const snapshot = date ? readSnapshotFromDb(date) : readLatestSnapshotFromDb();
  if (!snapshot) {
    const hint = date
      ? `No snapshot for ${date}.`
      : "No snapshots recorded yet.";
    const dates = listSnapshots().map((s) => s.snapshot_date);
    console.error(`${RED}${hint}${RESET}${dates.length ? ` Available: ${dates.join(", ")}` : ""}`);
    process.exitCode = 1;
    return;
  }
  if (asJson) {
    console.log(JSON.stringify(snapshot, null, 2));
    return;
  }
  console.log(`${GREEN}Snapshot${RESET} ${snapshot.snapshot_date} (${snapshot.banks.length} bank(s), partial: ${snapshot.partial})`);
  const s = snapshot.summary || {};
  for (const row of s.cash_by_currency || []) {
    console.log(`  ${DIM}cash${RESET}     ${row.currency}  ${Number(row.total).toLocaleString("en-US")}`);
  }
  for (const row of s.credit_card_debt_by_currency || []) {
    console.log(`  ${DIM}cards${RESET}    ${row.currency}  ${Number(row.total).toLocaleString("en-US")}`);
  }
  for (const row of s.loan_debt_by_currency || []) {
    console.log(`  ${DIM}loans${RESET}    ${row.currency}  ${Number(row.total).toLocaleString("en-US")}`);
  }
}

async function cmdDb(args) {
  const sub = args[0];
  if (sub === "list") return cmdDbList();
  if (sub === "read") return cmdDbRead(args.slice(1));
  if (sub === "save" || !sub || sub.startsWith("--")) return cmdDbSave();
  console.error(`${RED}Unknown db subcommand:${RESET} ${sub}`);
  console.error(`  Use: db save | db list | db read [--date YYYY-MM-DD] [--json]`);
  process.exitCode = 1;
}

async function cmdItems(args) {
  const sub = args[0];
  if (sub === "sync") {
    const { syncItemsFromInputs } = await import("./lib/admin.js");
    const result = await syncItemsFromInputs();
    console.log(`${GREEN}Synced items registry${RESET} for ${result.banks_updated.length} bank(s):`);
    for (const id of result.banks_updated) console.log(`  ${id}`);
    return;
  }
  const bankId = sub && !sub.startsWith("--") && sub !== "list" ? sub : null;
  if (!bankId) {
    const { listBanks, getBankItems } = await import("./lib/admin.js");
    const banks = await listBanks();
    if (banks.length === 0) {
      console.log("No banks found.");
      return;
    }
    for (const b of banks) {
      let counts = "";
      try {
        const doc = await getBankItems(b.id);
        counts = ` — ${doc.accounts.length} account(s), ${doc.credit_cards.length} card(s), ${doc.loans.length} loan(s)`;
      } catch {
        counts = "";
      }
      console.log(`  ${b.id}${b.has_items ? "" : " (no registry yet)"}${counts}`);
    }
    return;
  }
  const { getBankItems } = await import("./lib/admin.js");
  const doc = await getBankItems(bankId);
  console.log(JSON.stringify(doc, null, 2));
}

async function cmdTrends() {
  const { getTrends, DEFAULT_DB } = await import("./lib/db.js");
  if (!(await exists(DEFAULT_DB))) {
    console.error(`${RED}No history database.${RESET} Run \`npm run build\` first.`);
    process.exitCode = 1;
    return;
  }
  const { dates, cash, cardDebt, loanDebt } = getTrends();
  if (dates.length === 0) {
    console.log("No snapshots recorded yet.");
    return;
  }
  const printSeries = (title, rows) => {
    console.log(`\n${title}`);
    if (rows.length === 0) {
      console.log("  (none)");
      return;
    }
    for (const r of rows) {
      console.log(`  ${r.snapshot_date}  ${r.currency}  ${Number(r.total).toLocaleString("en-US")}`);
    }
  };
  console.log(`History: ${dates.length} snapshot(s) — ${dates[0]} → ${dates[dates.length - 1]}`);
  printSeries("Cash available:", cash);
  printSeries("Credit card debt:", cardDebt);
  printSeries("Loan debt:", loanDebt);
}

function dedupe(issues) {
  const seen = new Set();
  const out = [];
  for (const i of issues) {
    const key = `${i.level}|${i.where}|${i.message}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(i);
  }
  return out;
}

function help() {
  console.log(`bank-atlas — read-only personal finance snapshot tools

Usage:
  node tools/cli.js build [--date YYYY-MM-DD]   Build output/ files from input/banks/*.json
  node tools/cli.js validate                     Check inputs + snapshot against the schema
  node tools/cli.js audit                        Safety scan (secrets, unmasked account numbers)
  node tools/cli.js review                        Print a read-only summary of the snapshot
  node tools/cli.js serve [--port 4173] [--include-example]  Serve the web dashboard (reads output/ live)
  node tools/cli.js new-bank "<Bank Name>"       Scaffold a bank profile + input file
  node tools/cli.js ingest --bank <id> --file <csv>   Import a statement CSV into input/banks/<id>.json
  node tools/cli.js db [save]                       Save the current snapshot into output/finance.db
  node tools/cli.js db list                         List snapshots stored in output/finance.db
  node tools/cli.js db read [--date YYYY-MM-DD] [--json]   Read a snapshot from output/finance.db
  node tools/cli.js items [list] [<bank_id>]               List or show the items registry (config/items/)
  node tools/cli.js items sync                             Seed config/items from input/banks/*.json
  node tools/cli.js trends                        Show cash/debt trends across recorded snapshots`);
}

async function main() {
  const [cmd, ...args] = process.argv.slice(2);
  switch (cmd) {
    case "build":
      return cmdBuild(args);
    case "validate":
      return cmdValidate();
    case "audit":
      return cmdAudit();
    case "review":
      return cmdReview();
    case "serve":
    case "web":
      return cmdServe(args);
    case "new-bank":
    case "newbank":
      return cmdNewBank(args);
    case "ingest":
      return cmdIngest(args);
    case "db":
      return cmdDb(args);
    case "items":
      return cmdItems(args);
    case "trends":
      return cmdTrends();
    case "help":
    case "--help":
    case "-h":
    case undefined:
      return help();
    default:
      console.error(`Unknown command: ${cmd}\n`);
      help();
      process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error(`${RED}Fatal:${RESET} ${err.message}`);
  process.exitCode = 1;
});
