import type {
  Customer,
  EnvironmentState,
  FailureType,
  PaymentMethod,
  RecoveryAction,
} from "./types";

export interface HiddenOutcomeModel {
  naturalRecoveryProbability: number;

  retryNowSuccessProbability: number;
  retryLaterSuccessProbability: number;

  methodSuccessProbability: Record<PaymentMethod, number>;
}

function clamp(value: number, min = 0.02, max = 0.98): number {
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
  environment: EnvironmentState,
): HiddenOutcomeModel {
  const stats = customer.methodStats[method];

  const historicalRate =
    stats && stats.attempts > 0 ? stats.successes / stats.attempts : 0.65;

  let methodProbability = historicalRate;

  // Current environment affects the real outcome.
  if (method === "upi" && environment.upiHealth === "outage") {
    methodProbability -= 0.55;
  }

  if (method === "upi" && environment.upiHealth === "degraded") {
    methodProbability -= 0.25;
  }

  if (method === "card" && environment.cardNetworkHealth === "degraded") {
    methodProbability -= 0.2;
  }

  if (method === "net_banking" && environment.netBankingHealth === "degraded") {
    methodProbability -= 0.2;
  }

  // Some failures are intrinsically harder to recover
  // from than others.
  switch (failureType) {
    case "hard_decline":
      methodProbability -= 0.45;
      break;

    case "insufficient_funds":
      methodProbability -= 0.3;
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
      methodProbability -= 0.1;
      break;
  }

  methodProbability = clamp(methodProbability);

  let naturalRecovery = methodProbability * 0.7;

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
      retryNow -= 0.1;
      retryLater += 0.12;
      break;

    case "hard_decline":
      retryNow -= 0.25;
      retryLater -= 0.2;
      break;

    case "insufficient_funds":
      retryNow -= 0.2;
      retryLater -= 0.05;
      break;

    case "authentication_failed":
      retryNow -= 0.15;
      retryLater -= 0.1;
      break;

    case "unknown":
      retryNow -= 0.1;
      retryLater -= 0.05;
      break;
  }

  switch (failureType) {
    case "bank_timeout":
    case "network_error":
    case "upi_unavailable":
    case "issuer_unavailable":
      naturalRecovery += 0.05;
      break;

    case "hard_decline":
      naturalRecovery -= 0.15;
      break;

    case "insufficient_funds":
      naturalRecovery -= 0.1;
      break;

    case "authentication_failed":
      naturalRecovery -= 0.08;
      break;

    case "unknown":
      naturalRecovery -= 0.05;
      break;
  }

  naturalRecovery = clamp(naturalRecovery);

  return {
    naturalRecoveryProbability: naturalRecovery,

    retryNowSuccessProbability: clamp(retryNow),

    retryLaterSuccessProbability: clamp(retryLater),

    methodSuccessProbability: {
      upi:
        method === "upi"
          ? methodProbability
          : getAlternativeMethodProbability(customer, "upi", environment),

      card:
        method === "card"
          ? methodProbability
          : getAlternativeMethodProbability(customer, "card", environment),

      net_banking:
        method === "net_banking"
          ? methodProbability
          : getAlternativeMethodProbability(
              customer,
              "net_banking",
              environment,
            ),

      wallet:
        method === "wallet"
          ? methodProbability
          : getAlternativeMethodProbability(customer, "wallet", environment),
    },
  };
}

function getAlternativeMethodProbability(
  customer: Customer,
  method: PaymentMethod,
  environment: EnvironmentState,
): number {
  const stats = customer.methodStats[method];

  let probability =
    stats && stats.attempts > 0 ? stats.successes / stats.attempts : 0.6;

  if (method === "upi" && environment.upiHealth === "outage") {
    probability -= 0.55;
  }

  if (method === "upi" && environment.upiHealth === "degraded") {
    probability -= 0.25;
  }

  if (method === "card" && environment.cardNetworkHealth === "degraded") {
    probability -= 0.2;
  }

  if (method === "net_banking" && environment.netBankingHealth === "degraded") {
    probability -= 0.2;
  }

  return clamp(probability);
}

export function getNoInterventionSuccessProbability(
  customer: Customer,
  method: PaymentMethod,
  failureType: FailureType,
  environment: EnvironmentState,
): number {
  const model = generateHiddenOutcomeModel(
    customer,
    method,
    failureType,
    environment,
  );

  return model.naturalRecoveryProbability;
}

export function simulateNoInterventionOutcome(
  customer: Customer,
  method: PaymentMethod,
  failureType: FailureType,
  environment: EnvironmentState,
  random: () => number,
): boolean {
  const probability = getNoInterventionSuccessProbability(
    customer,
    method,
    failureType,
    environment,
  );

  return random() < probability;
}
