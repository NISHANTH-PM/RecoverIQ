import type {
  Customer,
  EnvironmentState,
  FailureType,
  PaymentMethod,
  RecoveryAction,
  RecoverySession,
  Transaction,
} from "../simulation/types.js";

import {
  estimateMethodSuccessProbability,
  estimateRetryNowProbability,
  estimateRetryLaterProbability,
} from "./probability.js";

import {
  calculateENV,
  type ENVEstimate,
} from "./env.js";

import {
  checkPolicy,
  type PolicyDecision,
} from "./policy.js";

export interface EvaluatedAction {
  action: RecoveryAction;

  probability: number;

  confidence: "high" | "medium" | "low";

  env: number;

  envEstimate: ENVEstimate;

  policyAllowed: boolean;

  policyReason: string;

  probabilityReasons: string[];
}

export interface DecisionResult {
  recommendedAction: RecoveryAction;

  reason: string;

  actions: EvaluatedAction[];
}

const MIN_ENV_THRESHOLD = 10;

function getRecommendationAction(
  method: PaymentMethod
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

export function evaluateRecoveryActions(
  transaction: Transaction,
  customer: Customer,
  environment: EnvironmentState,
  session: RecoverySession
): DecisionResult {
  /*
   * A transaction may contain multiple attempts.
   * The most recent attempt tells us the current
   * payment method and failure reason.
   */

  const lastAttempt =
    transaction.attempts[
      transaction.attempts.length - 1
    ];

  if (!lastAttempt) {
    return {
      recommendedAction: "stop",
      reason:
        "No payment attempt exists for this transaction.",
      actions: [],
    };
  }

  const currentMethod =
    lastAttempt.method;

  const failureType: FailureType =
    lastAttempt.failureType ?? "unknown";

  const previousAttempts =
    transaction.attempts.length;

  const candidates: EvaluatedAction[] = [];

  /*
   * --------------------------------------------------
   * 1. Retry now
   * --------------------------------------------------
   */

  const retryNowEstimate =
    estimateRetryNowProbability(
      customer,
      currentMethod,
      failureType,
      environment,
      previousAttempts
    );

  const retryNowENV =
    calculateENV(
      "retry_now",
      {
        amount: transaction.amount,
        currentMethod,
        probabilityEstimate: retryNowEstimate,
        previousAttempts,
      }
    );

  candidates.push({
    action: "retry_now",

    probability:
      retryNowEstimate.probability,

    confidence:
      retryNowEstimate.confidence,

    env:
      retryNowENV.env,

    envEstimate:
      retryNowENV,

    policyAllowed: false,

    policyReason: "",

    probabilityReasons:
      retryNowEstimate.reasons,
  });

  /*
   * --------------------------------------------------
   * 2. Retry later
   * --------------------------------------------------
   */

  const retryLaterEstimate =
    estimateRetryLaterProbability(
      customer,
      currentMethod,
      failureType,
      environment,
      previousAttempts
    );

  const retryLaterENV =
    calculateENV(
      "retry_later",
      {
        amount: transaction.amount,
        currentMethod,
        probabilityEstimate:
          retryLaterEstimate,
        previousAttempts,
      }
    );

  candidates.push({
    action: "retry_later",

    probability:
      retryLaterEstimate.probability,

    confidence:
      retryLaterEstimate.confidence,

    env:
      retryLaterENV.env,

    envEstimate:
      retryLaterENV,

    policyAllowed: false,

    policyReason: "",

    probabilityReasons:
      retryLaterEstimate.reasons,
  });

  /*
   * --------------------------------------------------
   * 3. Alternative payment methods
   * --------------------------------------------------
   */

  const alternativeMethods =
    customer.availablePaymentMethods.filter(
      (method) =>
        method !== currentMethod
    );

  for (const method of alternativeMethods) {
    const action =
      getRecommendationAction(method);

    const probabilityEstimate =
      estimateMethodSuccessProbability(
        customer,
        method,
        failureType,
        environment
      );

    const envEstimate =
      calculateENV(
        action,
        {
          amount: transaction.amount,
          currentMethod,
          probabilityEstimate,
          previousAttempts,
        }
      );

    candidates.push({
      action,

      probability:
        probabilityEstimate.probability,

      confidence:
        probabilityEstimate.confidence,

      env:
        envEstimate.env,

      envEstimate,

      policyAllowed: false,

      policyReason: "",

      probabilityReasons:
        probabilityEstimate.reasons,
    });
  }

  /*
   * --------------------------------------------------
   * 4. Apply policy to EVERY candidate
   * --------------------------------------------------
   */

  for (const candidate of candidates) {
    const policyDecision: PolicyDecision =
      checkPolicy(
        candidate.action,
        {
          amount: transaction.amount,

          currentMethod,

          failureType,

          previousAttempts,

          session,

          confidence:
            candidate.confidence,
        }
      );

    candidate.policyAllowed =
      policyDecision.allowed;

    candidate.policyReason =
      policyDecision.reason;
  }

  /*
   * --------------------------------------------------
   * 5. Remove policy-blocked actions
   * --------------------------------------------------
   */

  const allowedActions =
    candidates.filter(
      (candidate) =>
        candidate.policyAllowed
    );

  /*
   * --------------------------------------------------
   * 6. If nothing is permitted, stop
   * --------------------------------------------------
   */

  if (allowedActions.length === 0) {
    return {
      recommendedAction: "stop",

      reason:
        "No recovery action is currently permitted by policy.",

      actions: candidates,
    };
  }

  /*
   * --------------------------------------------------
   * 7. Rank permitted actions by ENV
   * --------------------------------------------------
   */

  allowedActions.sort(
    (a, b) => b.env - a.env
  );

  const bestAction =
    allowedActions[0];

  /*
   * --------------------------------------------------
   * 8. Abstention
   * --------------------------------------------------
   *
   * Even if an action is technically allowed,
   * we should not recommend it if its expected
   * value is too low.
   */

  if (
    bestAction.env <
    MIN_ENV_THRESHOLD
  ) {
    return {
      recommendedAction: "stop",

      reason:
        "No permitted recovery action has sufficient expected value.",

      actions: candidates,
    };
  }

  /*
   * --------------------------------------------------
   * 9. Return the best permitted action
   * --------------------------------------------------
   */

  return {
    recommendedAction:
      bestAction.action,

    reason:
      `${bestAction.envEstimate.explanation} ` +
      `${bestAction.probabilityReasons.join(" ")}`,

    actions: candidates,
  };
}