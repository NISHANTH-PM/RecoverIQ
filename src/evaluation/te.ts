import { evaluateSeeds, summarizeEvaluation } from "./evaluator.js";

const seeds = Array.from({ length: 100 }, (_, index) => index + 1);

const comparisons = evaluateSeeds(seeds);

const summary = summarizeEvaluation(comparisons);

console.log("\n--- NATURAL RECOVERY PROBABILITIES ---\n");

const probabilities = comparisons
  .map((item) => item.naturalRecoveryProbability)
  .sort((a, b) => a - b);

console.log(probabilities.map((p) => p.toFixed(2)).join(", "));

console.log(
  "\nNatural recovery probability range:",
  probabilities[0]?.toFixed(2),
  "-",
  probabilities[probabilities.length - 1]?.toFixed(2),
);

console.log("\n--- UNNECESSARY INTERVENTIONS ---\n");

/*
 * Both views are reported for transparency:
 *  - "unnecessaryIntervention" is a single
 *    binary draw; it is noisy and not used
 *    in the summary metric.
 *  - "expectedUnnecessaryIntervention" is
 *    the simulator's natural recovery
 *    probability for intervened cases, and
 *    is the defensible metric the summary
 *    prints.
 */

const expectedTotal = comparisons.reduce(
  (sum, item) => sum + item.expectedUnnecessaryIntervention,
  0,
);

const binaryCount = comparisons.filter(
  (item) => item.unnecessaryIntervention,
).length;

console.log(
  "Expected (defensible) unnecessary interventions:",
  expectedTotal.toFixed(2),
);
console.log(
  "Single-draw (noisy) unnecessary interventions:",
  binaryCount,
);

console.log("\n--- BINARY UNNECESSARY-INTERVENTION CASES (diagnostic) ---\n");

const binaryCases = comparisons.filter(
  (item) => item.unnecessaryIntervention,
);

for (const item of binaryCases) {
  console.log({
    seed: item.scenario.seed,
    amount: item.scenario.amount,
    naturalRecoveryProbability:
      item.naturalRecoveryProbability.toFixed(2),
    actions: item.recoverIQ.actions,
    baselineRecovered: item.baseline.recovered,
    recoverIQRecovered: item.recoverIQ.recovered,
  });
}

console.log("\n--- REPEATED RECOMMENDATION CHECK ---\n");

/*
 * The brief explicitly forbids the pattern
 *
 *   recommend_upi
 *   recommend_upi
 *   recommend_upi
 *
 * i.e. the same payment method being
 * recommended more than once in a single
 * recovery session. A retry_later, retry_later
 * sequence is a separate concern and is not
 * counted here.
 */
const repeatedRecommendations = comparisons.filter((item) => {
  const seen = new Set<string>();
  for (const action of item.recoverIQ.actions) {
    if (
      action === "recommend_upi" ||
      action === "recommend_card" ||
      action === "recommend_net_banking" ||
      action === "recommend_wallet"
    ) {
      if (seen.has(action)) {
        return true;
      }
      seen.add(action);
    }
  }
  return false;
});

console.log(
  "Scenarios with repeated same-method recommendations:",
  repeatedRecommendations.length,
);

if (repeatedRecommendations.length > 0) {
  for (const item of repeatedRecommendations) {
    console.log({
      seed: item.scenario.seed,
      actions: item.recoverIQ.actions,
    });
  }
}

console.log("\n--- REJECTION-TRIGGERED RE-EVALUATION CHECK ---\n");

/*
 * When a recommendation is rejected, the next
 * decision must reflect that rejection: either
 * a different recommendation, a retry, a stop,
 * or an ask_customer. It must NOT be a no-op
 * that loops on the same rejected method.
 */
const reEvaluationCases = comparisons.filter((item) => {
  const actions = item.recoverIQ.actions;
  for (let i = 1; i < actions.length; i += 1) {
    const prev = actions[i - 1];
    const curr = actions[i];
    if (
      (prev === "recommend_upi" ||
        prev === "recommend_card" ||
        prev === "recommend_net_banking" ||
        prev === "recommend_wallet") &&
      prev === curr
    ) {
      return true;
    }
  }
  return false;
});

console.log(
  "Scenarios where the same method was recommended after a prior recommendation step:",
  reEvaluationCases.length,
);

console.log("\n--- POLICY VIOLATION CHECK ---\n");

const policyViolations = comparisons.reduce(
  (sum, item) => sum + item.recoverIQ.policyViolations,
  0,
);

console.log("Total RecoverIQ policy violations:", policyViolations);

console.log("\n==============================");
console.log(" RECOVERIQ EVALUATION");
console.log("==============================\n");

console.log("Scenarios:", summary.scenarios);

console.log(
  "Baseline recovered revenue: ₹",
  summary.baselineRecoveredRevenue.toFixed(2),
);

console.log(
  "RecoverIQ recovered revenue: ₹",
  summary.recoverIQRecoveredRevenue.toFixed(2),
);

console.log(
  "Incremental recovered revenue: ₹",
  summary.incrementalRecoveredRevenue.toFixed(2),
);

console.log(
  "Baseline recovery rate:",
  `${(summary.baselineRecoveryRate * 100).toFixed(1)}%`,
);

console.log(
  "RecoverIQ recovery rate:",
  `${(summary.recoverIQRecoveryRate * 100).toFixed(1)}%`,
);

console.log(
  "Baseline average attempts:",
  summary.baselineAverageAttempts.toFixed(2),
);

console.log(
  "RecoverIQ average attempts:",
  summary.recoverIQAverageAttempts.toFixed(2),
);

console.log(
  "Unnecessary intervention rate (expected):",
  `${(summary.unnecessaryInterventionRate * 100).toFixed(1)}%`,
);

const totalCustomerInteractions = comparisons.reduce(
  (sum, item) => sum + item.recoverIQ.customerInteractions,
  0,
);

console.log(
  "Total customer interactions:",
  totalCustomerInteractions,
);

