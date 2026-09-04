"use client";

import { useEffect, useState } from "react";

import TopNav from "../components/TopNav";

type ComparisonRow = {
  metric: string;
  fixedRetry: string;
  recoverIQ: string;
  better: "recoverIQ" | "fixedRetry" | "equal";
};

type Insight = {
  title: string;
  body: string;
};

type TimelineStep = {
  step: number;
  title: string;
  signal: string;
  decision: string;
  outcome: string;
};

type EnvDetail = {
  recommendedAction: string;
  estimatedSuccessPct: number;
  expectedRevenue: number;
  interventionCost: number;
  frictionCost: number;
  riskPenalty: number;
  env: number;
  confidence: string;
  explanation: string;
};

type EvaluatedAction = {
  action: string;
  rawAction: string;
  probabilityPct: number;
  env: number;
  policyAllowed: boolean;
  confidence: string;
  probabilityReasons: string[];
};

type DashboardData = {
  hero: {
    incrementalRecoveredRevenue: number;
    recoverIQRecoveredRevenue: number;
    fixedRetryRecoveredRevenue: number;
    scenariosEvaluated: number;
  };
  comparison: ComparisonRow[];
  insights: Insight[];
  safety: {
    policyViolations: number;
    explicitCustomerConsentRequired: boolean;
    maxRecoveryAttempts: number;
  };
  demoTransaction: {
    id: string;
    amount: number;
    currency: string;
    latestMethod: string;
    attempts: number;
  };
  demoTimeline: TimelineStep[];
  envDetail: EnvDetail | null;
  evaluatedActions: EvaluatedAction[];
};

const methodLabel: Record<string, string> = {
  upi: "UPI",
  card: "Card",
  net_banking: "Net Banking",
  wallet: "Wallet",
};

function formatINR(value: number): string {
  return `₹${Math.round(value).toLocaleString("en-IN")}`;
}

export default function MerchantDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    fetch("/api/dashboard")
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("Dashboard request failed");
        }
        return response.json();
      })
      .then((json: DashboardData) => {
        if (!cancelled) setData(json);
      })
      .catch(() => {
        if (!cancelled) {
          setError(
            "Unable to load dashboard data. Please refresh.",
          );
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="min-h-screen bg-[#f7f8fa] text-[#17181a]">
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col px-6 py-8">
        <TopNav />

        {/* Header */}
        <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-black text-sm font-bold text-white">
              RQ
            </div>
            <div>
              <h1 className="text-xl font-semibold tracking-tight">
                RecoverIQ
              </h1>
              <p className="text-sm text-gray-500">
                Merchant Intelligence
              </p>
            </div>
          </div>
          <div className="hidden rounded-full border border-gray-200 bg-white px-4 py-2 text-xs text-gray-500 sm:block">
            Evaluation snapshot · {data?.hero.scenariosEvaluated ?? "—"} scenarios
          </div>
        </header>

        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
            {error}
          </div>
        )}

        {!data && !error && (
          <div className="rounded-2xl border border-gray-200 bg-white p-6 text-sm text-gray-500">
            Loading evaluation snapshot…
          </div>
        )}

        {data && (
          <div className="space-y-6">
            <p className="text-sm text-gray-500">
              Understand where revenue is at risk and how
              RecoverIQ recovers it.
            </p>

            {/* Hero metric */}
            <section className="grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl border border-gray-200 bg-white p-6 md:col-span-2">
                <p className="text-xs font-medium uppercase tracking-wider text-gray-400">
                  Incremental recovered revenue
                </p>
                <p className="mt-2 text-5xl font-semibold tracking-tight">
                  +{formatINR(data.hero.incrementalRecoveredRevenue)}
                </p>
                <p className="mt-3 text-sm text-gray-500">
                  Additional revenue recovered versus Fixed
                  Retry.
                </p>

                <div className="mt-5 grid gap-4 border-t border-gray-100 pt-5 sm:grid-cols-2">
                  <div>
                    <p className="text-xs text-gray-400">
                      RecoverIQ recovered
                    </p>
                    <p className="mt-1 text-lg font-semibold">
                      {formatINR(
                        data.hero.recoverIQRecoveredRevenue,
                      )}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">
                      Fixed Retry
                    </p>
                    <p className="mt-1 text-lg font-semibold text-gray-500">
                      {formatINR(
                        data.hero.fixedRetryRecoveredRevenue,
                      )}
                    </p>
                  </div>
                </div>
              </div>

              {/* Safety */}
              <div className="rounded-2xl border border-gray-200 bg-white p-6">
                <p className="text-xs font-medium uppercase tracking-wider text-gray-400">
                  Safety signals
                </p>

                <div className="mt-4 space-y-4 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">
                      Policy violations
                    </span>
                    <span className="inline-flex items-center rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700">
                      {data.safety.policyViolations}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">
                      Explicit consent
                    </span>
                    <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">
                      {data.safety.explicitCustomerConsentRequired
                        ? "Required"
                        : "Not required"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">
                      Max attempts
                    </span>
                    <span className="font-medium">
                      {data.safety.maxRecoveryAttempts}
                    </span>
                  </div>
                </div>
              </div>
            </section>

            {/* Recovery Performance */}
            <section className="rounded-2xl border border-gray-200 bg-white p-6">
              <div className="mb-5 flex items-center justify-between">
                <p className="text-sm font-semibold">
                  Recovery performance
                </p>
                <p className="text-xs text-gray-400">
                  Deterministic evaluation · 100 Scenarios
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs uppercase tracking-wider text-gray-400">
                      <th className="pb-3 font-medium">Metric</th>
                      <th className="pb-3 font-medium">Fixed Retry</th>
                      <th className="pb-3 font-medium">RecoverIQ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {data.comparison.map((row) => (
                      <tr key={row.metric}>
                        <td className="py-3 text-gray-600">
                          {row.metric}
                        </td>
                        <td
                          className={`py-3 font-medium ${
                            row.better === "fixedRetry"
                              ? "text-gray-900"
                              : "text-gray-500"
                          }`}
                        >
                          {row.fixedRetry}
                        </td>
                        <td
                          className={`py-3 font-medium ${
                            row.better === "recoverIQ"
                              ? "text-green-700"
                              : "text-gray-500"
                          }`}
                        >
                          {row.recoverIQ}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            {/* Why RecoverIQ wins */}
            <section>
              <p className="mb-3 text-sm font-semibold">
                Why RecoverIQ wins
              </p>
              <div className="grid gap-4 md:grid-cols-3">
                {data.insights.map((insight) => (
                  <div
                    key={insight.title}
                    className="rounded-2xl border border-gray-200 bg-white p-5"
                  >
                    <p className="text-sm font-semibold">
                      {insight.title}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-gray-600">
                      {insight.body}
                    </p>
                  </div>
                ))}
              </div>
            </section>

            <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
              {/* Decision timeline */}
              <section className="rounded-2xl border border-gray-200 bg-white p-6">
                <div className="mb-5">
                  <p className="text-sm font-semibold">
                    Recovery decision · audit trail
                  </p>
                  <p className="mt-1 text-xs text-gray-400">
                    Demo transaction{" "}
                    {data.demoTransaction.id} ·{" "}
                    {formatINR(data.demoTransaction.amount)}
                  </p>
                </div>

                <ol className="space-y-5">
                  {data.demoTimeline.map((step) => (
                    <li
                      key={step.step}
                      className="flex gap-4"
                    >
                      <div className="flex flex-col items-center">
                        <div className="flex h-7 w-7 items-center justify-center rounded-full border border-gray-200 bg-white text-xs font-medium">
                          {step.step}
                        </div>
                        <div className="mt-1 w-px flex-1 bg-gray-100" />
                      </div>

                      <div className="flex-1 pb-2">
                        <p className="text-sm font-medium">
                          {step.title}
                        </p>
                        <dl className="mt-2 grid gap-1 text-xs text-gray-500 sm:grid-cols-3">
                          <div>
                            <dt className="text-gray-400">
                              Signal
                            </dt>
                            <dd className="text-gray-700">
                              {step.signal}
                            </dd>
                          </div>
                          <div>
                            <dt className="text-gray-400">
                              Decision
                            </dt>
                            <dd className="text-gray-700">
                              {step.decision}
                            </dd>
                          </div>
                          <div>
                            <dt className="text-gray-400">
                              Outcome
                            </dt>
                            <dd className="text-gray-700">
                              {step.outcome}
                            </dd>
                          </div>
                        </dl>
                      </div>
                    </li>
                  ))}
                </ol>
              </section>

              {/* ENV detail */}
              <section className="rounded-2xl border border-gray-200 bg-white p-6">
                <div className="mb-5">
                  <p className="text-sm font-semibold">
                    Agent decision detail
                  </p>
                  <p className="mt-1 text-xs text-gray-400">
                    Demo case · chosen action
                  </p>
                </div>

                {data.envDetail ? (
                  <div className="space-y-3 text-sm">
                    <Row
                      label="Recommended action"
                      value={
                        data.envDetail.recommendedAction
                      }
                    />
                    <Row
                      label="Estimated success"
                      value={`${data.envDetail.estimatedSuccessPct}%`}
                    />
                    <Row
                      label="Confidence"
                      value={
                        data.envDetail.confidence
                          .charAt(0)
                          .toUpperCase() +
                        data.envDetail.confidence.slice(1)
                      }
                    />
                    <Row
                      label="Expected revenue"
                      value={formatINR(
                        data.envDetail.expectedRevenue,
                      )}
                    />
                    <Row
                      label="Intervention cost"
                      value={formatINR(
                        data.envDetail.interventionCost,
                      )}
                    />
                    <Row
                      label="Friction cost"
                      value={formatINR(
                        data.envDetail.frictionCost,
                      )}
                    />
                    <Row
                      label="Risk penalty"
                      value={formatINR(
                        data.envDetail.riskPenalty,
                      )}
                    />
                    <div className="mt-2 flex items-center justify-between border-t border-gray-100 pt-3 text-sm">
                      <span className="font-medium text-gray-700">
                        Expected net value (ENV)
                      </span>
                      <span className="font-semibold">
                        {formatINR(data.envDetail.env)}
                      </span>
                    </div>
                    <p className="mt-2 text-xs leading-5 text-gray-500">
                      {data.envDetail.explanation}
                    </p>

                    {data.evaluatedActions.length > 0 && (
                      <div className="mt-4 border-t border-gray-100 pt-4">
                        <p className="mb-2 text-xs font-medium uppercase tracking-wider text-gray-400">
                          Alternatives considered
                        </p>
                        <ul className="space-y-1.5 text-xs">
                          {data.evaluatedActions.map(
                            (item) => (
                              <li
                                key={item.rawAction}
                                className="flex items-center justify-between"
                              >
                                <span
                                  className={
                                    item.policyAllowed
                                      ? "text-gray-700"
                                      : "text-gray-400 line-through"
                                  }
                                >
                                  {item.action}
                                </span>
                                <span
                                  className={
                                    item.policyAllowed
                                      ? "text-gray-500"
                                      : "text-gray-400"
                                  }
                                >
                                  ENV {formatINR(item.env)}
                                </span>
                              </li>
                            ),
                          )}
                        </ul>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">
                    No decision detail available for this
                    transaction.
                  </p>
                )}
              </section>
            </div>

            <footer className="pt-2 text-center text-[11px] leading-4 text-gray-400">
              Numbers above are derived from a deterministic
              evaluation. No payment credentials are ever shared
              with RecoverIQ.
            </footer>
          </div>
        )}
      </div>
    </main>
  );
}

function Row({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-gray-500">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}