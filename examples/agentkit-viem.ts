/**
 * AgentKit / viem drop-in — point eth_sendRawTransaction at Send Allow.
 *
 * This file is an **example** (not compiled into the package).
 * It does **not** import `@coinbase/agentkit` — wire the same transport into
 * whatever wallet/agent stack you use. Send Allow is not a Coinbase plugin.
 *
 * Prereq: `npm start` with a real policy.json (placeholders replaced).
 *
 * Run conceptually:
 *   npx tsx examples/agentkit-viem.ts
 * (Requires DEMO_PRIVATE_KEY in env for a live send — omit for dry wiring print.)
 *
 * Complementary: put L2 Send Guard in front or behind for sim-before-send.
 * Soft* outreach / conversion theater is out of charter — see CHARTER.md.
 */

import { createWalletClient, http, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { baseSepolia } from "viem/chains";
import {
  viemHttpArgs,
  isPolicyDeniedError,
  classifySendAllowError,
} from "send-allow/sdk";

const PROXY = process.env.SEND_ALLOW_PROXY_URL ?? "http://127.0.0.1:8546";

/** Preferred: spread into viem `http()`. */
export function gateTransport() {
  return http(...viemHttpArgs({ proxyUrl: PROXY }));
}

/**
 * AgentKit tip (pseudo — adapt to current AgentKit wallet provider API):
 *
 *   // Pass the Send Allow URL instead of the raw Alchemy/Base RPC:
 *   const rpcUrl = process.env.SEND_ALLOW_PROXY_URL ?? "http://127.0.0.1:8546";
 *   // CDP Policy Engine (hosted allowlist/ethValue) is complementary —
 *   // Send Allow is self-hosted allowlist + native caps. Not a Coinbase plugin.
 */

async function main() {
  const key = process.env.DEMO_PRIVATE_KEY as Hex | undefined;
  if (!key) {
    console.log(
      "No DEMO_PRIVATE_KEY — printing transport wiring only.\n",
      "viemHttpArgs →",
      viemHttpArgs({ proxyUrl: PROXY })
    );
    return;
  }

  const client = createWalletClient({
    account: privateKeyToAccount(key),
    chain: baseSepolia,
    transport: gateTransport(),
  });

  try {
    const hash = await client.sendTransaction({
      to: "0x0000000000000000000000000000000000000001",
      value: 0n,
    });
    console.log("forwarded txHash", hash);
  } catch (err) {
    const kind = classifySendAllowError(err);
    console.error("send-allow classified:", kind);
    if (isPolicyDeniedError(err)) {
      console.error(
        "policy_denied (-32083) — update allowlist/caps; definite miss never fail-opens"
      );
    } else {
      throw err;
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
