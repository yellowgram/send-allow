import { describe, it, expect } from "vitest";
import { evaluateSpendPolicy } from "../src/policy/evaluate.js";
import {
  defaultSpendPolicy,
  type SpendPolicyConfig,
} from "../src/types.js";
import { FAKE_TO, OTHER_TO } from "./fixtures.js";

function enabled(partial: {
  destMap?: Map<string, { maxNativeWei?: bigint }>;
  globalMaxNativeWei?: bigint;
  allowContractCreation?: boolean;
  allowAnyDestination?: boolean;
} = {}): SpendPolicyConfig {
  const p = defaultSpendPolicy();
  p.enabled = true;
  p.destinations =
    partial.destMap ?? new Map([[FAKE_TO.toLowerCase(), {}]]);
  if (partial.globalMaxNativeWei !== undefined) {
    p.globalMaxNativeWei = partial.globalMaxNativeWei;
  }
  if (partial.allowContractCreation !== undefined) {
    p.allowContractCreation = partial.allowContractCreation;
  }
  if (partial.allowAnyDestination !== undefined) {
    p.allowAnyDestination = partial.allowAnyDestination;
  }
  return p;
}

describe("evaluateSpendPolicy — allow / deny / value-cap", () => {
  it("allows when policy disabled", () => {
    const off = defaultSpendPolicy();
    off.enabled = false;
    const r = evaluateSpendPolicy(off, { to: OTHER_TO, value: 1n });
    expect(r.allow).toBe(true);
  });

  it("denies unknown destination when enabled", () => {
    const r = evaluateSpendPolicy(enabled(), {
      to: OTHER_TO,
      value: 0n,
    });
    expect(r.allow).toBe(false);
    expect(r.code).toBe("DESTINATION_NOT_ALLOWLISTED");
  });

  it("allows allowlisted destination under cap", () => {
    const r = evaluateSpendPolicy(
      enabled({
        destMap: new Map([
          [FAKE_TO.toLowerCase(), { maxNativeWei: 1_000_000n }],
        ]),
        globalMaxNativeWei: 2_000_000n,
      }),
      { to: FAKE_TO, value: 500n }
    );
    expect(r.allow).toBe(true);
    expect(r.effectiveTo).toBe(FAKE_TO.toLowerCase());
  });

  it("denies when value exceeds per-destination cap", () => {
    const r = evaluateSpendPolicy(
      enabled({
        destMap: new Map([
          [FAKE_TO.toLowerCase(), { maxNativeWei: 100n }],
        ]),
      }),
      { to: FAKE_TO, value: 101n }
    );
    expect(r.allow).toBe(false);
    expect(r.code).toBe("OVER_CAP");
  });

  it("denies when value exceeds global cap even if dest allows", () => {
    const r = evaluateSpendPolicy(
      enabled({
        destMap: new Map([
          [FAKE_TO.toLowerCase(), { maxNativeWei: 10_000n }],
        ]),
        globalMaxNativeWei: 50n,
      }),
      { to: FAKE_TO, value: 51n }
    );
    expect(r.allow).toBe(false);
    expect(r.code).toBe("OVER_CAP");
  });

  it("denies contract creation by default", () => {
    const r = evaluateSpendPolicy(enabled(), { value: 0n });
    expect(r.allow).toBe(false);
    expect(r.code).toBe("CONTRACT_CREATE_DENIED");
  });

  it("allows contract creation when configured", () => {
    const r = evaluateSpendPolicy(
      enabled({ allowContractCreation: true }),
      { value: 0n }
    );
    expect(r.allow).toBe(true);
  });
});
