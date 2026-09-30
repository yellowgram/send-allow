#!/usr/bin/env node
/**
 * Send Allow CLI — JSON-RPC allowlist / spend-cap gate.
 * No key custody. No simulation. See README + CHARTER.md.
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
