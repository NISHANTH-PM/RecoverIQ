import type {
  PaymentMethod,
  RecoveryAction,
} from "../simulation/types.js";

import type {
  ProbabilityEstimate,
} from "./probability.js";

export interface ENVEstimate {
  action: RecoveryAction;

  probability: number;

  expectedRevenue: number;

  interventionCost: number;

  frictionCost: number;

  riskPenalty: number;

  env: number;

  explanation: string;
}

interface ENVContext {
  amount: number;

  currentMethod: PaymentMethod;

  probabilityEstimate: ProbabilityEstimate;

  previousAttempts: number;

  customerHasChosenMethod?: boolean;
}

function getInterventionCost(
  action: RecoveryAction
): number {
  switch (action) {
    case "retry_now":
      return 0;

    case "retry_later":
      return 0;

    case "recommend_upi":
    case "recommend_card":
    case "recommend_net_banking":
    case "recommend_wallet":
      return 0;

    case "ask_customer":
      return 5;

    case "stop":
      return 0;
  }
}

function getFrictionCost(
  action: RecoveryAction
): number {
  switch (action) {
    case "retry_now":
      return 10;

    case "retry_later":
      return 15;

    case "recommend_upi":
    case "recommend_card":
    case "recommend_net_banking":
    case "recommend_wallet":
      return 20;

    case "ask_customer":
      return 35;

    case "stop":
      return 0;
  }
}

function getRiskPenalty(
  action: RecoveryAction,
  previousAttempts: number
): number {
  let penalty = 0;

  if (action === "retry_now") {
    penalty += previousAttempts * 15;
  }

  if (action === "ask_customer") {
    penalty += 5;
  }

  return penalty;
}

export function calculateENV(
  action: RecoveryAction,
  context: ENVContext
): ENVEstimate {
  const probability =
    context.probabilityEstimate.probability;

  const expectedRevenue =
    probability * context.amount;

  const interventionCost =
    getInterventionCost(action);

  const frictionCost =
    getFrictionCost(action);

  const riskPenalty =
    getRiskPenalty(
      action,
      context.previousAttempts
    );

  const env =
    expectedRevenue -
    interventionCost -
    frictionCost -
    riskPenalty;

  return {
    action,

    probability,

    expectedRevenue,

    interventionCost,

    frictionCost,

    riskPenalty,

    env,

    explanation:
      `${Math.round(probability * 100)}% estimated success × ₹${context.amount} ` +
      `= ₹${Math.round(expectedRevenue)} expected revenue; ` +
      `minus ₹${interventionCost} intervention, ` +
      `₹${frictionCost} friction, ` +
      `₹${riskPenalty} risk.`,
  };
}