#!/usr/bin/env node
import "./deprecated.js";
/**
 * Send Allow CLI — JSON-RPC allowlist / spend-cap gate.
 * No key custody. No simulation. Deprecated: use l2-send-guard.
 */
import { loadConfig } from "./config.js";
import { listen } from "./proxy/server.js";

async function main(): Promise<void> {
  const config = loadConfig();
  await listen(config);
}

main().catch((err) => {
  console.error("[send-allow] fatal:", err instanceof Error ? err.message : err);
  process.exit(1);
});
