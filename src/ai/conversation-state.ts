import type {
  PaymentMethod,
  RecoveryAction,
} from "../simulation/types";

export interface ConversationMessage {
  role: "customer" | "agent";
  content: string;
}

export interface RecoveryConversationState {
  availablePaymentMethods: PaymentMethod[];
  unavailablePaymentMethods: PaymentMethod[];
  currentRecommendation: RecoveryAction | null;
  messages: ConversationMessage[];
  recoveryStep: number;
  sessionStatus: "active" | "stopped" | "recovered";

  /*
   * Methods that the customer explicitly selected
   * and that failed during THIS recovery session.
   *
   * This is new current-session context (not
   * historical methodStats) and is used by the
   * decision engine to penalize / avoid
   * re-recommending a method that just failed.
   */
  failedMethodsInSession: PaymentMethod[];
}

export function createInitialConversationState(
  availableMethods: PaymentMethod[],
): RecoveryConversationState {
  return {
    availablePaymentMethods: [...availableMethods],
    unavailablePaymentMethods: [],
    currentRecommendation: null,
    messages: [],
    recoveryStep: 0,
    sessionStatus: "active",
    failedMethodsInSession: [],
  };
}

export function markMethodUnavailable(
  state: RecoveryConversationState,
  method: PaymentMethod,
): RecoveryConversationState {
  return {
    ...state,
    availablePaymentMethods:
      state.availablePaymentMethods.filter(
        (item) => item !== method,
      ),
    unavailablePaymentMethods: Array.from(
      new Set([
        ...state.unavailablePaymentMethods,
        method,
      ]),
    ),
    recoveryStep: state.recoveryStep + 1,
  };
}

export function markMethodAvailable(
  state: RecoveryConversationState,
  method: PaymentMethod,
): RecoveryConversationState {
  return {
    ...state,
    availablePaymentMethods:
      state.availablePaymentMethods.includes(method)
        ? state.availablePaymentMethods
        : [
            ...state.availablePaymentMethods,
            method,
          ],
    unavailablePaymentMethods:
      state.unavailablePaymentMethods.filter(
        (item) => item !== method,
      ),
    recoveryStep: state.recoveryStep + 1,
  };
}

export function addCustomerMessage(
  state: RecoveryConversationState,
  message: string,
): RecoveryConversationState {
  return {
    ...state,
    messages: [
      ...state.messages,
      {
        role: "customer",
        content: message,
      },
    ],
  };
}

export function addAgentMessage(
  state: RecoveryConversationState,
  message: string,
): RecoveryConversationState {
  return {
    ...state,
    messages: [
      ...state.messages,
      {
        role: "agent",
        content: message,
      },
    ],
  };
}

export function setRecommendation(
  state: RecoveryConversationState,
  action: RecoveryAction,
): RecoveryConversationState {
  return {
    ...state,
    currentRecommendation: action,
  };
}

export function setSessionStatus(
  state: RecoveryConversationState,
  status: "active" | "stopped" | "recovered",
): RecoveryConversationState {
  return {
    ...state,
    sessionStatus: status,
  };
}