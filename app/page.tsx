"use client";

import { FormEvent, useState } from "react";

import TopNav from "./components/TopNav";

type ChatMessage = {
  id: string;
  role: "agent" | "customer";
  content: string;
};

type RecoveryState = {
  availablePaymentMethods: string[];
  unavailablePaymentMethods: string[];
  currentRecommendation: string | null;
  customerMessages: string[];
  recoveryStep: number;
};

type PaymentPanelState = {
  status: "in_progress" | "recovered";
  currentMethod: string;
  attempts: number;
  recoveredAmount: number;
};

const methodLabel: Record<string, string> = {
  upi: "UPI",
  card: "Card",
  net_banking: "Net Banking",
  wallet: "Wallet",
};

export default function Home() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "agent",
      content:
        "Hi! I noticed your recent payment of ₹2,499 didn't go through. I'll help you find the best way to complete it.",
    },
  ]);

  const [message, setMessage] = useState("");
  const [conversationState, setConversationState] =
    useState<RecoveryState | null>(null);

  const [started, setStarted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [recovered, setRecovered] = useState(false);

  const [paymentPanel, setPaymentPanel] =
    useState<PaymentPanelState>({
      status: "in_progress",
      currentMethod: "upi",
      attempts: 2,
      recoveredAmount: 0,
    });

  async function startRecovery() {
    setLoading(true);

    try {
      const response = await fetch("/api/recover", {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Failed to start recovery");
      }

      const data = await response.json();

      setConversationState({
        availablePaymentMethods: data.customer.availablePaymentMethods,
        unavailablePaymentMethods: [],
        currentRecommendation: data.decision.recommendedAction,
        customerMessages: [],
        recoveryStep: 0,
      });

      const action = data.decision.recommendedAction;

      let responseText =
        "I've looked at the recent payment context and your previous payment history.";

      if (action === "recommend_card") {
        responseText +=
          " UPI has failed twice, while your previous card payments have usually succeeded. I'd recommend trying your card.";
      } else if (action === "recommend_net_banking") {
        responseText +=
          " Net Banking looks like the strongest available option based on your previous successful payments. I'd recommend trying it.";
      } else if (action === "retry_now") {
        responseText +=
          " A retry now has a reasonable chance of succeeding, so I'd recommend trying the payment again.";
      } else if (action === "retry_later") {
        responseText +=
          " The failure looks temporary, so I'd recommend trying again a little later.";
      } else if (action === "stop") {
        responseText +=
          " I don't see a sufficiently reliable recovery action right now, so I won't keep interrupting you with unnecessary attempts.";
      } else {
        responseText +=
          " I need a little more information before recommending the safest next step.";
      }

      setMessages((previous) => [
        ...previous,
        {
          id: `agent-${Date.now()}`,
          role: "agent",
          content: responseText,
        },
      ]);

      setStarted(true);
    } catch {
      setMessages((previous) => [
        ...previous,
        {
          id: `error-${Date.now()}`,
          role: "agent",
          content: "I couldn't start the recovery session. Please try again.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  async function sendMessage(event: FormEvent) {
    event.preventDefault();

    const trimmed = message.trim();

    if (!trimmed || loading || !conversationState || recovered) {
      return;
    }

    setMessage("");

    setMessages((previous) => [
      ...previous,
      {
        id: `customer-${Date.now()}`,
        role: "customer",
        content: trimmed,
      },
    ]);

    setLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: trimmed,
          state: conversationState,
        }),
      });

      if (!response.ok) {
        throw new Error("Chat request failed");
      }

      const data = await response.json();

      setConversationState(data.state);

      if (data.execution) {
        if (data.execution.result?.success === true) {
          const recoveredAmount = data.execution.result.recoveredAmount;

          const executedMethod: string =
            data.execution.result.attempt?.method ??
            data.execution.selectedMethod ??
            "";

          const attemptId: string | undefined =
            data.execution.result.attempt?.id;

          const parsedAttempts = attemptId
            ? Number.parseInt(
                attemptId.split("_").pop() ?? "",
                10,
              )
            : NaN;

          const totalAttempts = Number.isFinite(
            parsedAttempts,
          )
            ? parsedAttempts
            : paymentPanel.attempts + 1;

          setRecovered(true);

          if (executedMethod) {
            setPaymentPanel({
              status: "recovered",
              currentMethod: executedMethod,
              attempts: totalAttempts,
              recoveredAmount,
            });
          }

          setMessages((previous) => [
            ...previous,
            {
              id: `agent-${Date.now()}`,
              role: "agent",
              content: `Payment successful. ₹${recoveredAmount.toLocaleString(
                "en-IN",
              )} has been recovered successfully.`,
            },
          ]);
        } else {
          setMessages((previous) => [
            ...previous,
            {
              id: `agent-${Date.now()}`,
              role: "agent",
              content:
                "That payment attempt wasn't successful. I won't keep retrying blindly. I'll reassess the available recovery options.",
            },
          ]);
        }
      } else {
        setMessages((previous) => [
          ...previous,
          {
            id: `agent-${Date.now()}`,
            role: "agent",
            content: data.message,
          },
        ]);
      }

      if (data.decision?.action === "stop") {
        return;
      }

      /*
       * Execution is intentionally NOT triggered here.
       *
       * The chat agent recommends an action.
       * Actual payment execution will happen only after
       * we explicitly determine that the customer accepted
       * a specific available payment method.
       */
    } catch {
      setMessages((previous) => [
        ...previous,
        {
          id: `error-${Date.now()}`,
          role: "agent",
          content:
            "I had trouble processing that. Please try telling me what payment method you can or can't use.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f7f8fa] text-[#17181a]">
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col px-6 py-8">
        <TopNav />
        {/* Header */}
        <header className="mb-8 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-black text-sm font-bold text-white">
                RQ
              </div>

              <div>
                <h1 className="text-xl font-semibold tracking-tight">
                  RecoverIQ
                </h1>
                <p className="text-sm text-gray-500">
                  Adaptive revenue recovery
                </p>
              </div>
            </div>
          </div>

          <div className="hidden rounded-full border border-gray-200 bg-white px-4 py-2 text-xs text-gray-500 sm:block">
            Recovery session · ₹2,499
          </div>
        </header>

        <div className="grid flex-1 gap-6 lg:grid-cols-[1fr_320px]">
          {/* Chat */}
          <section className="flex min-h-[680px] flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
            <div className="border-b border-gray-100 px-6 py-5">
              <div className="flex items-center gap-3">
                <div className="h-2.5 w-2.5 rounded-full bg-green-500" />

                <div>
                  <p className="text-sm font-semibold">RecoverIQ Agent</p>
                  <p className="text-xs text-gray-500">
                    Analysing your payment context
                  </p>
                </div>
              </div>
            </div>

            {/* Conversation */}
            <div className="flex-1 space-y-5 overflow-y-auto px-6 py-6">
              {messages.map((item) => (
                <div
                  key={item.id}
                  className={`flex ${
                    item.role === "customer" ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-[78%] rounded-2xl px-4 py-3 text-sm leading-6 ${
                      item.role === "customer"
                        ? "rounded-br-md bg-black text-white"
                        : "rounded-bl-md bg-gray-100 text-gray-800"
                    }`}
                  >
                    {item.content}
                  </div>
                </div>
              ))}

              {loading && (
                <div className="flex justify-start">
                  <div className="rounded-2xl rounded-bl-md bg-gray-100 px-4 py-3 text-sm text-gray-500">
                    Thinking…
                  </div>
                </div>
              )}
            </div>

            {/* Composer */}
            <div className="border-t border-gray-100 p-4">
              {!started ? (
                <button
                  type="button"
                  onClick={startRecovery}
                  disabled={loading}
                  className="w-full rounded-xl bg-black px-5 py-3 text-sm font-medium text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loading ? "Starting recovery…" : "Start recovery"}
                </button>
              ) : recovered ? (
                <div className="rounded-xl bg-green-50 px-4 py-3 text-center text-sm font-medium text-green-700">
                  Payment recovered successfully.
                </div>
              ) : (
                <form onSubmit={sendMessage} className="flex gap-3">
                  <input
                    value={message}
                    onChange={(event) => setMessage(event.target.value)}
                    placeholder="Tell RecoverIQ what you can or can't use…"
                    className="min-w-0 flex-1 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none transition placeholder:text-gray-400 focus:border-gray-400 focus:bg-white"
                  />

                  <button
                    type="submit"
                    disabled={loading || !message.trim()}
                    className="rounded-xl bg-black px-5 py-3 text-sm font-medium text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Send
                  </button>
                </form>
              )}

              <p className="mt-3 text-center text-[11px] leading-4 text-gray-400">
                Never share your UPI PIN, card PIN, CVV, OTP, password, or
                banking credentials here. RecoverIQ will never ask for them.
              </p>
            </div>
          </section>

          {/* Context panel */}
          <aside className="hidden lg:block">
            <div className="sticky top-8 space-y-4">
              <div className="rounded-2xl border border-gray-200 bg-white p-5">
                <p className="mb-4 text-xs font-medium uppercase tracking-wider text-gray-400">
                  Payment
                </p>

                <div className="mb-5">
                  <p className="text-3xl font-semibold">
                    ₹
                    {paymentPanel.status === "recovered"
                      ? paymentPanel.recoveredAmount.toLocaleString(
                          "en-IN",
                        )
                      : "2,499"}
                  </p>
                  <p className="mt-1 text-sm text-gray-500">
                    {paymentPanel.status === "recovered"
                      ? "Recovered amount"
                      : "Payment attempt"}
                  </p>
                </div>

                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Status</span>
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                        paymentPanel.status === "recovered"
                          ? "bg-green-50 text-green-700"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {paymentPanel.status === "recovered"
                        ? "Recovered"
                        : "In progress"}
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-gray-500">Current method</span>
                    <span className="font-medium">
                      {methodLabel[paymentPanel.currentMethod] ??
                        paymentPanel.currentMethod}
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-gray-500">Attempts</span>
                    <span className="font-medium">
                      {paymentPanel.attempts}
                    </span>
                  </div>

                  {paymentPanel.status === "recovered" && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Recovered</span>
                      <span className="font-medium">
                        ₹
                        {paymentPanel.recoveredAmount.toLocaleString(
                          "en-IN",
                        )}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="rounded-2xl border border-gray-200 bg-white p-5">
                <p className="mb-4 text-xs font-medium uppercase tracking-wider text-gray-400">
                  Agent principle
                </p>

                <p className="text-sm leading-6 text-gray-700">
                  RecoverIQ recommends the safest effective action. You always
                  decide which payment method to use.
                </p>
              </div>

              {conversationState && (
                <div className="rounded-2xl border border-gray-200 bg-white p-5">
                  <p className="mb-3 text-xs font-medium uppercase tracking-wider text-gray-400">
                    Available methods
                  </p>

                  <div className="space-y-2">
                    {conversationState.availablePaymentMethods.map((method) => (
                      <div
                        key={method}
                        className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2 text-sm"
                      >
                        <span>{methodLabel[method] ?? method}</span>

                        <span className="text-xs text-green-600">
                          Available
                        </span>
                      </div>
                    ))}
                  </div>

                  {conversationState.unavailablePaymentMethods.length > 0 && (
                    <div className="mt-3 border-t border-gray-100 pt-3">
                      <p className="mb-2 text-xs text-gray-400">
                        Customer unavailable
                      </p>

                      {conversationState.unavailablePaymentMethods.map(
                        (method) => (
                          <div
                            key={method}
                            className="px-1 py-1 text-sm text-gray-400 line-through"
                          >
                            {methodLabel[method] ?? method}
                          </div>
                        ),
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
