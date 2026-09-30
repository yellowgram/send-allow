import { describe, it, expect, vi } from "vitest";
import { handleRequest } from "../src/proxy/handler.js";
import { defaultSpendPolicy } from "../src/types.js";
import {
  ERR_POLICY_DENIED,
  ERR_UNSIGNED_SEND_REFUSED,
  type SendAllowConfig,
  type UndecodableMode,
} from "../src/types.js";
import { FAKE_RAW, FAKE_TO, UNDECODABLE_RAW } from "./fixtures.js";

function cfg(opts: {
  destMap?: Map<string, { maxNativeWei?: bigint }>;
  enabled?: boolean;
  undecodableMode?: UndecodableMode;
} = {}): SendAllowConfig {
  const policy = defaultSpendPolicy();
  policy.enabled = opts.enabled ?? true;
  policy.destinations =
    opts.destMap ?? new Map([[FAKE_TO.toLowerCase(), {}]]);
  return {
    listenHost: "127.0.0.1",
    listenPort: 8546,
    upstreamRpcUrl: "http://upstream.test",
    undecodableMode: opts.undecodableMode ?? "fail_open",
    policy,
  };
}

describe("handler — allow / deny / undecodable", () => {
  it("refuses eth_sendTransaction (no custody)", async () => {
    const forward = vi.fn();
    const res = await handleRequest(
      cfg(),
      { jsonrpc: "2.0", id: 1, method: "eth_sendTransaction", params: [{}] },
      { forward }
    );
    expect(res.error?.code).toBe(ERR_UNSIGNED_SEND_REFUSED);
    expect(forward).not.toHaveBeenCalled();
  });

  it("forwards allowlisted eth_sendRawTransaction", async () => {
    const forward = vi.fn(async () => ({
      jsonrpc: "2.0" as const,
      id: 1,
      result: "0x" + "ab".repeat(32),
    }));
    const res = await handleRequest(
      cfg(),
      {
        jsonrpc: "2.0",
        id: 1,
        method: "eth_sendRawTransaction",
        params: [FAKE_RAW],
      },
      { forward }
    );
    expect(res.error).toBeUndefined();
    expect(res.result).toMatch(/^0x/);
    expect(res.sendAllow?.decision).toBe("forward");
    expect(forward).toHaveBeenCalledOnce();
  });

  it("denies non-allowlisted destination (fail-closed)", async () => {
    const forward = vi.fn();
    const res = await handleRequest(
      cfg({
        destMap: new Map([
          ["0x00000000000000000000000000000000000000ff", {}],
        ]),
      }),
      {
        jsonrpc: "2.0",
        id: 1,
        method: "eth_sendRawTransaction",
        params: [FAKE_RAW],
      },
      { forward }
    );
    expect(res.error?.code).toBe(ERR_POLICY_DENIED);
    expect(res.sendAllow?.policyCode).toBe("DESTINATION_NOT_ALLOWLISTED");
    expect(forward).not.toHaveBeenCalled();
  });

  it("fail-opens undecodable raw by default", async () => {
    const forward = vi.fn(async () => ({
      jsonrpc: "2.0" as const,
      id: 1,
      result: "0x" + "cd".repeat(32),
    }));
    const res = await handleRequest(
      cfg({ undecodableMode: "fail_open" }),
      {
        jsonrpc: "2.0",
        id: 1,
        method: "eth_sendRawTransaction",
        params: [UNDECODABLE_RAW],
      },
      { forward }
    );
    expect(res.error).toBeUndefined();
    expect(res.sendAllow?.decision).toBe("fail_open");
    expect(res.sendAllow?.policyCode).toBe("TX_UNPARSEABLE");
    expect(forward).toHaveBeenCalledOnce();
  });

  it("fail-closes undecodable when configured", async () => {
    const forward = vi.fn();
    const res = await handleRequest(
      cfg({ undecodableMode: "fail_closed" }),
      {
        jsonrpc: "2.0",
        id: 1,
        method: "eth_sendRawTransaction",
        params: [UNDECODABLE_RAW],
      },
      { forward }
    );
    expect(res.error?.code).toBe(ERR_POLICY_DENIED);
    expect(res.sendAllow?.policyCode).toBe("TX_UNPARSEABLE");
    expect(forward).not.toHaveBeenCalled();
  });

  it("passthrough for eth_chainId", async () => {
    const forward = vi.fn(async () => ({
      jsonrpc: "2.0" as const,
      id: 1,
      result: "0x1",
    }));
    const res = await handleRequest(
      cfg(),
      { jsonrpc: "2.0", id: 1, method: "eth_chainId", params: [] },
      { forward }
    );
    expect(res.result).toBe("0x1");
    expect(res.sendAllow?.decision).toBe("passthrough");
  });
});
