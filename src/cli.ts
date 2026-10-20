import { PACKAGE_VERSION } from "./version.js";

/** What the command line asked for. Parsing never reads the environment, so --help needs no config. */
export type CliCommand = { kind: "run" } | { kind: "help" } | { kind: "version" } | { kind: "error"; message: string };

export function parseCli(argv: readonly string[]): CliCommand {
  if (argv.length === 0) return { kind: "run" };
  if (argv.length === 1 && (argv[0] === "--help" || argv[0] === "-h")) return { kind: "help" };
  if (argv.length === 1 && (argv[0] === "--version" || argv[0] === "-v")) return { kind: "version" };
  return { kind: "error", message: `unknown argument ${JSON.stringify(argv[0])}; run send-allow --help` };
}

export const HELP = `send-allow ${PACKAGE_VERSION}: DEPRECATED. It gets no security fixes; it is merged into l2-send-guard 1.x.
Migrate: https://github.com/yellowgram/l2-safety-proxy#migrating

JSON-RPC allowlist and spend-cap gate in front of your node.

Usage:
  send-allow             start the gate (configured by the environment below)
  send-allow --help      show this help (also -h)
  send-allow --version   print the version (also -v)

Environment:
  SEND_ALLOW_UPSTREAM_RPC      required. JSON-RPC URL behind the gate (alias SEND_ALLOW_RPC_URL)
  SEND_ALLOW_POLICY_FILE       policy JSON (destinations, caps). Without it, the gate is off unless SEND_ALLOW_POLICY_ENABLED=true
  SEND_ALLOW_POLICY_ENABLED    true | false (default: true with a policy file, false without)
  SEND_ALLOW_ALLOWLIST         comma-separated extra allowed destination addresses
  SEND_ALLOW_GLOBAL_MAX_WEI    per-transaction native value cap, in wei
  SEND_ALLOW_ALLOW_CREATE      true | false (default false): allow contract creation
  SEND_ALLOW_ALLOW_ANY         true | false (default false): allow any destination
  SEND_ALLOW_UNDECODABLE_MODE  fail_open (default) | fail_closed
  SEND_ALLOW_HOST              listen host (default 127.0.0.1)
  SEND_ALLOW_PORT              listen port (default 8546)
  SEND_ALLOW_DECISION_LOG      append one JSON line per decision to this file
`;

/**
 * End the process with `code` after pending output is written. Setting exitCode instead of
 * calling process.exit() lets the deprecation warning (emitted on the next tick) reach stderr.
 * The unref'd timer only matters if some handle would keep the process alive.
 */
export function exitSoon(code: number): void {
  process.exitCode = code;
  setTimeout(() => process.exit(code), 2000).unref();
}
