import {
  addCustomerMessage,
  markMethodAvailable,
  markMethodUnavailable,
  setRecommendation,
  setSessionStatus,
  type RecoveryConversationState,
} from "./conversation-state";

import { interpretCustomerMessage, type CustomerIntent } from "./intent";

import { evaluateRecoveryActions } from "../recovery/decision-engine";

import type {
  Customer,
  EnvironmentState,
  RecoveryAction,
  RecoverySession,
  Transaction,
  PaymentMethod,
} from "../simulation/types";

import type { LLMIntentResult } from "./llm";

export interface AgentResponse {
  message: string;
  state: RecoveryConversationState;
  decision: ReturnType<typeof evaluateRecoveryActions>;
  intent: CustomerIntent;
}

function getMethodName(method: string): string {
  switch (method) {
    case "upi":
      return "UPI";

    case "card":
      return "card";

    case "net_banking":
      return "Net Banking";

    case "wallet":
      return "wallet";

    default:
      return method;
  }
}

function getActionMessage(action: RecoveryAction): string {
  switch (action) {
    case "retry_now":
      return "I think retrying the payment now is the best available option.";

    case "retry_later":
      return "The same payment method has already failed, so I'd rather try again later than keep retrying immediately.";

    case "recommend_upi":
      return "Based on the available payment context, I'd recommend trying UPI.";

    case "recommend_card":
      return "Based on your payment history and the current context, I'd recommend trying your card.";

    case "recommend_net_banking":
      return "Net Banking looks like the strongest remaining option based on the available context.";

    case "recommend_wallet":
      return "A wallet looks like the strongest remaining payment option.";

    case "ask_customer":
      return "I need a little more information before deciding what to do next.";

    case "stop":
      return "I don't have enough evidence that another intervention is worth attempting, so I'd rather stop here than keep bothering you.";

    default:
      return "I've evaluated the available recovery options.";
  }
}

function createUpdatedCustomer(
  customer: Customer,
  state: RecoveryConversationState,
): Customer {
  return {
    ...customer,

    availablePaymentMethods: [...state.availablePaymentMethods],
  };
}

function normalizeLLMIntent(llmIntent: LLMIntentResult): CustomerIntent {
  switch (llmIntent.intent) {
    case "method_unavailable":
      if (llmIntent.method === null) {
        return {
          type: "unclear",
        };
      }

      return {
        type: "method_unavailable",
        method: llmIntent.method,
      };

    case "method_available":
      if (llmIntent.method === null) {
        return {
          type: "unclear",
        };
      }

      return {
        type: "method_available",
        method: llmIntent.method,
      };

    case "accept_recommendation":
      return {
        type: "accept_recommendation",
        ...(llmIntent.method !== null ? { method: llmIntent.method } : {}),
      };

    case "request_retry":
      return {
        type: "request_retry",
        ...(llmIntent.method !== null ? { method: llmIntent.method } : {}),
      };

    case "request_stop":
      return {
        type: "request_stop",
      };

    case "resume_recovery":
      return {
        type: "resume_recovery",
      };

    case "question":
      return {
        type: "question",
        ...(llmIntent.method !== null ? { method: llmIntent.method } : {}),
      };

    case "unclear":
      return {
        type: "unclear",
      };

    default:
      return {
        type: "unclear",
      };
  }
}

function recommendationToMethod(
  action: RecoveryAction | null,
): PaymentMethod | null {
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

export function processCustomerMessage(
  message: string,
  state: RecoveryConversationState,
  transaction: Transaction,
  customer: Customer,
  environment: EnvironmentState,
  session: RecoverySession,
  llmIntent?: LLMIntentResult | null,
): AgentResponse {
  const fallbackIntent = interpretCustomerMessage(message);

  const normalizedLLMIntent = llmIntent ? normalizeLLMIntent(llmIntent) : null;

  const intent =
    fallbackIntent.type === "method_unavailable" ||
    fallbackIntent.type === "request_stop"
      ? fallbackIntent
      : (normalizedLLMIntent ?? fallbackIntent);

  let updatedState = addCustomerMessage(state, message);

  switch (intent.type) {
    case "method_unavailable":
      updatedState = markMethodUnavailable(updatedState, intent.method);
      break;

    case "method_available":
      updatedState = markMethodAvailable(updatedState, intent.method);
      break;

    case "request_stop":
      updatedState = setSessionStatus(updatedState, "stopped");
      break;

    case "resume_recovery":
      updatedState = setSessionStatus(updatedState, "active");
      break;
    case "question": {
      const questionDecision = evaluateRecoveryActions(
        transaction,
        {
          ...customer,
          availablePaymentMethods: updatedState.availablePaymentMethods,
        },
        environment,
        session,
      );

      const method =
        intent.method ??
        recommendationToMethod(questionDecision.recommendedAction);

      if (method === "card") {
        return {
          state: updatedState,
          intent,
          decision: questionDecision,
          message:
            "Yes. Card is the method I'm currently recommending based on your payment history and the current payment context. You can use it, or tell me if you can't access your card.",
        };
      }

      if (method === "net_banking") {
        return {
          state: updatedState,
          intent,
          decision: questionDecision,
          message:
            "Yes. Net Banking is the method I'm currently recommending based on the available payment context. You can use it, or tell me if you can't use Net Banking.",
        };
      }

      if (method === "upi") {
        return {
          state: updatedState,
          intent,
          decision: questionDecision,
          message:
            "UPI is currently available, but I don't want to recommend it blindly. I'm considering the recent failed attempts and the current payment context before suggesting the next step.",
        };
      }

      if (method === "wallet") {
        return {
          state: updatedState,
          intent,
          decision: questionDecision,
          message:
            "Wallet is currently available and is one of the recovery options I'm evaluating. You can choose it, or I can continue with the recommendation I'm currently making.",
        };
      }

      return {
        state: updatedState,
        intent,
        decision: questionDecision,
        message:
          "I don't currently have a sufficiently strong payment method to recommend. I can keep evaluating the available options, or we can stop here.",
      };
    }

    default:
      break;
  }

  const adaptedCustomer = createUpdatedCustomer(customer, updatedState);

  if (
    updatedState.sessionStatus === "stopped" &&
    intent.type !== "resume_recovery"
  ) {
    return {
      message:
        "This recovery is currently stopped. If you'd like me to continue, explicitly tell me to resume the recovery.",
      state: updatedState,
      decision: {
        recommendedAction: "stop",
        reason:
          "Recovery remains stopped until the customer explicitly requests a resume.",
        actions: [],
      },
      intent,
    };
  }

  const decision = evaluateRecoveryActions(
    transaction,
    adaptedCustomer,
    environment,
    session,
  );

  updatedState = setRecommendation(updatedState, decision.recommendedAction);

  let messageToCustomer = getActionMessage(decision.recommendedAction);

  if (intent.type === "method_unavailable") {
    messageToCustomer = `Understood. I won't ask you to use ${getMethodName(
      intent.method,
    )}. ${messageToCustomer}`;
  }

  if (intent.type === "method_available") {
    messageToCustomer = `Got it — I'll make ${getMethodName(
      intent.method,
    )} available again and reconsider the recovery options. ${messageToCustomer}`;
  }

  return {
    message: messageToCustomer,
    state: updatedState,
    decision,
    intent,
  };
}
