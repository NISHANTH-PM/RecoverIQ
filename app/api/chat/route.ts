import { NextResponse } from "next/server";

import {
  demoCustomer,
  demoEnvironment,
  demoTransaction,
} from "../../../src/demo/scenario";

import { processCustomerMessage } from "../../../src/ai/recovery-agent";

import { createInitialConversationState } from "../../../src/ai/conversation-state";

import type {
  PaymentMethod,
  RecoveryAction,
  RecoverySession,
} from "../../../src/simulation/types";

import { understandCustomerMessage } from "../../../src/ai/llm";

import { hasExplicitPaymentConfirmation } from "../../../src/ai/intent";

import { detectSensitivePaymentData } from "../../../src/ai/safety";

import { evaluateRecoveryActions } from "../../../src/recovery/decision-engine";

import { setRecommendation, setSessionStatus } from "../../../src/ai/conversation-state";

function recommendationToMethod(action: string | null): string | null {
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

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const message = typeof body.message === "string" ? body.message.trim() : "";

    const sensitiveData = detectSensitivePaymentData(message);

    if (sensitiveData.detected) {
      return NextResponse.json({
        message:
          "For your security, please don't share card numbers, PINs, CVVs, OTPs, passwords, or banking credentials here. I can't process or store payment credentials in this chat. Please continue through the secure payment interface.",
        safety: {
          blocked: true,
          type: sensitiveData.type,
        },
        execution: null,
      });
    }

    if (!message) {
      return NextResponse.json(
        {
          error: "Message is required.",
        },
        { status: 400 },
      );
    }

    /*
     * For now the API receives the conversation
     * state from the browser.
     *
     * Later this will move to an ephemeral
     * server-side recovery session.
     */
    const incomingState = body.state;

    const state = incomingState
      ? {
          ...incomingState,
          messages: incomingState.messages ?? [],
          sessionStatus: incomingState.sessionStatus ?? "active",
        }
      : createInitialConversationState(demoCustomer.availablePaymentMethods);

    const session: RecoverySession = {
      id: "demo-session-001",
      transactionId: demoTransaction.id,
      decisions: [],
      customerConstraints: [
        ...state.unavailablePaymentMethods.map(
          (method: string) => `${method}_unavailable`,
        ),
      ],
      status: "active",
      recoveredAmount: 0,
      startedAt: new Date().toISOString(),
    };

    const llmIntent = await understandCustomerMessage(
      message,
      state.currentRecommendation,
      state.availablePaymentMethods,
      state.unavailablePaymentMethods,
    );
    const response = processCustomerMessage(
      message,
      state,
      demoTransaction,
      demoCustomer,
      demoEnvironment,
      session,
      llmIntent,
    );

    let execution = null;

    let responseMessage = response.message;

    if (
      response.state.sessionStatus === "active" &&
      response.intent.type === "accept_recommendation" &&
      response.intent.method &&
      hasExplicitPaymentConfirmation(message) &&
      response.intent.method ===
        recommendationToMethod(response.state.currentRecommendation)
    ) {
      const executionResponse = await fetch(
        new URL("/api/execute", request.url),
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            selectedMethod: response.intent.method,
            state: response.state,
          }),
        },
      );

      execution = await executionResponse.json();

      if (execution?.result?.success === true) {
        const recoveredAmount = execution.result.recoveredAmount ?? 0;

        responseMessage = `Payment successful. ₹${recoveredAmount.toLocaleString(
          "en-IN",
        )} has been recovered successfully.`;
      }
    }

    return NextResponse.json({
      message: responseMessage,
      state: response.state,
      decision: response.decision,
      intent: response.intent,
      execution,
    });
  } catch (error) {
    console.error("RecoverIQ chat error:", error);

    return NextResponse.json(
      {
        error: "Unable to process customer message.",
      },
      { status: 500 },
    );
  }
}
