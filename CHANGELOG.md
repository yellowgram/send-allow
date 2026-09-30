# Changelog

## 0.1.0

- Initial scaffold: JSON-RPC middleware for `eth_sendRawTransaction`
- Allowlist + optional per-destination / global `maxNativeWei`
- Fail-closed on definite policy miss; fail-open only on undecodable (configurable)
- Refuse `eth_sendTransaction` (no key custody)
- Offline demo fixture, AgentKit/viem example stub, vitest coverage
- Complementary to L2 Send Guard (no simulation in this package)
