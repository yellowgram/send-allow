# Send Allow

More from yellowgram: [OSS tools](https://www.yellowgram.dev/oss).

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)

**Non-custodial JSON-RPC middleware** that gates `eth_sendRawTransaction` with an address allowlist and optional native spend caps (`maxNativeWei`). Signing stays outside the proxy. **No simulation** — for sim-before-send use [L2 Send Guard](https://github.com/yellowgram/l2-safety-proxy) (`l2-send-guard`) as a complementary layer.

> **Charter:** no key custody · no Soft\* · no Coinbase-plugin claim · no mainnet SLA — [CHARTER.md](./CHARTER.md)

## Supported surface (0.1.0)

| | |
| --- | --- |
| **Is** | A JSON-RPC proxy in front of your existing RPC |
| **Submit** | Signed `eth_sendRawTransaction` (and Sync). `eth_sendTransaction` is refused (`-32081`) |
| **Policy** | Deny if `to` not allowlisted and/or native `value` exceeds per-address / global caps → `-32083` |
| **Undecodable** | Default **fail-open** (forward). Optional `fail_closed`. Definite policy misses **never** fail-open |
| **Not** | Simulation, key custody, hosted SaaS, mainnet SLA, a Coinbase / CDP plugin |

## Pin

```bash
# from this tree (package not assumed published)
npm ci && npm test && npm run build
```

npm name: `send-allow@0.1.0`. Imports: `send-allow`, `send-allow/sdk`. CLI: `send-allow`.

## Quick start

```bash
cp policy.agent.example.json policy.json
# replace 0x1111… / 0x2222… placeholders
npm run policy:check -- ./policy.json   # must print OK

cp .env.example .env
# set SEND_ALLOW_UPSTREAM_RPC + SEND_ALLOW_POLICY_FILE=./policy.json

npm run build && npm start
# http://127.0.0.1:8546/health
```

`SEND_ALLOW_HOST` defaults to `127.0.0.1`. Binding `0.0.0.0` without an ACL turns the proxy into an unauthenticated raw-tx forwarder.

## Fail-open vs fail-closed

| Case | Behavior |
| --- | --- |
| `to` not allowlisted | **fail-closed** `-32083` `DESTINATION_NOT_ALLOWLISTED` |
| `value` over cap | **fail-closed** `-32083` `OVER_CAP` |
| contract create (no `to`) | **fail-closed** unless `allowContractCreation` |
| raw undecodable | **fail-open** forward by default (`SEND_ALLOW_UNDECODABLE_MODE=fail_open`) |

P0 = fail-closed on every definite policy miss. See [CHARTER.md](./CHARTER.md).

## Error codes

| Code | Meaning |
| --- | --- |
| **-32081** | `eth_sendTransaction` refused — no key custody |
| **-32083** | `policy_denied` — allowlist / cap / (optional) undecodable fail-closed |

Codes align with L2 Send Guard where semantics match so agent halt helpers stay portable.

## Prove it offline

```bash
npm ci
npm test
npm run build
npm run demo:offline
```

Details: [docs/DEMO.md](./docs/DEMO.md).

## Agent / viem wiring

```ts
import { http } from "viem";
import { viemHttpArgs, isPolicyDeniedError } from "send-allow/sdk";

const transport = http(
  ...viemHttpArgs({ proxyUrl: "http://127.0.0.1:8546" })
);
```

Stub (does **not** import `@coinbase/agentkit`; not a Coinbase plugin): [`examples/agentkit-viem.ts`](./examples/agentkit-viem.ts).

## Complementary: L2 Send Guard

| | Send Allow | L2 Send Guard |
| --- | --- | --- |
| Allowlist + native caps | **yes** (this package) | optional Layer 2 |
| Simulate before send | **no** | **yes** (Layer 1) |
| Fail-open | undecodable only (default) | uncertain sim (when `GUARD_MODE=open`) |

Stack them if you want both fences. This README does not sell a bundle or a hosted tier.

## License

MIT — [LICENSE](./LICENSE).
