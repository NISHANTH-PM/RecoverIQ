import { NextResponse } from "next/server";

import {
  demoCustomer,
  demoEnvironment,
  demoTransaction,
} from "../../../src/demo/scenario";

import { evaluateRecoveryActions } from "../../../src/recovery/decision-engine";

import type {
  RecoverySession,
  PaymentMethod,
} from "../../../src/simulation/types";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const unavailableMethod =
      body.unavailableMethod as PaymentMethod;

    if (
      !demoCustomer.availablePaymentMethods.includes(
        unavailableMethod,
      )
    ) {
      return NextResponse.json(
        {
          error: "Invalid payment method.",
        },
        { status: 400 },
      );
    }

    /*
     * Customer has provided new information:
     *
     * "I don't have my card."
     *
     * This becomes a constraint for the recovery
     * decision. RecoverIQ must reconsider the
     * available actions rather than blindly finding
     * another payment method.
     */
    const adaptedCustomer = {
      ...demoCustomer,
      availablePaymentMethods:
        demoCustomer.availablePaymentMethods.filter(
          (method) => method !== unavailableMethod,
        ),
    };

    const session: RecoverySession = {
      id: "demo-session-001",
      transactionId: demoTransaction.id,
      decisions: [],
      customerConstraints: [
        `${unavailableMethod}_unavailable`,
      ],
      status: "active",
      recoveredAmount: 0,
      startedAt: new Date().toISOString(),
    };

    const decision =
      evaluateRecoveryActions(
        demoTransaction,
        adaptedCustomer,
        demoEnvironment,
        session,
      );

    return NextResponse.json({
      decision,
      customer: adaptedCustomer,
      environment: demoEnvironment,
      constraint: `${unavailableMethod}_unavailable`,
    });
  } catch (error) {
    console.error(
      "RecoverIQ adaptation error:",
      error,
    );

    return NextResponse.json(
      {
        error: "Unable to adapt recovery.",
      },
      { status: 500 },
    );
  }
}