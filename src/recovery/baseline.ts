import type {
  Transaction,
  RecoveryAction,
} from "../simulation/types.js";

export interface BaselineDecision {
  actions: RecoveryAction[];
  reason: string;
}

/**
 * Fixed-Retry Baseline
 *
 * Represents a conventional recovery strategy:
 * retry the same payment method, then stop.
 *
 * It does not use:
 * - customer history
 * - environment health
 * - adaptive recommendations
 * - probability estimates
 * - ENV optimization
 */
export function evaluateFixedRetryBaseline(
  transaction: Transaction
): BaselineDecision {
  const attempts =
    transaction.attempts.length;

  if (attempts >= 3) {
    return {
      actions: ["stop"],

      reason:
        "Maximum fixed retry attempts reached.",
    };
  }

  if (attempts === 1) {
    return {
      actions: ["retry_now"],

      reason:
        "First failure: retry the same payment method.",
    };
  }

  return {
    actions: ["retry_later"],

    reason:
      "Repeated failure: retry the same payment method later.",
  };
}