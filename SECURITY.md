# Security

Send Allow is a local JSON-RPC proxy that gates `eth_sendRawTransaction` with an allowlist and optional native spend caps. It does not custody keys. It does not simulate. It is not a mainnet SLA or a hosted service.

## Reporting a vulnerability

Do not open a public GitHub Issue for a vulnerability, and do not paste a funded raw transaction or a private key.

Prefer a private GitHub Security Advisory on the repository when one exists. Include the package version or commit, impact, and a repro that does not require a mainnet key. There is no bug-bounty program in this package.

## Bind

The default listen address is `127.0.0.1`. Binding `0.0.0.0` without an ACL makes the proxy an unauthenticated forwarder onto your upstream RPC. The process prints a warning when it binds a wildcard address.
