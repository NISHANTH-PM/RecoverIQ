import { NextResponse } from "next/server";

import {
  demoCustomer,
  demoEnvironment,
  demoTransaction,
} from "../../../src/demo/scenario";

import { evaluateRecoveryActions } from "../../../src/recovery/decision-engine";

import type {
  RecoverySession,
} from "../../../src/simulation/types";

export async function POST() {
  try {
    const session: RecoverySession = {
      id: "demo-session-001",
      transactionId: demoTransaction.id,
      decisions: [],
      customerConstraints: [],
      status: "active",
      recoveredAmount: 0,
      startedAt: new Date().toISOString(),
    };

    const decision =
      evaluateRecoveryActions(
        demoTransaction,
        demoCustomer,
        demoEnvironment,
        session,
      );

    return NextResponse.json({
      transaction: demoTransaction,
      customer: demoCustomer,
      environment: demoEnvironment,
      latestAttempt:
        demoTransaction.attempts[
          demoTransaction.attempts.length - 1
        ],
      decision,
      session,
    });
  } catch (error) {
    console.error(
      "RecoverIQ recovery error:",
      error,
    );

    return NextResponse.json(
      {
        error: "Unable to evaluate recovery.",
      },
      { status: 500 },
    );
  }
}