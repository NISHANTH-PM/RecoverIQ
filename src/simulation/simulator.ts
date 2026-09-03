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

import {
  generateEnvironment,
} from "./environment.js";

import {
  createSeededRandom,
} from "./random.js";

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

function getRecommendationAction(
  method: PaymentMethod,
): RecoveryAction {
  switch (method) {
    case "upi":
      return "recommend_upi";
    case "card":
      return "recommend_card";
    case "net_banking":
      return "recommend_net_banking";
    case "wallet":
      return "recommend_wallet";
  }
}

function applyInitialFailures(
  transactions: Transaction[],
  environment: EnvironmentState,
  random: () => number
): Transaction[] {
  return transactions.map(
    (transaction): Transaction => {
      const initialAttempt =
        transaction.attempts[0];

      if (!initialAttempt) {
        return transaction;
      }

      const failedAttempt = 
        applyFailure(
          initialAttempt,
          environment,
          random
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
  transactionCount: number,
  seed: number = 42
): SimulationWorld {
  const random = createSeededRandom(seed);
  const customers =
    generateCustomers(
    customerCount,
    random
  );
  const merchants =
    generateMerchants(merchantCount,random);

  const environment =
    generateEnvironment(random);

  const pendingTransactions =
    generateTransactions(
      transactionCount,
      customers,
      merchants,
      random
    );

  const transactions =
    applyInitialFailures(
      pendingTransactions,
      environment,
      random
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
  action: RecoveryAction,
  random: () => number = Math.random
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

  const failureType =
    currentAttempt.failureType ?? "unknown";

  const outcomeModel =
    generateHiddenOutcomeModel(
      customer,
      currentAttempt.method,
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
    return {
      action,
      success: false,
      recoveredAmount: 0,
      reason:
        "Payment-method recommendations require explicit customer acceptance before any payment attempt is executed.",
    };
  }

  const success =
    random() < successProbability;

  const newAttemptNumber =
    transaction.attempts.length + 1;

  const newAttempt: PaymentAttempt = {
    id:
      `${transaction.id}_ATTEMPT_${newAttemptNumber}`,

    transactionId: transaction.id,

    method: currentAttempt.method,

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

export function executeCustomerSelectedMethod(
  transaction: Transaction,
  customer: Customer,
  environment: EnvironmentState,
  method: PaymentMethod,
  random: () => number = Math.random
): RecoveryResult {
  const currentAttempt =
    transaction.attempts[
      transaction.attempts.length - 1
    ];

  if (!currentAttempt) {
    return {
      action: getRecommendationAction(method),
      success: false,
      recoveredAmount: 0,
      reason: "No payment attempt exists.",
    };
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

  const success =
    random() <
    outcomeModel.methodSuccessProbability[
      method
    ];

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
    action: getRecommendationAction(method),
    success,
    recoveredAmount:
      success ? transaction.amount : 0,
    attempt: newAttempt,
    reason: success
      ? "Customer accepted the recommendation and the selected payment method recovered successfully."
      : "Customer accepted the recommendation, but the selected payment method did not recover the payment.",
  };
}
