/**
 * Anvil/Hardhat account #0 signed EIP-1559 tx (Arb Sepolia chainId).
 * to = 0x0000…0001, value = 0. Public test key — never use on mainnet with funds.
 */
export const FAKE_RAW =
  "0x02f86d83066eee80843b9aca00843b9aca008252089400000000000000000000000000000000000000018080c001a07eade7c743ff2ea60f61c687ccca4b77553a14de08378371ac40c7d52a8f1d74a06fed4faa592ac84bae32b9311844176fc059eb70057c18450d4310072a880629" as `0x${string}`;

export const FAKE_TO =
  "0x0000000000000000000000000000000000000001" as `0x${string}`;

export const OTHER_TO =
  "0x00000000000000000000000000000000000000aa" as `0x${string}`;

/** Garbage hex that will not parse as a signed tx. */
export const UNDECODABLE_RAW = "0xdeadbeef" as `0x${string}`;
