import type {
  Customer,
  PaymentMethod,
  RecoveryAction,
} from "./types";

export interface CustomerResponse {
  accepted: boolean;
  selectedMethod?: PaymentMethod;
  reason: string;
}

function getMethodFromAction(
  action: RecoveryAction,
): PaymentMethod | null {
  switch (action) {
    case "recommend_upi":
      return "upi";

    case "recommend_card":
      return "card";

    case "recommend_net_banking":
      return "net_banking";

    case "recommend_wallet":
      return "wallet";

    default:
      return null;
  }
}

export function simulateCustomerChoice(
  customer: Customer,
  action: RecoveryAction,
  random: () => number,
): CustomerResponse {
  const recommendedMethod =
    getMethodFromAction(action);

  if (!recommendedMethod) {
    return {
      accepted: false,
      reason: "Action is not a payment-method recommendation.",
    };
  }

  if (
    !customer.availablePaymentMethods.includes(
      recommendedMethod,
    )
  ) {
    return {
      accepted: false,
      reason:
        "Recommended payment method is not available to the customer.",
    };
  }

  const stats =
    customer.methodStats[recommendedMethod];

  const historicalSuccessRate =
    stats && stats.attempts > 0
      ? stats.successes / stats.attempts
      : 0.60;

  /*
   * Customers are more likely to accept
   * recommendations for methods they have
   * successfully used before.
   */
  const acceptanceProbability =
    Math.min(
      0.90,
      Math.max(
        0.25,
        0.30 + historicalSuccessRate * 0.60,
      ),
    );

  const accepted =
    random() < acceptanceProbability;

  return {
    accepted,
    selectedMethod:
      accepted
        ? recommendedMethod
        : undefined,
    reason: accepted
      ? "Customer accepted the recommended payment method."
      : "Customer did not accept the recommendation.",
  };
}
