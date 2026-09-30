import { readFileSync } from "node:fs";
import { getAddress, parseEther } from "viem";
import { checkPolicyDocument, listPoisonAddresses } from "./check.js";
import {
  defaultSpendPolicy,
  type DestinationPolicy,
  type SpendPolicyConfig,
} from "../types.js";

function env(key: string, fallback?: string): string | undefined {
  const v = process.env[key];
  if (v !== undefined && v !== "") return v;
  return fallback;
}

function boolEnv(key: string, fallback: boolean): boolean {
  const v = process.env[key];
  if (v === undefined || v === "") return fallback;
  return ["1", "true", "yes", "on"].includes(v.toLowerCase());
}

function normKey(addr: string): string {
  try {
    return getAddress(addr).toLowerCase();
  } catch {
    return addr.toLowerCase();
  }
}

function parseWei(
  wei?: string | number | null,
  eth?: string | number | null,
  label = "cap"
): bigint | undefined {
  const hasWei = wei !== undefined && wei !== null && `${wei}` !== "";
  const hasEth = eth !== undefined && eth !== null && `${eth}` !== "";
  if (hasWei && hasEth) {
    throw new Error(
      `Send Allow policy: set only one of ${label} Wei / Eth, not both`
    );
  }
  if (hasWei) return BigInt(`${wei}`);
  if (hasEth) return parseEther(`${eth}`);
  return undefined;
}

function parseDestinations(
  raw:
    | Record<
        string,
        { maxNativeWei?: string | number; maxNativeEth?: string | number }
      >
    | undefined
): Map<string, DestinationPolicy> {
  const map = new Map<string, DestinationPolicy>();
  if (!raw) return map;
  for (const [addr, entry] of Object.entries(raw)) {
    const key = normKey(addr);
    const maxNativeWei = parseWei(
      entry?.maxNativeWei,
      entry?.maxNativeEth,
      `destinations[${addr}]`
    );
    map.set(key, {
      ...(maxNativeWei !== undefined ? { maxNativeWei } : {}),
    });
  }
  return map;
}

interface PolicyFileJson {
  enabled?: boolean;
  allowContractCreation?: boolean;
  allowAnyDestination?: boolean;
  globalMaxNativeWei?: string | number;
  globalMaxNativeEth?: string | number;
  destinations?: Record<
    string,
    { maxNativeWei?: string | number; maxNativeEth?: string | number }
  >;
}

function loadFile(path: string): PolicyFileJson {
  let text: string;
  try {
    text = readFileSync(path, "utf8");
  } catch (err) {
    throw new Error(
      `Failed to load SEND_ALLOW_POLICY_FILE=${path}: ${err instanceof Error ? err.message : String(err)}. Refusing to start — policy will not silently disable.`
    );
  }
  let json: unknown;
  try {
    json = JSON.parse(text) as unknown;
  } catch (err) {
    throw new Error(
      `Invalid JSON in SEND_ALLOW_POLICY_FILE=${path}: ${err instanceof Error ? err.message : String(err)}. Refusing to start.`
    );
  }
  const report = checkPolicyDocument(json);
  if (report.schemaErrors.length > 0) {
    throw new Error(
      `Invalid SEND_ALLOW_POLICY_FILE=${path}: ${report.schemaErrors.join("; ")}. Refusing to start.`
    );
  }
  return json as PolicyFileJson;
}

/**
 * Load policy from file + env.
 * Enabled by default when a policy file is set; otherwise enabled=false until configured.
 */
export function loadSpendPolicy(
  filePath?: string
): SpendPolicyConfig {
  const path = filePath ?? env("SEND_ALLOW_POLICY_FILE");
  const policy = defaultSpendPolicy();

  if (!path) {
    policy.enabled = boolEnv("SEND_ALLOW_POLICY_ENABLED", false);
    const allowlist = env("SEND_ALLOW_ALLOWLIST");
    if (allowlist) {
      for (const part of allowlist.split(",")) {
        const a = part.trim();
        if (!a) continue;
        policy.destinations.set(normKey(a), {});
      }
    }
    const globalWei = env("SEND_ALLOW_GLOBAL_MAX_WEI");
    if (globalWei) policy.globalMaxNativeWei = BigInt(globalWei);
    policy.allowContractCreation = boolEnv(
      "SEND_ALLOW_ALLOW_CREATE",
      false
    );
    policy.allowAnyDestination = boolEnv("SEND_ALLOW_ALLOW_ANY", false);
    return finalize(policy, path);
  }

  const file = loadFile(path);
  policy.enabled = boolEnv(
    "SEND_ALLOW_POLICY_ENABLED",
    file.enabled !== false
  );
  policy.allowContractCreation =
    file.allowContractCreation ??
    boolEnv("SEND_ALLOW_ALLOW_CREATE", false);
  policy.allowAnyDestination =
    boolEnv("SEND_ALLOW_ALLOW_ANY", false) ||
    file.allowAnyDestination === true;
  policy.globalMaxNativeWei = parseWei(
    env("SEND_ALLOW_GLOBAL_MAX_WEI") ?? file.globalMaxNativeWei,
    file.globalMaxNativeEth,
    "global"
  );
  policy.destinations = parseDestinations(file.destinations);

  const extra = env("SEND_ALLOW_ALLOWLIST");
  if (extra) {
    for (const part of extra.split(",")) {
      const a = part.trim();
      if (!a) continue;
      const key = normKey(a);
      if (!policy.destinations.has(key)) policy.destinations.set(key, {});
    }
  }

  return finalize(policy, path);
}

function finalize(
  policy: SpendPolicyConfig,
  path: string | undefined
): SpendPolicyConfig {
  if (!policy.enabled) return policy;

  const poisons = listPoisonAddresses(policy);
  if (poisons.length > 0) {
    throw new Error(
      `Send Allow: policy still contains placeholder addresses (${poisons.join(", ")})${path ? ` in ${path}` : ""}. Replace them before start.`
    );
  }
  if (policy.allowAnyDestination) {
    throw new Error(
      "Send Allow: allowAnyDestination=true while enabled — refusing to start (destination fence removed)."
    );
  }
  return policy;
}
