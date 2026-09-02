import type {
  Customer,
  EnvironmentState,
  FailureType,
  PaymentMethod,
} from "../simulation/types.js";

export interface ProbabilityEstimate {
  probability: number;
  confidence: "high" | "medium" | "low";
  reasons: string[];
}

function clamp(
  value: number,
  min = 0.02,
  max = 0.98
): number {
  return Math.min(max, Math.max(min, value));
}

function getHistoricalSuccessRate(
  customer: Customer,
  method: PaymentMethod
): {
  rate: number;
  attempts: number;
} {
  const stats = customer.methodStats[method];

  if (!stats || stats.attempts === 0) {
    return {
      rate: 0.60,
      attempts: 0,
    };
  }

  return {
    rate: stats.successes / stats.attempts,
    attempts: stats.attempts,
  };
}

function determineConfidence(
  attempts: number
): "high" | "medium" | "low" {
  if (attempts >= 10) {
    return "high";
  }

  if (attempts >= 5) {
    return "medium";
  }

  return "low";
}

export function estimateMethodSuccessProbability(
  customer: Customer,
  method: PaymentMethod,
  failureType: FailureType,
  environment: EnvironmentState
): ProbabilityEstimate {
  const historical =
    getHistoricalSuccessRate(
      customer,
      method
    );

  let probability = historical.rate;

  const reasons: string[] = [];

  if (historical.attempts === 0) {
    reasons.push(
      "No historical data for this payment method."
    );
  } else {
    reasons.push(
      `Historical success rate for ${method}: ${Math.round(
        historical.rate * 100
      )}%.`
    );
  }

  /*
   * Environment adjustments
   */

  if (
    method === "upi" &&
    environment.upiHealth === "outage"
  ) {
    probability -= 0.45;

    reasons.push(
      "UPI is currently experiencing an outage."
    );
  }

  if (
    method === "upi" &&
    environment.upiHealth === "degraded"
  ) {
    probability -= 0.20;

    reasons.push(
      "UPI is currently degraded."
    );
  }

  if (
    method === "card" &&
    environment.cardNetworkHealth === "degraded"
  ) {
    probability -= 0.15;

    reasons.push(
      "Card network is currently degraded."
    );
  }

  if (
    method === "net_banking" &&
    environment.netBankingHealth === "degraded"
  ) {
    probability -= 0.15;

    reasons.push(
      "Net Banking is currently degraded."
    );
  }

  /*
   * Failure-specific adjustments
   */

  switch (failureType) {
    case "hard_decline":
      probability -= 0.30;

      reasons.push(
        "Hard declines are less likely to recover through the same method."
      );
      break;

    case "insufficient_funds":
      probability -= 0.20;

      reasons.push(
        "Insufficient funds reduce immediate recovery likelihood."
      );
      break;

    case "authentication_failed":
      probability -= 0.10;

      reasons.push(
        "Authentication failure reduces immediate recovery likelihood."
      );
      break;

    case "bank_timeout":
    case "network_error":
    case "upi_unavailable":
    case "issuer_unavailable":
      reasons.push(
        "This failure may be temporary and recoverable."
      );
      break;

    case "unknown":
      probability -= 0.05;

      reasons.push(
        "Unknown failure reason reduces confidence."
      );
      break;
  }

  return {
    probability: clamp(probability),

    confidence:
      determineConfidence(
        historical.attempts
      ),

    reasons,
  };
}

export function estimateRetryNowProbability(
  customer: Customer,
  method: PaymentMethod,
  failureType: FailureType,
  environment: EnvironmentState,
  previousAttempts: number
): ProbabilityEstimate {
  const base =
    estimateMethodSuccessProbability(
      customer,
      method,
      failureType,
      environment
    );

  let probability =
    base.probability;

  const reasons = [
    ...base.reasons,
  ];

  /*
   * Repeated attempts using the same method
   * reduce the value of another immediate retry.
   */

  if (previousAttempts >= 2) {
    probability -= 0.15;

    reasons.push(
      "The same payment method has already failed multiple times."
    );
  } else if (previousAttempts === 1) {
    probability -= 0.05;

    reasons.push(
      "The payment method has already failed once."
    );
  }

  /*
   * Temporary infrastructure failures are
   * generally better suited to waiting.
   */

  if (
    failureType === "bank_timeout" ||
    failureType === "network_error" ||
    failureType === "upi_unavailable" ||
    failureType === "issuer_unavailable"
  ) {
    probability -= 0.10;

    reasons.push(
      "Immediate retry may be less effective for a temporary failure."
    );
  }

  /*
   * Hard declines should strongly discourage
   * another immediate retry.
   */

  if (failureType === "hard_decline") {
    probability -= 0.20;

    reasons.push(
      "Hard decline makes another immediate retry unlikely to help."
    );
  }

  return {
    probability: clamp(probability),

    confidence: base.confidence,

    reasons,
  };
}

export function estimateRetryLaterProbability(
  customer: Customer,
  method: PaymentMethod,
  failureType: FailureType,
  environment: EnvironmentState,
  previousAttempts: number
): ProbabilityEstimate {
  const base =
    estimateMethodSuccessProbability(
      customer,
      method,
      failureType,
      environment
    );

  let probability =
    base.probability;

  const reasons = [
    ...base.reasons,
  ];

  if (
    failureType === "bank_timeout" ||
    failureType === "network_error" ||
    failureType === "upi_unavailable" ||
    failureType === "issuer_unavailable"
  ) {
    probability += 0.12;

    reasons.push(
      "Waiting may improve recovery chances for a temporary failure."
    );
  }

  if (previousAttempts >= 2) {
    probability -= 0.05;

    reasons.push(
      "Repeated failures reduce confidence in continuing with the same method."
    );
  }

  return {
    probability: clamp(probability),

    confidence: base.confidence,

    reasons,
  };
}