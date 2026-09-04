import { createSimulationWorld } from "../simulation/simulator";

import { runBaseline, runRecoverIQ } from "./strategy-runner";

import type {
  EvaluationScenario,
  EvaluationSummary,
  ScenarioComparison,
} from "./types";

import { createEvaluationSplit } from "./split";

import { createSeededRandom } from "../simulation/random";

import {
  getNoInterventionSuccessProbability,
  simulateNoInterventionOutcome,
} from "../simulation/outcome-model";

export function evaluateScenario(seed: number): ScenarioComparison {
  const world = createSimulationWorld(10, 5, 1, seed);

  const transaction = world.transactions[0];

  if (!transaction) {
    throw new Error("Simulation did not generate a transaction.");
  }

  const customer = world.customers.find(
    (item) => item.id === transaction.customerId,
  );

  if (!customer) {
    throw new Error("Customer for transaction not found.");
  }

  const latestAttempt = transaction.attempts[transaction.attempts.length - 1];

  if (!latestAttempt) {
    throw new Error("Transaction has no initial payment attempt.");
  }

  const counterfactualRandom = createSeededRandom(seed + 1_000_000);

  const naturalRecoveryProbability = getNoInterventionSuccessProbability(
    customer,
    latestAttempt.method,
    latestAttempt.failureType ?? "unknown",
    world.environment,
  );

  const wouldHaveRecoveredWithoutIntervention = simulateNoInterventionOutcome(
    customer,
    latestAttempt.method,
    latestAttempt.failureType ?? "unknown",
    world.environment,
    counterfactualRandom,
  );

  const scenario: EvaluationScenario = {
    seed,
    transactionId: transaction.id,
    amount: transaction.amount,
  };

  const baseline = runBaseline(transaction, customer, world.environment, seed);

  const recoverIQ = runRecoverIQ(
    transaction,
    customer,
    world.environment,
    seed,
  );

  const interventionActions = new Set([
    "retry_now",
    "retry_later",
    "recommend_upi",
    "recommend_card",
    "recommend_net_banking",
    "recommend_wallet",
  ]);

  const recoverIQIntervened = recoverIQ.actions.some((action) =>
    interventionActions.has(action),
  );

  /*
   * Binary single-draw counterfactual.
   * Kept for diagnostic and simulation use,
   * but NOT used by the summary metric.
   */
  const unnecessaryIntervention =
    recoverIQIntervened && wouldHaveRecoveredWithoutIntervention;

  /*
   * Expected-value counterfactual.
   *
   * A single coin flip cannot defensibly
   * classify an intervention as "unnecessary".
   * The simulator, however, exposes a true
   * natural recovery probability for the
   * transaction. We use that probability
   * directly as the expected value of an
   * "unnecessary intervention" event when
   * RecoverIQ did intervene. This:
   *
   *  - has no arbitrary threshold,
   *  - is grounded in the simulator's
   *    hidden model,
   *  - is linear in the natural recovery
   *    probability, so it is a proper
   *    defensible expectation.
   */
  const expectedUnnecessaryIntervention = recoverIQIntervened
    ? naturalRecoveryProbability
    : 0;

  return {
    scenario,
    baseline,
    recoverIQ,
    naturalRecoveryProbability,
    wouldHaveRecoveredWithoutIntervention,
    unnecessaryIntervention,
    expectedUnnecessaryIntervention,
  };
}

export function evaluateSeeds(seeds: number[]): ScenarioComparison[] {
  return seeds.map(evaluateScenario);
}

export function summarizeEvaluation(
  comparisons: ScenarioComparison[],
): EvaluationSummary {
  const scenarios = comparisons.length;

  if (scenarios === 0) {
    return {
      scenarios: 0,
      baselineRecoveredRevenue: 0,
      recoverIQRecoveredRevenue: 0,
      incrementalRecoveredRevenue: 0,
      baselineRecoveryRate: 0,
      recoverIQRecoveryRate: 0,
      baselineAverageAttempts: 0,
      recoverIQAverageAttempts: 0,
      unnecessaryInterventionRate: 0,
    };
  }

  const baselineRecoveredRevenue = comparisons.reduce(
    (sum, item) => sum + item.baseline.recoveredAmount,
    0,
  );

  const recoverIQRecoveredRevenue = comparisons.reduce(
    (sum, item) => sum + item.recoverIQ.recoveredAmount,
    0,
  );

  const baselineRecovered = comparisons.filter(
    (item) => item.baseline.recovered,
  ).length;

  const recoverIQRecovered = comparisons.filter(
    (item) => item.recoverIQ.recovered,
  ).length;

  const baselineAttempts = comparisons.reduce(
    (sum, item) => sum + item.baseline.attempts,
    0,
  );

  const recoverIQAttempts = comparisons.reduce(
    (sum, item) => sum + item.recoverIQ.attempts,
    0,
  );

  const unnecessaryInterventions = comparisons.reduce(
    (sum, item) =>
      sum + item.expectedUnnecessaryIntervention,
    0,
  );

  return {
    scenarios,

    baselineRecoveredRevenue,

    recoverIQRecoveredRevenue,

    incrementalRecoveredRevenue:
      recoverIQRecoveredRevenue - baselineRecoveredRevenue,

    baselineRecoveryRate: baselineRecovered / scenarios,

    recoverIQRecoveryRate: recoverIQRecovered / scenarios,

    baselineAverageAttempts: baselineAttempts / scenarios,

    recoverIQAverageAttempts: recoverIQAttempts / scenarios,

    unnecessaryInterventionRate:
      unnecessaryInterventions / scenarios,
  };
}

export function evaluateSplit(totalScenarios: number, seed: number = 2026) {
  const split = createEvaluationSplit(totalScenarios, seed);

  const development = evaluateSeeds(split.development);

  const validation = evaluateSeeds(split.validation);

  const holdout = evaluateSeeds(split.holdout);

  return {
    development: {
      comparisons: development,
      summary: summarizeEvaluation(development),
    },

    validation: {
      comparisons: validation,
      summary: summarizeEvaluation(validation),
    },

    holdout: {
      comparisons: holdout,
      summary: summarizeEvaluation(holdout),
    },
  };
}
