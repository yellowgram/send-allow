import { appendFileSync } from "node:fs";
import type { Hex } from "viem";
import { parseRawTransaction } from "../decode/raw.js";
import { evaluateSpendPolicy } from "../policy/evaluate.js";
import {
  ERR_POLICY_DENIED,
  ERR_UNSIGNED_SEND_REFUSED,
  SEND_METHODS,
  UNSIGNED_SEND_METHODS,
  type JsonRpcRequest,
  type JsonRpcResponse,
  type PolicyDenyCode,
  type SendAllowConfig,
  type SendAllowResponseMeta,
} from "../types.js";

export interface HandlerDeps {
  forward?: (
    url: string,
    body: JsonRpcRequest
  ) => Promise<JsonRpcResponse>;
}

async function forwardRaw(
  url: string,
  body: JsonRpcRequest
): Promise<JsonRpcResponse> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  return (await res.json()) as JsonRpcResponse;
}

function writeLog(
  config: SendAllowConfig,
  method: string,
  meta: SendAllowResponseMeta,
  code: number | null
): void {
  if (!config.decisionLogPath) return;
  try {
    appendFileSync(
      config.decisionLogPath,
      JSON.stringify({
        ts: new Date().toISOString(),
        method,
        code,
        ...meta,
      }) + "\n"
    );
  } catch {
    // never brick the send path on log I/O
  }
}

function policyDenied(
  config: SendAllowConfig,
  req: JsonRpcRequest,
  opts: {
    code: PolicyDenyCode | "TX_UNPARSEABLE";
    reason: string;
  }
): JsonRpcResponse {
  const meta: SendAllowResponseMeta = {
    sendAllow: true,
    decision: "policy_denied",
    policyCode: opts.code,
    aborted: true,
    failOpen: false,
    reason: opts.reason,
  };
  writeLog(config, req.method, meta, ERR_POLICY_DENIED);
  return {
    jsonrpc: "2.0",
    id: req.id,
    sendAllow: meta,
    error: {
      code: ERR_POLICY_DENIED,
      message: `Send Allow: policy_denied — ${opts.reason}`,
      data: {
        ...meta,
        hint: "Update allowlist/caps or policy file. Operator keeps keys. This is not a simulation abort.",
      },
    },
  };
}

/**
 * Core middleware, in order:
 * 1. Refuse eth_sendTransaction (-32081). No key custody.
 * 2. Non-send methods → passthrough to upstream.
 * 3. Parse signed raw. Undecodable → fail_open (default) or fail_closed.
 * 4. If policy enabled, evaluate allowlist + caps. Deny → -32083 (never fail-open).
 * 5. Forward allowed sends. No simulation (see L2 Send Guard for sim-before-send).
 */
export async function handleRequest(
  config: SendAllowConfig,
  req: JsonRpcRequest,
  deps: HandlerDeps = {}
): Promise<JsonRpcResponse> {
  const forward =
    deps.forward ??
    (async (url, body) => forwardRaw(url, body));

  if (UNSIGNED_SEND_METHODS.has(req.method)) {
    const meta: SendAllowResponseMeta = {
      sendAllow: true,
      decision: "unsigned_refused",
      policyCode: null,
      aborted: true,
      failOpen: false,
      reason: "eth_sendTransaction refused — no key custody",
    };
    writeLog(config, req.method, meta, ERR_UNSIGNED_SEND_REFUSED);
    return {
      jsonrpc: "2.0",
      id: req.id,
      sendAllow: meta,
      error: {
        code: ERR_UNSIGNED_SEND_REFUSED,
        message:
          "Send Allow: eth_sendTransaction refused — no key custody. Sign externally and submit via eth_sendRawTransaction.",
        data: { ...meta, useMethod: "eth_sendRawTransaction" },
      },
    };
  }

  if (!SEND_METHODS.has(req.method)) {
    const res = await forward(config.upstreamRpcUrl, req);
    return {
      ...res,
      sendAllow: {
        sendAllow: true,
        decision: "passthrough",
        policyCode: null,
        aborted: false,
        failOpen: false,
      },
    };
  }

  const raw = req.params?.[0];
  if (typeof raw !== "string" || !raw.startsWith("0x")) {
    return {
      jsonrpc: "2.0",
      id: req.id,
      error: {
        code: -32602,
        message: "invalid params: expected hex raw transaction",
      },
    };
  }

  let parsed: ReturnType<typeof parseRawTransaction>;
  try {
    parsed = parseRawTransaction(raw as Hex);
  } catch (err) {
    const reason = `raw transaction undecodable: ${err instanceof Error ? err.message : String(err)}`;
    if (config.undecodableMode === "fail_closed") {
      return policyDenied(config, req, {
        code: "TX_UNPARSEABLE",
        reason,
      });
    }
    const upstream = await forward(config.upstreamRpcUrl, req);
    const meta: SendAllowResponseMeta = {
      sendAllow: true,
      decision: "fail_open",
      policyCode: "TX_UNPARSEABLE",
      aborted: false,
      failOpen: true,
      reason,
    };
    writeLog(config, req.method, meta, null);
    return { ...upstream, sendAllow: meta };
  }

  if (config.policy.enabled) {
    const check = evaluateSpendPolicy(config.policy, {
      to: parsed.to as `0x${string}` | undefined,
      value: parsed.value,
    });
    if (!check.allow) {
      return policyDenied(config, req, {
        code: check.code ?? "DESTINATION_NOT_ALLOWLISTED",
        reason: check.reason ?? "policy denied",
      });
    }
  }

  const upstream = await forward(config.upstreamRpcUrl, req);
  const meta: SendAllowResponseMeta = {
    sendAllow: true,
    decision: "forward",
    policyCode: null,
    aborted: false,
    failOpen: false,
  };
  writeLog(config, req.method, meta, null);
  return { ...upstream, sendAllow: meta };
}

export async function handlePayload(
  config: SendAllowConfig,
  body: unknown,
  deps?: HandlerDeps
): Promise<JsonRpcResponse | JsonRpcResponse[]> {
  if (Array.isArray(body)) {
    return Promise.all(
      body.map((item) =>
        handleRequest(config, item as JsonRpcRequest, deps)
      )
    );
  }
  return handleRequest(config, body as JsonRpcRequest, deps);
}
