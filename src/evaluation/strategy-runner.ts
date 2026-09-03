import type {
  Customer,
  EnvironmentState,
  PaymentMethod,
  RecoveryAction,
  RecoverySession,
  Transaction,
} from "../simulation/types.js";

import { executeRecoveryAction, executeCustomerSelectedMethod } from "../simulation/simulator.js";

import { evaluateFixedRetryBaseline } from "../recovery/baseline.js";

import { evaluateRecoveryActions } from "../recovery/decision-engine.js";

import { checkPolicy } from "../recovery/policy.js";

import { createSeededRandom } from "../simulation/random.js";

import type { StrategyResult } from "./types.js";

import { simulateCustomerChoice } from "../simulation/customer-response.js";

/**
 * Maximum number of recovery attempts (excluding
 * the original failed payment).
 *
 * The policy uses the same limit internally; this
 * is mirrored here to bound the runner's loop and
 * prevent runaway scenarios.
 */
const MAX_RECOVERY_ATTEMPTS = 3;

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

function isRecommendation(
  action: RecoveryAction
): boolean {
  return (
    action === "recommend_upi" ||
    action === "recommend_card" ||
    action === "recommend_net_banking" ||
    action === "recommend_wallet"
  );
}

function createSession(
  transaction: Transaction
): RecoverySession {
  return {
    id: `session-${transaction.id}`,
    transactionId: transaction.id,
    decisions: [],
    customerConstraints: [],
    status: "active",
    recoveredAmount: 0,
    startedAt: new Date().toISOString(),
  };
}

export function runBaseline(
  transaction: Transaction,
  customer: Customer,
  environment: EnvironmentState,
  seed: number,
): StrategyResult {
  let abstained = false;
  const random = createSeededRandom(seed);
  let currentTransaction = structuredClone(transaction);

  const actions: RecoveryAction[] = [];

  for (let step = 0; step < 3; step++) {
    const decision = evaluateFixedRetryBaseline(currentTransaction);

    const action = decision.actions[0];

    if (!action || action === "stop") {
      actions.push("stop");
      abstained = true;
      break;
    }

    actions.push(action);

    const outcome = executeRecoveryAction(
      currentTransaction,
      customer,
      environment,
      action,
      random,
    );

    if (outcome.success) {
      return {
        recovered: true,
        recoveredAmount: outcome.recoveredAmount,
        attempts: currentTransaction.attempts.length + 1,
        actions,
        abstained: false,
        customerInteractions: 0,
        policyViolations: 0,
        unnecessaryInterventions: 0,
      };
    }

    if (outcome.attempt) {
      currentTransaction = {
        ...currentTransaction,
        attempts: [...currentTransaction.attempts, outcome.attempt],
      };
    }
  }

  return {
    recovered: false,
    recoveredAmount: 0,
    attempts: currentTransaction.attempts.length,
    actions,
    abstained,
    customerInteractions: 0,
    policyViolations: 0,
    unnecessaryInterventions: 0,
  };
}

export function runRecoverIQ(
  transaction: Transaction,
  customer: Customer,
  environment: EnvironmentState,
  seed: number,
): StrategyResult {
  let customerInteractions = 0;
  let policyViolations = 0;
  let recoveryAttempts = 0;

  const random = createSeededRandom(seed);
  let currentTransaction = structuredClone(transaction);

  /**
   * The session persists across iterations so that
   * constraints recorded on a previous step
   * (for example, a rejected payment method) are
   * visible to the next decision.
   */
  const session = createSession(currentTransaction);

  const actions: RecoveryAction[] = [];

  while (recoveryAttempts < MAX_RECOVERY_ATTEMPTS) {
    const decision = evaluateRecoveryActions(
      currentTransaction,
      customer,
      environment,
      session,
    );

    const action = decision.recommendedAction;

    /*
     * Belt-and-suspenders policy check.
     *
     * The decision engine already filters out
     * policy-violating actions, so this should
     * never trigger in normal operation. If it
     * does, count the violation and stop.
     */
    const latestAttempt =
      currentTransaction.attempts[
        currentTransaction.attempts.length - 1
      ];

    if (latestAttempt) {
      const evaluatedAction = decision.actions.find(
        (item) => item.action === action,
      );

      const policy = checkPolicy(action, {
        amount: currentTransaction.amount,
        currentMethod: latestAttempt.method,
        failureType: latestAttempt.failureType ?? "unknown",
        previousAttempts: currentTransaction.attempts.length,
        session,
        confidence: evaluatedAction?.confidence ?? "low",
      });

      if (!policy.allowed) {
        policyViolations += 1;
        actions.push("stop");
        return {
          recovered: false,
          recoveredAmount: 0,
          attempts: currentTransaction.attempts.length,
          actions,
          abstained: true,
          customerInteractions,
          policyViolations,
          unnecessaryInterventions: 0,
        };
      }
    }

    actions.push(action);

    /*
     * The decision engine itself abstains.
     */
    if (action === "stop") {
      return {
        recovered: false,
        recoveredAmount: 0,
        attempts: currentTransaction.attempts.length,
        actions,
        abstained: true,
        customerInteractions,
        policyViolations,
        unnecessaryInterventions: 0,
      };
    }

    /*
     * ask_customer does not execute a payment.
     * It pauses the recovery for explicit
     * customer input and ends the runner.
     */
    if (action === "ask_customer") {
      customerInteractions += 1;
      return {
        recovered: false,
        recoveredAmount: 0,
        attempts: currentTransaction.attempts.length,
        actions,
        abstained: true,
        customerInteractions,
        policyViolations,
        unnecessaryInterventions: 0,
      };
    }

    /*
     * A recommendation is NOT a payment attempt.
     *
     * The customer must explicitly accept before
     * any payment is executed on the recommended
     * method. A rejection is recorded as a
     * session constraint and triggers a fresh
     * re-evaluation; the same method is never
     * re-recommended because the policy will
     * block it.
     */
    if (isRecommendation(action)) {
      customerInteractions += 1;

      const customerResponse = simulateCustomerChoice(
        customer,
        action,
        random,
      );

      if (!customerResponse.accepted) {
        const method = getMethodFromAction(action);

        if (method) {
          session.customerConstraints.push(
            `rejected:${method}`
          );
        }

        /*
         * Re-evaluate without consuming a
         * recovery attempt. The next iteration
         * will see the new constraint.
         */
        continue;
      }

      /*
       * Accepted. Use the customer's selected
       * method (which today equals the
       * recommended method, but this keeps the
       * runner agnostic to future conversational
       * flows such as "use my card instead").
       */
      const recommendedMethod = getMethodFromAction(action);
      const selectedMethod: PaymentMethod =
        customerResponse.selectedMethod ??
        recommendedMethod!;

      const outcome = executeCustomerSelectedMethod(
        currentTransaction,
        customer,
        environment,
        selectedMethod,
        random,
      );

      recoveryAttempts += 1;

      if (outcome.success) {
        return {
          recovered: true,
          recoveredAmount: outcome.recoveredAmount,
          attempts:
            currentTransaction.attempts.length + 1,
          actions,
          abstained: false,
          customerInteractions,
          policyViolations,
          unnecessaryInterventions: 0,
        };
      }

      if (outcome.attempt) {
        /*
         * The simulator's new attempt records
         * the selected method, allowing the
         * next decision to be based on the
         * current rail and failure.
         */
        currentTransaction = {
          ...currentTransaction,
          attempts: [
            ...currentTransaction.attempts,
            { ...outcome.attempt, method: selectedMethod },
          ],
        };
      }

      continue;
    }

    /*
     * retry_now or retry_later.
     */
    const outcome = executeRecoveryAction(
      currentTransaction,
      customer,
      environment,
      action,
      random,
    );

    recoveryAttempts += 1;

    if (outcome.success) {
      return {
        recovered: true,
        recoveredAmount: outcome.recoveredAmount,
        attempts: currentTransaction.attempts.length + 1,
        actions,
        abstained: false,
        customerInteractions,
        policyViolations,
        unnecessaryInterventions: 0,
      };
    }

    if (outcome.attempt) {
      currentTransaction = {
        ...currentTransaction,
        attempts: [...currentTransaction.attempts, outcome.attempt],
      };
    }
  }

  return {
    recovered: false,
    recoveredAmount: 0,
    attempts: currentTransaction.attempts.length,
    actions,
    abstained: false,
    customerInteractions,
    policyViolations,
    unnecessaryInterventions: 0,
  };
}
