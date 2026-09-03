import type {
  EnvironmentState,
  FailureType,
  PaymentAttempt,
  PaymentMethod,
} from "./types.js";

import type { Random } from "./random.js";

function randomFloat(random:  Random): number {
  return random();
}

function weightedChoice(
  choices: { value: FailureType; weight: number }[],
  random: Random
): FailureType {
  const totalWeight = choices.reduce(
    (sum, choice) => sum + choice.weight,
    0
  );

  let randomValue = randomFloat(random) * totalWeight;

  for (const choice of choices) {
    randomValue -= choice.weight;

    if (randomValue <= 0) {
      return choice.value;
    }
  }

  return choices[choices.length - 1].value;
}

function generateUPIFailure(
  environment: EnvironmentState,
  random: Random
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

  return weightedChoice(
    choices,
    random
  );
}

function generateCardFailure(
  environment: EnvironmentState,
  random: Random
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

  return weightedChoice(choices, random);
}

function generateNetBankingFailure(
  random: Random
): FailureType {
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
  ], random);
}

function generateWalletFailure(
  random: Random
): FailureType {
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
  ], random);
}

export function generateFailureType(
  method: PaymentMethod,
  environment: EnvironmentState,
  random: Random
): FailureType {
  switch (method) {
    case "upi":
      return generateUPIFailure(environment, random);

    case "card":
      return generateCardFailure(environment, random);

    case "net_banking":
      return generateNetBankingFailure(random);

    case "wallet":
      return generateWalletFailure(random);
  }
}

export function applyFailure(
  attempt: PaymentAttempt,
  environment: EnvironmentState,
  random: Random
): PaymentAttempt {
  const failureType = generateFailureType(
    attempt.method,
    environment,
    random
  );

  return {
    ...attempt,
    status: "failed",
    failureType,
  };
}