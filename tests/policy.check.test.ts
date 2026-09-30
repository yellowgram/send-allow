import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  checkPolicyDocument,
  checkPolicyText,
  isPoisonAddress,
  policyReportOk,
} from "../src/policy/check.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

describe("policy:check", () => {
  it("flags poison placeholders", () => {
    expect(isPoisonAddress("0x1111111111111111111111111111111111111111")).toBe(
      true
    );
    expect(isPoisonAddress("0x0000000000000000000000000000000000000001")).toBe(
      false
    );
  });

  it("agent example is schema-valid and poison-labeled", () => {
    const text = readFileSync(join(root, "policy.agent.example.json"), "utf8");
    const report = checkPolicyText(text);
    expect(report.schemaErrors).toEqual([]);
    expect(report.poisons.length).toBeGreaterThan(0);
    expect(policyReportOk(report)).toBe(false);
  });

  it("clean fixture passes", () => {
    const text = readFileSync(
      join(root, "tests/fixtures/policy.clean.json"),
      "utf8"
    );
    const report = checkPolicyText(text);
    expect(policyReportOk(report)).toBe(true);
  });

  it("refuses allowAnyDestination while enabled", () => {
    const on = checkPolicyDocument({
      enabled: true,
      allowAnyDestination: true,
      destinations: {},
    });
    expect(on.sanityErrors.join(" ")).toMatch(/allowAnyDestination/);
  });
});
