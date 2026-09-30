import { getAddress } from "viem";
import type {
  DestinationPolicy,
  PolicyCheckInput,
  PolicyCheckResult,
  SpendPolicyConfig,
} from "../types.js";

function normAddr(addr: string): `0x${string}` {
  try {
    return getAddress(addr).toLowerCase() as `0x${string}`;
  } catch {
    return addr.toLowerCase() as `0x${string}`;
  }
}

/**
 * Pure allowlist + native-cap check. No simulation. No network.
 * Definite misses always deny (caller fail-closes).
 */
export function evaluateSpendPolicy(
  policy: SpendPolicyConfig,
  input: PolicyCheckInput
): PolicyCheckResult {
  const valueWei = input.value;

  if (!policy.enabled) {
    return { allow: true, valueWei };
  }

  if (!input.to) {
    if (policy.allowContractCreation) {
      return { allow: true, valueWei };
    }
    return {
      allow: false,
      code: "CONTRACT_CREATE_DENIED",
      reason: "contract creation denied by Send Allow policy",
      valueWei,
    };
  }

  const effectiveTo = normAddr(input.to);
  const dest: DestinationPolicy | undefined =
    policy.destinations.get(effectiveTo);

  if (!policy.allowAnyDestination && !dest) {
    return {
      allow: false,
      code: "DESTINATION_NOT_ALLOWLISTED",
      reason: `destination ${effectiveTo} not on Send Allow allowlist`,
      effectiveTo,
      valueWei,
    };
  }

  const caps: bigint[] = [];
  if (policy.globalMaxNativeWei !== undefined) {
    caps.push(policy.globalMaxNativeWei);
  }
  if (dest?.maxNativeWei !== undefined) {
    caps.push(dest.maxNativeWei);
  }
  for (const cap of caps) {
    if (valueWei > cap) {
      return {
        allow: false,
        code: "OVER_CAP",
        reason: `native value ${valueWei} exceeds policy cap ${cap}`,
        effectiveTo,
        valueWei,
      };
    }
  }

  return { allow: true, effectiveTo, valueWei };
}
