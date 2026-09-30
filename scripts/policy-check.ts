#!/usr/bin/env npx tsx
/**
 * Validate a policy JSON file (schema + poison placeholders + fence sanity).
 * Usage: npm run policy:check -- ./policy.json
 */
import { readFileSync } from "node:fs";
import {
  checkPolicyText,
  policyReportOk,
} from "../src/policy/check.js";

const path = process.argv[2];
if (!path) {
  console.error("usage: npm run policy:check -- <policy.json>");
  process.exit(2);
}

const text = readFileSync(path, "utf8");
const report = checkPolicyText(text);

for (const e of report.schemaErrors) console.error(`schema: ${e}`);
for (const e of report.sanityErrors) console.error(`sanity: ${e}`);
for (const p of report.poisons) console.error(`poison: ${p}`);

if (!policyReportOk(report)) {
  console.error(`policy:check FAIL — ${path}`);
  process.exit(1);
}
console.log(`policy:check OK — ${path}`);
