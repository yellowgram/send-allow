/**
 * Typed helpers for Send Allow JSON-RPC error codes.
 * Codes align with L2 Send Guard where semantics match:
 *   -32081  eth_sendTransaction refused (no custody)
 *   -32083  policy_denied (definite allowlist/cap miss)
 */

import { ERR_POLICY_DENIED, ERR_UNSIGNED_SEND_REFUSED } from "../types.js";

export { ERR_POLICY_DENIED, ERR_UNSIGNED_SEND_REFUSED };

export interface SendAllowRpcErrorLike {
  code?: number;
  message?: string;
  data?: unknown;
}

export type SendAllowErrorKind =
  | "policy_denied"
  | "unsigned_refused"
  | "other";

function asError(err: unknown): SendAllowRpcErrorLike | null {
  if (!err || typeof err !== "object") return null;
  const e = err as Record<string, unknown>;
  if (typeof e.code === "number") return e as SendAllowRpcErrorLike;
  if (
    e.cause &&
    typeof e.cause === "object" &&
    typeof (e.cause as SendAllowRpcErrorLike).code === "number"
  ) {
    return e.cause as SendAllowRpcErrorLike;
  }
  const nested =
    (e.info as { error?: SendAllowRpcErrorLike } | undefined)?.error ??
    (e.error as SendAllowRpcErrorLike | undefined);
  if (nested && typeof nested.code === "number") return nested;
  return e as SendAllowRpcErrorLike;
}

export function sendAllowErrorCode(err: unknown): number | undefined {
  return asError(err)?.code;
}

export function isPolicyDeniedError(err: unknown): boolean {
  return sendAllowErrorCode(err) === ERR_POLICY_DENIED;
}

export function isUnsignedSendRefusedError(err: unknown): boolean {
  return sendAllowErrorCode(err) === ERR_UNSIGNED_SEND_REFUSED;
}

export function isSendAllowAbortError(err: unknown): boolean {
  const code = sendAllowErrorCode(err);
  return code === ERR_POLICY_DENIED || code === ERR_UNSIGNED_SEND_REFUSED;
}

export function classifySendAllowError(err: unknown): SendAllowErrorKind {
  const code = sendAllowErrorCode(err);
  if (code === ERR_POLICY_DENIED) return "policy_denied";
  if (code === ERR_UNSIGNED_SEND_REFUSED) return "unsigned_refused";
  return "other";
}

export function sendAllowErrorData(
  err: unknown
): Record<string, unknown> | undefined {
  const data = asError(err)?.data;
  if (data && typeof data === "object" && !Array.isArray(data)) {
    return data as Record<string, unknown>;
  }
  return undefined;
}
