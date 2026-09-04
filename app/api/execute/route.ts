import { NextResponse } from "next/server";

import {
  demoCustomer,
  demoEnvironment,
  demoTransaction,
} from "../../../src/demo/scenario";

import { executeCustomerSelectedMethod } from "../../../src/simulation/simulator";

import type {
  PaymentMethod,
} from "../../../src/simulation/types";

interface ConversationState {
  availablePaymentMethods: PaymentMethod[];
  unavailablePaymentMethods: PaymentMethod[];
}

const validMethods: PaymentMethod[] = [
  "upi",
  "card",
  "net_banking",
  "wallet",
];

function isPaymentMethod(
  value: unknown,
): value is PaymentMethod {
  return (
    typeof value === "string" &&
    validMethods.includes(value as PaymentMethod)
  );
}

export async function POST(
  request: Request,
) {
  try {
    const body = await request.json();

    const selectedMethod = body.selectedMethod;

    if (!isPaymentMethod(selectedMethod)) {
      return NextResponse.json(
        {
          error: "Invalid payment method.",
        },
        { status: 400 },
      );
    }

    const state =
      body.state as ConversationState | undefined;

    const availableMethods =
      state?.availablePaymentMethods ??
      demoCustomer.availablePaymentMethods;

    /*
     * Never execute a method that the customer has
     * explicitly marked as unavailable.
     */
    if (
      !availableMethods.includes(selectedMethod) ||
      state?.unavailablePaymentMethods.includes(
        selectedMethod,
      )
    ) {
      return NextResponse.json(
        {
          error:
            "That payment method is not currently available.",
        },
        { status: 409 },
      );
    }

    /*
     * Use a deterministic RNG for the demo so that
     * repeated demonstrations produce the same result.
     */
    const random = createSeededRandom(
      20260903,
    );

    const result =
      executeCustomerSelectedMethod(
        demoTransaction,
        demoCustomer,
        demoEnvironment,
        selectedMethod,
        random,
      );

    return NextResponse.json({
      selectedMethod,
      result,
    });
  } catch (error) {
    console.error(
      "Execution error:",
      error,
    );

    return NextResponse.json(
      {
        error:
          "Unable to execute the payment recovery.",
      },
      { status: 500 },
    );
  }
}

function createSeededRandom(
  seed: number,
): () => number {
  let state = seed >>> 0;

  return () => {
    state += 0x6d2b79f5;

    let value = state;

    value = Math.imul(
      value ^ (value >>> 15),
      value | 1,
    );

    value ^= value + Math.imul(
      value ^ (value >>> 7),
      value | 61,
    );

    return (
      ((value ^ (value >>> 14)) >>> 0) /
      4294967296
    );
  };
}