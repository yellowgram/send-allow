# Changelog

## 0.2.0

- Deprecated. Merged into `l2-send-guard` 1.x, which fixes nested-call decoding, EIP-7702 authorizations, cumulative limits, ungated submit methods and memory-only state. This version behaves like 0.1.0 and emits one `DeprecationWarning` on import.
- Removed internal planning files (`CHARTER.md`, `IMPLEMENT_NOTES.md`).

## 0.1.0

- Finished allowlist + native spend-cap wedge for `eth_sendRawTransaction`
- Per-destination and optional global `maxNativeWei`; machine deny codes (`DESTINATION_NOT_ALLOWLISTED`, `OVER_CAP`, `CONTRACT_CREATE_DENIED`)
- Fail-closed on definite policy miss; fail-open only on undecodable (configurable)
- Refuse `eth_sendTransaction` (no key custody)
- Sealed offline demo proves allow, not-allowlisted deny, value-cap `OVER_CAP`, undecodable, and unsigned refuse
- Complementary to L2 Send Guard (no simulation in this package)
