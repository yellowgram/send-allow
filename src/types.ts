/** Machine-readable deny reasons for definite policy misses. */
export type PolicyDenyCode =
  | "DESTINATION_NOT_ALLOWLISTED"
  | "OVER_CAP"
  | "CONTRACT_CREATE_DENIED";

/**
 * Fail mode for undecodable raw txs.
 * P0: definite policy misses always fail-closed.
 * Undecodable is the only documented fail-open path (default).
 */
export type UndecodableMode = "fail_open" | "fail_closed";

export interface DestinationPolicy {
  /** Max native wei for a single tx to this destination (inclusive). */
  maxNativeWei?: bigint;
}

export interface SpendPolicyConfig {
  enabled: boolean;
  allowContractCreation: boolean;
  /** When true, skip allowlist membership (caps still apply). */
  allowAnyDestination: boolean;
  globalMaxNativeWei?: bigint;
  /** lowercase 0x-address → policy */
  destinations: Map<string, DestinationPolicy>;
}

export interface PolicyCheckInput {
  to?: `0x${string}`;
  value: bigint;
}

export interface PolicyCheckResult {
  allow: boolean;
  code?: PolicyDenyCode;
  reason?: string;
  effectiveTo?: `0x${string}`;
  valueWei: bigint;
}

export interface SendAllowConfig {
  listenHost: string;
  listenPort: number;
  upstreamRpcUrl: string;
  policy: SpendPolicyConfig;
  /**
   * Behavior when the signed raw cannot be parsed.
   * Default fail_open — forward (cannot evaluate allowlist/caps).
   * fail_closed — refuse with -32083 TX_UNPARSEABLE.
   */
  undecodableMode: UndecodableMode;
  decisionLogPath?: string;
}

export type Decision =
  | "forward"
  | "fail_open"
  | "policy_denied"
  | "unsigned_refused"
  | "passthrough";

export interface SendAllowResponseMeta {
  sendAllow: true;
  decision: Decision;
  policyCode: PolicyDenyCode | "TX_UNPARSEABLE" | null;
  aborted: boolean;
  failOpen: boolean;
  reason?: string;
}

export interface JsonRpcRequest {
  jsonrpc?: string;
  id?: string | number | null;
  method: string;
  params?: unknown[];
}

export interface JsonRpcError {
  code: number;
  message: string;
  data?: unknown;
}

export interface JsonRpcResponse {
  jsonrpc: "2.0";
  id?: string | number | null;
  result?: unknown;
  error?: JsonRpcError;
  sendAllow?: SendAllowResponseMeta;
}

/** Align with L2 Send Guard so agent halt helpers stay portable. */
export const ERR_UNSIGNED_SEND_REFUSED = -32081;
/** Definite policy miss (or fail_closed undecodable). Never a sim result. */
export const ERR_POLICY_DENIED = -32083;

export const SEND_METHODS = new Set([
  "eth_sendRawTransaction",
  "eth_sendRawTransactionSync",
]);

export const UNSIGNED_SEND_METHODS = new Set(["eth_sendTransaction"]);

export function defaultSpendPolicy(): SpendPolicyConfig {
  return {
    enabled: true,
    allowContractCreation: false,
    allowAnyDestination: false,
    destinations: new Map(),
  };
}
