# Offline demo

No keys, no capital, no public RPC.

```bash
npm ci
npm test
npm run build
npm run demo:offline
```

`demo:offline` exits non-zero if stdout drifts from [`fixtures/offline.expected.txt`](./fixtures/offline.expected.txt).

What it shows:

1. Allowlisted raw → forwarded (`decision=forward`)
2. Not allowlisted → `-32083` `DESTINATION_NOT_ALLOWLISTED` (not forwarded)
3. Undecodable raw → fail-open forward (`TX_UNPARSEABLE`)
4. `eth_sendTransaction` → `-32081` unsigned refuse

For sim-before-send demos, use L2 Send Guard separately.
