import type { PaymentMethod } from "../simulation/types";

export type LLMIntent =
  | "method_unavailable"
  | "method_available"
  | "accept_recommendation"
  | "request_retry"
  | "request_stop"
  | "resume_recovery"
  | "question"
  | "unclear";

export interface LLMIntentResult {
  intent: LLMIntent;
  method: PaymentMethod | null;
  explicitConfirmation: boolean;
  confidence: number;
  reasoning: string;
}

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

const intentSchema = {
  explicitConfirmation: {
    type: "boolean",
  },
  type: "object",
  properties: {
    intent: {
      type: "string",
      enum: [
        "method_unavailable",
        "method_available",
        "accept_recommendation",
        "request_retry",
        "request_stop",
        "resume_recovery",
        "question",
        "unclear",
      ],
    },
    method: {
      anyOf: [
        {
          type: "string",
          enum: ["upi", "card", "net_banking", "wallet"],
        },
        {
          type: "null",
        },
      ],
    },
    confidence: {
      type: "number",
      minimum: 0,
      maximum: 1,
    },
    reasoning: {
      type: "string",
    },
  },
  required: ["intent", "method", "confidence", "reasoning"],
  additionalProperties: false,
};

function isValidIntent(value: unknown): value is LLMIntent {
  return (
    typeof value === "string" &&
    [
      "method_unavailable",
      "method_available",
      "accept_recommendation",
      "request_retry",
      "request_stop",
      "resume_recovery",
      "question",
      "unclear",
    ].includes(value)
  );
}

function isValidMethod(value: unknown): value is PaymentMethod | null {
  return (
    value === null ||
    value === "upi" ||
    value === "card" ||
    value === "net_banking" ||
    value === "wallet"
  );
}

function parseIntent(
  value: unknown,
  currentRecommendation: string | null,
): LLMIntentResult | null {
  if (typeof value !== "object" || value === null) {
    return null;
  }

  const candidate = value as Record<string, unknown>;

  if (!isValidIntent(candidate.intent)) {
    return null;
  }

  let method: PaymentMethod | null = isValidMethod(candidate.method)
    ? candidate.method
    : null;

  // The model may correctly identify an intent without
  // explicitly repeating the payment method.
  if (
    !method &&
    (candidate.intent === "method_unavailable" ||
      candidate.intent === "method_available" ||
      candidate.intent === "accept_recommendation")
  ) {
    switch (currentRecommendation) {
      case "recommend_upi":
        method = "upi";
        break;
      case "recommend_card":
        method = "card";
        break;
      case "recommend_net_banking":
        method = "net_banking";
        break;
      case "recommend_wallet":
        method = "wallet";
        break;
    }
  }

  if (
    candidate.intent === "method_unavailable" ||
    candidate.intent === "method_available"
  ) {
    if (!method) {
      return null;
    }
  }

  const confidence =
    typeof candidate.confidence === "number" &&
    candidate.confidence >= 0 &&
    candidate.confidence <= 1
      ? candidate.confidence
      : 0.5;

  const reasoning =
    typeof candidate.reasoning === "string"
      ? candidate.reasoning
      : "Intent inferred from the customer message.";

  const explicitConfirmation =
    typeof candidate.explicitConfirmation === "boolean"
      ? candidate.explicitConfirmation
      : false;

  return {
    intent: candidate.intent,
    method,
    confidence,
    reasoning,
    explicitConfirmation,
  };
}
export async function understandCustomerMessage(
  message: string,
  currentRecommendation: string | null,
  availableMethods: PaymentMethod[],
  unavailableMethods: PaymentMethod[],
  conversationHistory: string[] = [],
): Promise<LLMIntentResult | null> {
  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    return null;
  }

  const systemPrompt = `
You are the language-understanding component of RecoverIQ,
an AI payment recovery assistant.

Your job is ONLY to understand the customer's message.

You do NOT decide which payment action is financially optimal.
You do NOT execute payments.
You do NOT override policy.

The deterministic RecoverIQ decision engine handles those responsibilities.

Classify the customer's message into exactly one intent:

1. method_unavailable
   The customer says they cannot currently use a payment method.

2. method_available
   The customer says a previously unavailable payment method
   is available again.

3. accept_recommendation
   The customer explicitly agrees to use a specific payment
   method that RecoverIQ has recommended.

4. request_retry
   The customer explicitly asks to retry the payment.

5. request_stop
   The customer wants to stop or does not want further recovery.

6. question
   The customer is asking a question rather than explicitly
   choosing an action.

7. unclear
   The message does not provide enough information.

Important:
- Mentioning a payment method does NOT automatically mean acceptance.
- "Shall I use net banking?" is a question.
- "I will use net banking" can be acceptance.
- "I don't have my card" means card unavailable.
- "Wait, I found my card" means card available again.
- Never infer sensitive credentials.
- Never ask for OTP, PIN, CVV, password, or banking credentials.

Execution safety:

Set explicitConfirmation to true ONLY when the customer
clearly and affirmatively chooses to proceed with a payment
method.

Examples of explicit confirmation:
- "Yes, use my card"
- "Go ahead with the card"
- "I'll pay with my card"
- "Okay, let's use net banking"
- "Use UPI"

These are NOT explicit confirmation:
- "Shall I use my card?"
- "Should I use net banking?"
- "Can I use my card?"
- "Would card work?"
- "What do you recommend?"
- "I think I can use my card"

A question must always have:
explicitConfirmation = false

Do not infer confirmation merely because the customer
mentions a payment method.

Current recommendation:
${currentRecommendation ?? "none"}

Currently available methods:
${availableMethods.join(", ") || "none"}

Currently unavailable methods:
${unavailableMethods.join(", ") || "none"}

Conversation context:
- The customer may refer to something mentioned earlier.
- "that method" refers to the current recommended payment method unless the customer clearly specifies another method.
- If the customer says they found, have, or can now use a method, classify that as method_available unless they are clearly accepting an immediate payment action.
- If the customer explicitly agrees to proceed, classify it as accept_recommendation.
- A question is never an acceptance.

Return ONLY valid JSON.
Do not return Markdown.
Do not return explanations.
Do not return "Intent:" labels.
Do not return YAML.
The response must be a single JSON object with exactly these fields:

{
  "intent": "method_unavailable | method_available | accept_recommendation | request_retry | request_stop | resume_recovery | question | unclear"  "method": "upi | card | net_banking | wallet | null",
  "confidence": 0.0,
  "reasoning": "short explanation",
  "explicitConfirmation": false
}

If the customer mentions a specific payment method, always include that method.
For example, "I don't have my card" must return:
{
  "intent": "method_unavailable",
  "method": "card",
  "confidence": 1.0,
  "reasoning": "The customer says they do not have their card.",
  "explicitConfirmation": false
}

resume_recovery:
The customer explicitly wants to resume a recovery session that was previously stopped.

Examples:
- "resume the recovery"
- "continue the recovery"
- "I've changed my mind, let's continue"
- "I want to resume"
- "let's continue trying"

Do NOT classify a payment-method choice alone as resume_recovery.

If the recovery session is stopped, a customer must explicitly request
that recovery resume before any recovery action can be considered.

"I'll use my card" is not by itself a resume request.
"Resume the recovery and I'll use my card" is a resume request.
`.trim();

  try {
    const response = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "minimax/minimax-m3:free",
        messages: [
          {
            role: "system",
            content: systemPrompt,
          },
          ...conversationHistory.map((previousMessage) => ({
            role: "user" as const,
            content: previousMessage,
          })),
          {
            role: "user",
            content: message,
          },
        ],
        temperature: 0,
        max_tokens: 300,
        response_format: {
          type: "json_object"
        },
      }),
    });
    console.log("OPENROUTER STATUS:", response.status, response.statusText);

    if (!response.ok) {
      console.error("OpenRouter request failed:", response.status);

      return null;
    }

    const data = await response.json();
    console.log("OPENROUTER RESPONSE:", JSON.stringify(data, null, 2));

    const content = data?.choices?.[0]?.message?.content;

    if (typeof content !== "string") {
      return null;
    }

    let parsed: unknown;

    try {
      parsed = JSON.parse(content);
    } catch {
      return null;
    }

    return parseIntent(parsed, currentRecommendation);
  } catch (error) {
    console.error("OpenRouter request error:", error);

    return null;
  }
}
