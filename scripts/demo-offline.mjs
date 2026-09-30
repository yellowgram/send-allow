/**
 * Offline demo — no public RPC, keys, or capital.
 * Spins a mock upstream + real Send Allow proxy; shows:
 *   1) allowlisted send forwarded
 *   2) non-allowlisted send aborted (-32083, not forwarded)
 *   3) value-cap OVER_CAP aborted (-32083, not forwarded)
 *   4) undecodable → fail-open forward
 *   5) eth_sendTransaction → unsigned refuse
 *
 * Usage (after npm run build):
 *   node scripts/demo-offline.mjs
 * Diff vs docs/fixtures/offline.expected.txt — exits non-zero on drift.
 */
import http from "node:http";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createServer } from "../dist/proxy/server.js";
import { defaultSpendPolicy } from "../dist/types.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const EXPECTED = join(root, "docs/fixtures/offline.expected.txt");

/** Signed EIP-1559 raw → to=0x…01, value=0 (under demo cap). */
const FAKE_RAW =
  "0x02f86d83066eee80843b9aca00843b9aca008252089400000000000000000000000000000000000000018080c001a07eade7c743ff2ea60f61c687ccca4b77553a14de08378371ac40c7d52a8f1d74a06fed4faa592ac84bae32b9311844176fc059eb70057c18450d4310072a880629";
/** Same dest, value=101 wei — exceeds demo maxNativeWei=100. Fixture vector only. */
const OVER_CAP_RAW =
  "0x02f86d83066eee80843b9aca00843b9aca008252089400000000000000000000000000000000000000016580c080a0075718fa3a0aeaa12517fd949f227efbf155c800efb4852296bbfbf3cb6862f8a063767ae337c18b7123d329764e9a65c4d82b88647f1d605b7ff2155a0452ab4d";
const UNDECODABLE = "0xdeadbeef";
const ALLOW = "0x0000000000000000000000000000000000000001";

function startMockUpstream() {
  let forwardedSends = 0;
  const server = http.createServer((req, res) => {
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => {
      const body = JSON.parse(Buffer.concat(chunks).toString("utf8"));
      const { method, id } = body;
      let payload;
      if (method === "eth_chainId") {
        payload = { jsonrpc: "2.0", id, result: "0x66eee" };
      } else if (method === "eth_sendRawTransaction") {
        forwardedSends += 1;
        payload = {
          jsonrpc: "2.0",
          id,
          result: "0x" + "ab".repeat(32),
        };
      } else {
        payload = { jsonrpc: "2.0", id, result: null };
      }
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify(payload));
    });
  });
  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => {
      const addr = server.address();
      resolve({
        server,
        url: `http://127.0.0.1:${addr.port}`,
        getForwarded: () => forwardedSends,
      });
    });
  });
}

async function rpc(url, method, params) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  return res.json();
}

function line(s) {
  process.stdout.write(s + "\n");
}

async function main() {
  const lines = [];
  const out = (s) => {
    lines.push(s);
    line(s);
  };

  out("send-allow offline demo");
  out("no keys · no capital · no public RPC");
  out("");

  const upstream = await startMockUpstream();
  const policy = defaultSpendPolicy();
  policy.enabled = true;
  // Cap 100 wei: FAKE_RAW value=0 allows; OVER_CAP_RAW value=101 denies.
  policy.destinations = new Map([[ALLOW.toLowerCase(), { maxNativeWei: 100n }]]);

  const config = {
    listenHost: "127.0.0.1",
    listenPort: 0,
    upstreamRpcUrl: upstream.url,
    policy,
    undecodableMode: "fail_open",
  };

  const server = createServer(config);
  await new Promise((resolve) => {
    server.listen(0, "127.0.0.1", resolve);
  });
  const addr = server.address();
  const proxyUrl = `http://127.0.0.1:${addr.port}`;

  // 1) allowlisted under cap
  const allow = await rpc(proxyUrl, "eth_sendRawTransaction", [FAKE_RAW]);
  out(`1 allowlisted → decision=${allow.sendAllow?.decision} forwarded=${upstream.getForwarded() === 1}`);

  // 2) deny: empty allowlist for a different policy instance
  policy.destinations = new Map([
    ["0x00000000000000000000000000000000000000ff", {}],
  ]);
  const deny = await rpc(proxyUrl, "eth_sendRawTransaction", [FAKE_RAW]);
  out(
    `2 deny not-allowlisted → code=${deny.error?.code} policyCode=${deny.sendAllow?.policyCode ?? deny.error?.data?.policyCode} forwarded=${upstream.getForwarded() === 1}`
  );

  // 3) value-cap OVER_CAP (restore allowlisted dest with low cap)
  policy.destinations = new Map([[ALLOW.toLowerCase(), { maxNativeWei: 100n }]]);
  const over = await rpc(proxyUrl, "eth_sendRawTransaction", [OVER_CAP_RAW]);
  out(
    `3 deny value-cap → code=${over.error?.code} policyCode=${over.sendAllow?.policyCode ?? over.error?.data?.policyCode} forwarded=${upstream.getForwarded() === 1}`
  );

  // 4) undecodable fail-open
  const bad = await rpc(proxyUrl, "eth_sendRawTransaction", [UNDECODABLE]);
  out(
    `4 undecodable fail-open → decision=${bad.sendAllow?.decision} policyCode=${bad.sendAllow?.policyCode} forwarded=${upstream.getForwarded() === 2}`
  );

  // 5) unsigned refuse
  const unsigned = await rpc(proxyUrl, "eth_sendTransaction", [{}]);
  out(`5 unsigned refuse → code=${unsigned.error?.code}`);

  out("");
  out("complementary: L2 Send Guard adds sim-before-send; Send Allow is allowlist/caps only.");
  out("charter: no key custody · no Soft* · no Coinbase-plugin claim · no mainnet SLA");

  server.close();
  upstream.server.close();

  const expected = readFileSync(EXPECTED, "utf8").replace(/\r\n/g, "\n").trimEnd();
  const actual = lines.join("\n").trimEnd();
  if (actual !== expected) {
    console.error("\n[demo-offline] stdout drifted from docs/fixtures/offline.expected.txt");
    console.error("--- expected ---\n" + expected);
    console.error("--- actual ---\n" + actual);
    process.exit(1);
  }
  console.error("[demo-offline] OK — matches offline.expected.txt");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
