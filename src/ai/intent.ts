import type { PaymentMethod } from "../simulation/types";

export type CustomerIntent =
  | {
      type: "method_unavailable";
      method: PaymentMethod;
    }
  | {
      type: "method_available";
      method: PaymentMethod;
    }
  | {
      type: "request_retry";
      method?: PaymentMethod;
    }
  | {
      type: "request_stop";
    }
  | {
      type: "resume_recovery";
    }
  | {
      type: "accept_recommendation";
      method?: PaymentMethod;
    }
  | {
      type: "question";
      method?: PaymentMethod;
    }
  | {
      type: "unclear";
    };

function detectMethod(message: string): PaymentMethod | null {
  const text = message.toLowerCase();

  if (
    text.includes("upi") ||
    text.includes("gpay") ||
    text.includes("google pay") ||
    text.includes("phonepe") ||
    text.includes("paytm")
  ) {
    return "upi";
  }

  if (
    text.includes("card") ||
    text.includes("debit card") ||
    text.includes("credit card")
  ) {
    return "card";
  }

  if (
    text.includes("net banking") ||
    text.includes("netbanking") ||
    text.includes("internet banking")
  ) {
    return "net_banking";
  }

  if (text.includes("wallet") || text.includes("paytm wallet")) {
    return "wallet";
  }

  return null;
}

export function interpretCustomerMessage(message: string): CustomerIntent {
  const text = message.toLowerCase().trim();

  const method = detectMethod(text);

  /*
   * Customer explicitly asks RecoverIQ to stop.
   * This must come before retry detection because
   * "don't retry" contains the word "retry".
   */
  if (
    text === "stop" ||
    text.includes("don't retry") ||
    text.includes("do not retry") ||
    text.includes("leave it") ||
    text.includes("forget it") ||
    text.includes("cancel")
  ) {
    return {
      type: "request_stop",
    };
  }

  /*
   * Customer explicitly accepts the current
   * recommended payment method.
   *
   * This must come before method_available because
   * "yes, you can use my card" contains "can use".
   */
  if (
    (text.includes("yes") ||
      text.includes("yeah") ||
      text.includes("yep") ||
      text.includes("sure") ||
      text.includes("alright") ||
      text.includes("go ahead")) &&
    (text.includes("use") ||
      text.includes("try") ||
      text.includes("pay") ||
      text.includes("proceed"))
  ) {
    return {
      type: "accept_recommendation",
      method: method ?? undefined,
    };
  }

  /*
   * Customer explicitly restores access
   * to a previously unavailable method.
   */
  if (
    text.includes("found my") ||
    text.includes("have my") ||
    text.includes("got my") ||
    text.includes("available now") ||
    text.includes("can use") ||
    text.includes("i can use") ||
    text.includes("i found")
  ) {
    if (method) {
      return {
        type: "method_available",
        method,
      };
    }
  }

  /*
   * Customer wants to retry.
   */
  if (
    text.includes("retry") ||
    text.includes("try again") ||
    text.includes("try it again") ||
    text.includes("attempt again")
  ) {
    return {
      type: "request_retry",
      method: method ?? undefined,
    };
  }

  /*
   * Customer accepts a payment method directly.
   */
  if (
    text.includes("use my card") ||
    text.includes("use card") ||
    text.includes("use my upi") ||
    text.includes("use upi") ||
    text.includes("use my net banking") ||
    text.includes("use net banking") ||
    text.includes("use netbanking") ||
    text.includes("use my wallet") ||
    text.includes("use wallet") ||
    text.includes("let's do that")
  ) {
    return {
      type: "accept_recommendation",
      method: method ?? undefined,
    };
  }

if (
  text.includes("resume") ||
  text.includes("continue the recovery") ||
  text.includes("continue recovering") ||
  text.includes("changed my mind") ||
  text.includes("let's continue") ||
  text.includes("let us continue")
) {
  return {
    type: "resume_recovery",
  };
}

  return {
    type: "unclear",
  };
}

export function hasExplicitPaymentConfirmation(message: string): boolean {
  const normalized = message.toLowerCase().trim();

  const questionPattern =
    /\?|^(should|shall|can|could|would|may|do i|what if|is it)/;

  if (questionPattern.test(normalized)) {
    return false;
  }

  const confirmationPatterns = [
    /\byes\b.*\b(use|pay|go ahead|proceed|try)\b/,
    /\b(use|pay|go ahead with|proceed with|try)\b.*\b(card|upi|net banking|netbanking|wallet)\b/,
    /\bi('ll| will)\b.*\b(use|pay|try)\b/,
    /\blet('s| us)\b.*\b(use|pay|try)\b/,
    /\b(okay|okay|ok|sure)\b.*\b(use|pay|go ahead|proceed)\b/,
  ];

  return confirmationPatterns.some((pattern) => pattern.test(normalized));
}
