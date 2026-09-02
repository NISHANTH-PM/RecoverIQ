import type {
  Customer,
  EnvironmentState,
  FailureType,
  PaymentMethod,
  RecoveryAction
} from "./types.js";

export interface HiddenOutcomeModel {
  retryNowSuccessProbability: number;
  retryLaterSuccessProbability: number;

  methodSuccessProbability: Record<
    PaymentMethod,
    number
  >;
}

function clamp(
  value: number,
  min = 0.02,
  max = 0.98
): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * Generates the TRUE probabilities used by the simulator.
 *
 * RecoverIQ never sees these values directly.
 */
export function generateHiddenOutcomeModel(
  customer: Customer,
  method: PaymentMethod,
  failureType: FailureType,
  environment: EnvironmentState
): HiddenOutcomeModel {
  const stats = customer.methodStats[method];

  const historicalRate =
    stats && stats.attempts > 0
      ? stats.successes / stats.attempts
      : 0.65;

  let methodProbability = historicalRate;

  // Current environment affects the real outcome.
  if (
    method === "upi" &&
    environment.upiHealth === "outage"
  ) {
    methodProbability -= 0.55;
  }

  if (
    method === "upi" &&
    environment.upiHealth === "degraded"
  ) {
    methodProbability -= 0.25;
  }

  if (
    method === "card" &&
    environment.cardNetworkHealth === "degraded"
  ) {
    methodProbability -= 0.20;
  }

  if (
    method === "net_banking" &&
    environment.netBankingHealth === "degraded"
  ) {
    methodProbability -= 0.20;
  }

  // Some failures are intrinsically harder to recover
  // from than others.
  switch (failureType) {
    case "hard_decline":
      methodProbability -= 0.45;
      break;

    case "insufficient_funds":
      methodProbability -= 0.30;
      break;

    case "authentication_failed":
      methodProbability -= 0.15;
      break;

    case "bank_timeout":
    case "network_error":
    case "upi_unavailable":
    case "issuer_unavailable":
      // These can often recover later.
      break;

    case "unknown":
      methodProbability -= 0.10;
      break;
  }

  methodProbability = clamp(
    methodProbability
  );

  // Immediate retry probability.
  let retryNow = methodProbability;

  // Temporary failures become more recoverable
  // after some time.
  let retryLater = methodProbability;

  switch (failureType) {
    case "bank_timeout":
    case "network_error":
    case "upi_unavailable":
    case "issuer_unavailable":
      retryNow -= 0.10;
      retryLater += 0.12;
      break;

    case "hard_decline":
      retryNow -= 0.25;
      retryLater -= 0.20;
      break;

    case "insufficient_funds":
      retryNow -= 0.20;
      retryLater -= 0.05;
      break;

    case "authentication_failed":
      retryNow -= 0.15;
      retryLater -= 0.10;
      break;

    case "unknown":
      retryNow -= 0.10;
      retryLater -= 0.05;
      break;
  }

  return {
    retryNowSuccessProbability: clamp(
      retryNow
    ),

    retryLaterSuccessProbability: clamp(
      retryLater
    ),

    methodSuccessProbability: {
      upi: method === "upi"
        ? methodProbability
        : getAlternativeMethodProbability(
            customer,
            "upi",
            environment
          ),

      card: method === "card"
        ? methodProbability
        : getAlternativeMethodProbability(
            customer,
            "card",
            environment
          ),

      net_banking: method === "net_banking"
        ? methodProbability
        : getAlternativeMethodProbability(
            customer,
            "net_banking",
            environment
          ),

      wallet: method === "wallet"
        ? methodProbability
        : getAlternativeMethodProbability(
            customer,
            "wallet",
            environment
          ),
    },
  };
}

function getAlternativeMethodProbability(
  customer: Customer,
  method: PaymentMethod,
  environment: EnvironmentState
): number {
  const stats = customer.methodStats[method];

  let probability =
    stats && stats.attempts > 0
      ? stats.successes / stats.attempts
      : 0.60;

  if (
    method === "upi" &&
    environment.upiHealth === "outage"
  ) {
    probability -= 0.55;
  }

  if (
    method === "upi" &&
    environment.upiHealth === "degraded"
  ) {
    probability -= 0.25;
  }

  if (
    method === "card" &&
    environment.cardNetworkHealth === "degraded"
  ) {
    probability -= 0.20;
  }

  if (
    method === "net_banking" &&
    environment.netBankingHealth === "degraded"
  ) {
    probability -= 0.20;
  }

  return clamp(probability);
}