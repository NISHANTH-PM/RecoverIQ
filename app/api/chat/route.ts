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
          failedMethodsInSession:
            incomingState.failedMethodsInSession ?? [],
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
        /*
         * Methods that already failed in this
         * session are propagated to the policy
         * layer via session.customerConstraints so
         * the next decision cannot blindly
         * re-recommend the same method.
         *
         * The prefix `failed_in_session:` is
         * distinct from `rejected:<method>`
         * (customer rejection) and from
         * `<method>_unavailable` (customer
         * inability to use).
         */
        ...state.failedMethodsInSession.map(
          (method: string) => `failed_in_session:${method}`,
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

        /*
         * Mark the conversation state as
         * recovered so the UI and the next
         * agent turn treat the session as
         * terminal. The "Trying your card now"
         * message we received from the agent
         * is replaced by the success message
         * above.
         */
        response.state = setSessionStatus(
          response.state,
          "recovered",
        );
      } else if (execution?.result?.success === false) {
        /*
         * The customer-selected method actually
         * failed. Record it as new
         * current-session context so the next
         * decision will not blindly re-recommend
         * the same method.
         *
         * This is the only mutation of
         * state.failedMethodsInSession in the
         * request lifecycle, and it is derived
         * directly from the simulator's
         * execution result — never from the
         * customer's words or from a guess.
         */
        const failedMethod = response.intent.method;

        const existing =
          response.state.failedMethodsInSession ?? [];

        if (failedMethod && !existing.includes(failedMethod)) {
          response.state = {
            ...response.state,
            failedMethodsInSession: [
              ...existing,
              failedMethod,
            ],
          };
        }
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
