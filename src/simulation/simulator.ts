import type {
  Customer,
  EnvironmentState,
  Merchant,
  PaymentAttempt,
  Transaction,
  PaymentMethod,
  RecoveryAction
} from "./types.js";

import {
  generateCustomers,
} from "./customers.js";

import {
  generateMerchants,
} from "./merchants.js";

import {
  generateTransactions,
} from "./transactions.js";

import {
  applyFailure,
} from "./failure-generator.js";

import {
  generateHiddenOutcomeModel,
} from "./outcome-model.js";

export interface SimulationWorld {
  customers: Customer[];
  merchants: Merchant[];
  transactions: Transaction[];
  environment: EnvironmentState;
}

export interface RecoveryResult {
  action: RecoveryAction;
  success: boolean;
  recoveredAmount: number;
  attempt?: PaymentAttempt;
  reason: string;
}

function generateEnvironment(): EnvironmentState {
  const healthStates = [
    "healthy",
    "healthy",
    "healthy",
    "degraded",
    "outage",
  ] as const;

  return {
    upiHealth:
      healthStates[
        Math.floor(Math.random() * healthStates.length)
      ],

    cardNetworkHealth:
      Math.random() > 0.9
        ? "degraded"
        : "healthy",

    netBankingHealth:
      Math.random() > 0.9
        ? "degraded"
        : "healthy",

    hourOfDay: Math.floor(
      Math.random() * 24
    ),
  };
}

function applyInitialFailures(
  transactions: Transaction[],
  environment: EnvironmentState
): Transaction[] {
  return transactions.map(
    (transaction): Transaction => {
      const initialAttempt =
        transaction.attempts[0];

      if (!initialAttempt) {
        return transaction;
      }

      const failedAttempt: PaymentAttempt =
        applyFailure(
          initialAttempt,
          environment
        );

      return {
        ...transaction,

        status: "failed",

        attempts: [
          failedAttempt,
        ],
      };
    }
  );
}

export function createSimulationWorld(
  customerCount: number,
  merchantCount: number,
  transactionCount: number
): SimulationWorld {
  const customers =
    generateCustomers(customerCount);

  const merchants =
    generateMerchants(merchantCount);

  const environment =
    generateEnvironment();

  const pendingTransactions =
    generateTransactions(
      transactionCount,
      customers,
      merchants
    );

  const transactions =
    applyInitialFailures(
      pendingTransactions,
      environment
    );

  return {
    customers,
    merchants,
    transactions,
    environment,
  };
}

function getMethodFromAction(
  action: RecoveryAction
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

export function executeRecoveryAction(
  transaction: Transaction,
  customer: Customer,
  environment: EnvironmentState,
  action: RecoveryAction
): RecoveryResult {
  const currentAttempt =
    transaction.attempts[
      transaction.attempts.length - 1
    ];

  if (!currentAttempt) {
    return {
      action,
      success: false,
      recoveredAmount: 0,
      reason: "No payment attempt exists.",
    };
  }

  if (
    action === "stop" ||
    action === "ask_customer"
  ) {
    return {
      action,
      success: false,
      recoveredAmount: 0,
      reason:
        action === "stop"
          ? "Recovery stopped."
          : "Waiting for customer input.",
    };
  }

  let method: PaymentMethod =
    currentAttempt.method;

  const recommendedMethod =
    getMethodFromAction(action);

  if (recommendedMethod) {
    method = recommendedMethod;
  }

  const failureType =
    currentAttempt.failureType ?? "unknown";

  const outcomeModel =
    generateHiddenOutcomeModel(
      customer,
      method,
      failureType,
      environment
    );

  let successProbability: number;

  if (action === "retry_now") {
    successProbability =
      outcomeModel.retryNowSuccessProbability;
  } else if (action === "retry_later") {
    successProbability =
      outcomeModel.retryLaterSuccessProbability;
  } else {
    successProbability =
      outcomeModel.methodSuccessProbability[
        method
      ];
  }

  const success =
    Math.random() < successProbability;

  const newAttemptNumber =
    transaction.attempts.length + 1;

  const newAttempt: PaymentAttempt = {
    id:
      `${transaction.id}_ATTEMPT_${newAttemptNumber}`,

    transactionId: transaction.id,

    method,

    amount: transaction.amount,

    status: success
      ? "success"
      : "failed",

    timestamp: new Date().toISOString(),

    ...(success
      ? {}
      : {
          failureType:
            currentAttempt.failureType,
        }),
  };

  return {
    action,

    success,

    recoveredAmount:
      success ? transaction.amount : 0,

    attempt: newAttempt,

    reason: success
      ? "Payment recovered successfully."
      : "Recovery action did not recover the payment.",
  };
}