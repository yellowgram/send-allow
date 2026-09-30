# Send Allow — charter fences

This package is a **narrow** agent-ops tool. Keep the surface honest.

## In scope (P0)

- Non-custodial JSON-RPC middleware in front of `eth_sendRawTransaction`
- Abort when `to` is not on the allowlist
- Optional `maxNativeWei` (per-destination and/or global)
- **Fail-closed** on every definite policy miss
- **Fail-open only** when the raw tx is undecodable (default; configurable to fail-closed)
- Offline fixture demo + unit tests (allow / deny / value-cap)
- MIT, self-hosted

## Out of scope / fences

| Fence | Meaning |
| --- | --- |
| **No key custody** | Refuse `eth_sendTransaction`. Signing stays in the wallet / agent / KMS. |
| **No simulation** | This package does not simulate. For sim-before-send use **L2 Send Guard** (`l2-send-guard`) — complementary, not a substitute. |
| **No Soft\*** | No Soft\* naming, briefs, outreach, or monetization wording in copy or scripts. |
| **No Coinbase-plugin claim** | Example stubs may mention AgentKit/viem wiring. This is **not** a Coinbase / CDP plugin and must not be marketed as one. |
| **No mainnet SLA** | Self-host / testnet-oriented. No hosted SLA, no “mainnet ready” claim in this release. |

## Fail-open vs fail-closed

| Case | Default | Notes |
| --- | --- | --- |
| Destination not allowlisted | **fail-closed** (`-32083`) | P0 |
| Native value over cap | **fail-closed** (`-32083`) | P0 |
| Contract creation (no `to`) | **fail-closed** unless `allowContractCreation` | P0 |
| Raw undecodable | **fail-open** (forward) | Only fail-open path; set `SEND_ALLOW_UNDECODABLE_MODE=fail_closed` to refuse |

Allowlisting a router, multicall, or forwarder is **not** destination safety.

## Soft* ban

Forbidden: any Soft* monetization / conversion naming or copy in this package (including hyphenated or spaced Soft* WTP forms). Use Soft* only as the ban token.
