# Changelog

## 0.1.0

- Finished allowlist + native spend-cap wedge for `eth_sendRawTransaction`
- Per-destination and optional global `maxNativeWei`; machine deny codes (`DESTINATION_NOT_ALLOWLISTED`, `OVER_CAP`, `CONTRACT_CREATE_DENIED`)
- Fail-closed on definite policy miss; fail-open only on undecodable (configurable)
- Refuse `eth_sendTransaction` (no key custody)
- Sealed offline demo proves allow, not-allowlisted deny, value-cap `OVER_CAP`, undecodable, and unsigned refuse
- Complementary to L2 Send Guard (no simulation in this package)
