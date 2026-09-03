import type { RecoveryAction } from "../simulation/types.js";

export interface StrategyResult {
  recovered: boolean;
  recoveredAmount: number;
  attempts: number;
  actions: RecoveryAction[];

  abstained: boolean;
  customerInteractions: number;
  policyViolations: number;
  unnecessaryInterventions: number;
}

export interface EvaluationScenario {
  seed: number;
  transactionId: string;
  amount: number;
}

export interface ScenarioComparison {
  scenario: EvaluationScenario;
  baseline: StrategyResult;
  recoverIQ: StrategyResult;
  naturalRecoveryProbability: number;

  /**
   * Single noisy draw of the counterfactual
   * ("would this transaction have recovered
   * naturally?"). Retained for simulation and
   * diagnostic use; the summary metric does
   * NOT rely on it.
   */
  wouldHaveRecoveredWithoutIntervention: boolean;

  /**
   * Binary single-draw view of unnecessary
   * intervention. Retained for diagnostic
   * inspection only.
   */
  unnecessaryIntervention: boolean;

  /**
   * Expected-value view of unnecessary
   * intervention. This is the metric the
   * evaluation summary is built from, because
   * a single draw is too noisy to be
   * statistically defensible.
   *
   * Definition: 0 if RecoverIQ did not
   * intervene; otherwise, the simulator's
   * natural recovery probability for this
   * transaction.
   */
  expectedUnnecessaryIntervention: number;
}

export interface EvaluationSummary {
  scenarios: number;

  baselineRecoveredRevenue: number;
  recoverIQRecoveredRevenue: number;

  incrementalRecoveredRevenue: number;

  baselineRecoveryRate: number;
  recoverIQRecoveryRate: number;

  baselineAverageAttempts: number;
  recoverIQAverageAttempts: number;

  /**
   * Expected-value unnecessary-intervention
   * rate. The average, across all scenarios,
   * of expectedUnnecessaryIntervention.
   */
  unnecessaryInterventionRate: number;
}
