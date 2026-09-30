import { loadSpendPolicy } from "./policy/load.js";
import type { SendAllowConfig, UndecodableMode } from "./types.js";

function env(key: string, fallback?: string): string | undefined {
  const v = process.env[key];
  if (v !== undefined && v !== "") return v;
  return fallback;
}

function intEnv(key: string, fallback: number): number {
  const v = env(key);
  if (v === undefined) return fallback;
  const n = Number(v);
  if (!Number.isFinite(n)) throw new Error(`${key} must be a number`);
  return n;
}

/**
 * Load process config from env.
 * Upstream RPC is required when starting the proxy.
 */
export function loadConfig(): SendAllowConfig {
  const upstream =
    env("SEND_ALLOW_UPSTREAM_RPC") ?? env("SEND_ALLOW_RPC_URL");
  if (!upstream) {
    throw new Error(
      "SEND_ALLOW_UPSTREAM_RPC is required (JSON-RPC URL behind Send Allow)"
    );
  }

  const undecodableRaw = (
    env("SEND_ALLOW_UNDECODABLE_MODE") ?? "fail_open"
  ).toLowerCase();
  if (undecodableRaw !== "fail_open" && undecodableRaw !== "fail_closed") {
    throw new Error(
      'SEND_ALLOW_UNDECODABLE_MODE must be "fail_open" or "fail_closed"'
    );
  }

  return {
    listenHost: env("SEND_ALLOW_HOST") ?? "127.0.0.1",
    listenPort: intEnv("SEND_ALLOW_PORT", 8546),
    upstreamRpcUrl: upstream,
    policy: loadSpendPolicy(),
    undecodableMode: undecodableRaw as UndecodableMode,
    decisionLogPath: env("SEND_ALLOW_DECISION_LOG"),
  };
}
