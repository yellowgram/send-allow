# send-allow (deprecated)

**This package is merged into [`l2-send-guard`](https://github.com/yellowgram/l2-safety-proxy) 1.x and gets no more fixes.**
Version 0.2.0 behaves like 0.1.0 and prints one deprecation warning when imported or run. The bin also answers `send-allow --help` and `--version` (see the CHANGELOG).

## Why

send-allow did one slice of a bigger job (a destination allowlist and native spend caps). On its own it had gaps that a single tool closes better:

- Calldata was ignored, so allowlisting a token contract let `transfer(attacker, everything)` through.
- Only the top-level call was seen, so anything inside a Multicall3 or Safe batch went unchecked.
- EIP-7702 `authorizationList` was ignored: a type-4 transaction could delegate the account to any contract.
- Caps were per transaction, so many small sends could add up to any amount.
- `eth_sendRawTransactionConditional`, `eth_sendPrivateTransaction` and bundles were forwarded unchecked.
- With no policy configured it forwarded everything.

`l2-send-guard` 1.x checks every call inside a transaction against one policy file, gates EIP-7702
delegations, keeps rolling caps and idempotency keys in a persistent store, watches what arrives, and
ships a guarded signer that applies the policy to the transactions, typed data and 7702 authorizations it
signs, and refuses plain messages unless you allow them.

## Migrating

```sh
npm uninstall send-allow
npm install l2-send-guard
```

What you used here is now the policy file's `destinations`, `native.maxPerTxWei` and `native.windowMaxWei`. Denials are still `-32083`.
The full guide is at https://github.com/yellowgram/l2-safety-proxy#migrating.

## License

MIT
