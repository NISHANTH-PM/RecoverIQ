import type {
  FailureType,
  PaymentMethod,
  RecoveryAction,
  RecoverySession,
} from "../simulation/types.js";

export interface PolicyContext {
  amount: number;

  currentMethod: PaymentMethod;

  failureType: FailureType;

  previousAttempts: number;

  session: RecoverySession;

  confidence: "high" | "medium" | "low";
}

export interface PolicyDecision {
  action: RecoveryAction;

  allowed: boolean;

  reason: string;
}

const MAX_ATTEMPTS = 3;

export function checkPolicy(
  action: RecoveryAction,
  context: PolicyContext
): PolicyDecision {
  /*
   * Rule 1:
   * Never retry after the maximum number
   * of attempts has been reached.
   */

  if (
    (action === "retry_now" ||
      action === "retry_later") &&
    context.previousAttempts >= MAX_ATTEMPTS
  ) {
    return {
      action,
      allowed: false,
      reason:
        "Maximum recovery attempts reached.",
    };
  }

  /*
   * Rule 2:
   * Hard declines should not trigger another
   * retry of the same payment method.
   */

  if (
    (action === "retry_now" ||
      action === "retry_later") &&
    context.failureType === "hard_decline"
  ) {
    return {
      action,
      allowed: false,
      reason:
        "Hard decline detected; retrying the same payment method is blocked.",
    };
  }

  /*
   * Rule 3:
   * Insufficient funds should not trigger
   * repeated immediate retries.
   */

  if (
    action === "retry_now" &&
    context.failureType ===
      "insufficient_funds"
  ) {
    return {
      action,
      allowed: false,
      reason:
        "Immediate retry blocked after insufficient funds.",
    };
  }

  /*
   * Rule 4:
   * Automatic retry requires at least medium
   * confidence.
   */

  if (
    (action === "retry_now" ||
      action === "retry_later") &&
    context.confidence === "low"
  ) {
    return {
      action,
      allowed: false,
      reason:
        "Confidence is too low for an automatic retry.",
    };
  }

  /*
   * Rule 5:
   * Recommendations for alternative payment
   * methods are allowed, but they do not
   * silently change the customer's method.
   */

  if (
    action === "recommend_upi" ||
    action === "recommend_card" ||
    action === "recommend_net_banking" ||
    action === "recommend_wallet"
  ) {
    return {
      action,
      allowed: true,
      reason:
        "Alternative payment method may be recommended; customer choice is required.",
    };
  }

  /*
   * Rule 6:
   * Asking the customer is always allowed
   * when the session is active.
   */

  if (
    action === "ask_customer" &&
    context.session.status === "active"
  ) {
    return {
      action,
      allowed: true,
      reason:
        "Customer clarification may be requested.",
    };
  }

  /*
   * Rule 7:
   * Stop is always allowed.
   */

  if (action === "stop") {
    return {
      action,
      allowed: true,
      reason:
        "Stopping recovery is always permitted.",
    };
  }

  return {
    action,
    allowed: true,
    reason:
      "Action passes the current policy checks.",
  };
}