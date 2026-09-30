import {
  parseTransaction,
  type Hex,
  type TransactionSerializable,
} from "viem";

export interface ParsedSend {
  raw: Hex;
  tx: TransactionSerializable;
  to?: Hex;
  data?: Hex;
  value: bigint;
  gas?: bigint;
}

/**
 * Parse a signed raw tx without needing the private key.
 * Never custodies keys — fields only for allowlist / cap checks.
 */
export function parseRawTransaction(raw: Hex): ParsedSend {
  const tx = parseTransaction(raw);
  return {
    raw,
    tx,
    to: tx.to ?? undefined,
    data: (tx.data as Hex | undefined) ?? "0x",
    value: tx.value ?? 0n,
    gas: tx.gas,
  };
}
