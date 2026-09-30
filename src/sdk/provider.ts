/**
 * Thin RPC helpers so wallets / agents can point at Send Allow.
 * No private-key custody — URL wiring only.
 */

export interface SendAllowProviderOptions {
  /** Proxy base URL, e.g. `http://127.0.0.1:8546` */
  proxyUrl: string;
  /** Extra headers (caller wins on collisions). */
  headers?: Record<string, string>;
}

export interface SendAllowConnection {
  url: string;
  headers: Record<string, string>;
}

export function createSendAllowConnection(
  opts: SendAllowProviderOptions
): SendAllowConnection {
  const url = opts.proxyUrl.replace(/\/+$/, "");
  if (!url) throw new Error("proxyUrl is required");
  const headers: Record<string, string> = {
    "content-type": "application/json",
  };
  if (opts.headers) {
    for (const [k, v] of Object.entries(opts.headers)) headers[k] = v;
  }
  return { url, headers };
}

/**
 * Args for viem `http(...viemHttpArgs(opts))`.
 *
 * @example
 * ```ts
 * import { http } from "viem";
 * import { viemHttpArgs } from "send-allow/sdk";
 * const transport = http(...viemHttpArgs({ proxyUrl: "http://127.0.0.1:8546" }));
 * ```
 */
export function viemHttpArgs(
  opts: SendAllowProviderOptions
): [string, { fetchOptions: { headers: Record<string, string> } }] {
  const { url, headers } = createSendAllowConnection(opts);
  return [url, { fetchOptions: { headers } }];
}

export function createSendAllowFetch(
  opts: SendAllowProviderOptions
): typeof globalThis.fetch {
  const { url: proxyUrl, headers: gateHeaders } =
    createSendAllowConnection(opts);
  return (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const target =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.toString()
          : input.url;
    const abs =
      !target || target.startsWith("/") ? proxyUrl : target;
    const nextHeaders = new Headers(init?.headers);
    const sameProxy =
      abs === proxyUrl ||
      abs.startsWith(proxyUrl + "/") ||
      abs.startsWith(proxyUrl + "?");
    if (sameProxy || abs === target) {
      for (const [k, v] of Object.entries(gateHeaders)) {
        if (!nextHeaders.has(k)) nextHeaders.set(k, v);
      }
    }
    const nextInput =
      !target || target.startsWith("/") ? proxyUrl : input;
    return globalThis.fetch(nextInput as RequestInfo, {
      ...init,
      headers: nextHeaders,
    });
  };
}
