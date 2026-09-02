import type {
  RecoveryDecision,
  RecoverySession,
  Transaction,
} from "./types.js";

export function createRecoverySession(
  transaction: Transaction
): RecoverySession {
  return {
    id: `SESSION_${transaction.id}`,

    transactionId: transaction.id,

    decisions: [],

    customerConstraints: [],

    status: "active",

    recoveredAmount: 0,

    startedAt: new Date().toISOString(),
  };
}

export function recordDecision(
  session: RecoverySession,
  decision: RecoveryDecision
): RecoverySession {
  return {
    ...session,

    decisions: [
      ...session.decisions,
      decision,
    ],
  };
}

export function addCustomerConstraint(
  session: RecoverySession,
  constraint: string
): RecoverySession {
  if (
    session.customerConstraints.includes(
      constraint
    )
  ) {
    return session;
  }

  return {
    ...session,

    customerConstraints: [
      ...session.customerConstraints,
      constraint,
    ],
  };
}

export function markRecovered(
  session: RecoverySession,
  amount: number
): RecoverySession {
  return {
    ...session,

    status: "recovered",

    recoveredAmount:
      session.recoveredAmount + amount,

    endedAt: new Date().toISOString(),
  };
}

export function markStopped(
  session: RecoverySession
): RecoverySession {
  return {
    ...session,

    status: "stopped",

    endedAt: new Date().toISOString(),
  };
}