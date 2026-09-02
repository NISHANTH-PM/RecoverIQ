import type {
  EnvironmentState,
  FailureType,
  PaymentAttempt,
  PaymentMethod,
} from "./types.js";

function randomFloat(): number {
  return Math.random();
}

function weightedChoice(
  choices: { value: FailureType; weight: number }[]
): FailureType {
  const totalWeight = choices.reduce(
    (sum, choice) => sum + choice.weight,
    0
  );

  let random = randomFloat() * totalWeight;

  for (const choice of choices) {
    random -= choice.weight;

    if (random <= 0) {
      return choice.value;
    }
  }

  return choices[choices.length - 1].value;
}

function generateUPIFailure(
  environment: EnvironmentState
): FailureType {
  const choices: {
    value: FailureType;
    weight: number;
  }[] = [
    {
      value: "bank_timeout",
      weight: 20,
    },
    {
      value: "network_error",
      weight: 15,
    },
    {
      value: "authentication_failed",
      weight: 8,
    },
    {
      value: "upi_unavailable",
      weight:
        environment.upiHealth === "outage"
          ? 55
          : environment.upiHealth === "degraded"
            ? 30
            : 8,
    },
    {
      value: "insufficient_funds",
      weight: 12,
    },
  ];

  return weightedChoice(choices);
}

function generateCardFailure(
  environment: EnvironmentState
): FailureType {
  const choices: {
    value: FailureType;
    weight: number;
  }[] = [
    {
      value: "issuer_unavailable",
      weight:
        environment.cardNetworkHealth === "degraded"
          ? 25
          : 10,
    },
    {
      value: "network_error",
      weight: 12,
    },
    {
      value: "insufficient_funds",
      weight: 15,
    },
    {
      value: "authentication_failed",
      weight: 10,
    },
    {
      value: "hard_decline",
      weight: 8,
    },
  ];

  return weightedChoice(choices);
}

function generateNetBankingFailure(): FailureType {
  return weightedChoice([
    {
      value: "bank_timeout",
      weight: 35,
    },
    {
      value: "network_error",
      weight: 15,
    },
    {
      value: "authentication_failed",
      weight: 15,
    },
    {
      value: "insufficient_funds",
      weight: 10,
    },
  ]);
}

function generateWalletFailure(): FailureType {
  return weightedChoice([
    {
      value: "network_error",
      weight: 25,
    },
    {
      value: "issuer_unavailable",
      weight: 20,
    },
    {
      value: "authentication_failed",
      weight: 15,
    },
    {
      value: "insufficient_funds",
      weight: 15,
    },
  ]);
}

export function generateFailureType(
  method: PaymentMethod,
  environment: EnvironmentState
): FailureType {
  switch (method) {
    case "upi":
      return generateUPIFailure(environment);

    case "card":
      return generateCardFailure(environment);

    case "net_banking":
      return generateNetBankingFailure();

    case "wallet":
      return generateWalletFailure();
  }
}

export function applyFailure(
  attempt: PaymentAttempt,
  environment: EnvironmentState
): PaymentAttempt {
  const failureType = generateFailureType(
    attempt.method,
    environment
  );

  return {
    ...attempt,
    status: "failed",
    failureType,
  };
}