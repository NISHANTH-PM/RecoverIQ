# RecoverIQ

> **Revenue recovery is not a retry problem. It is a decision problem.**

RecoverIQ is a constrained AI recovery agent built for the **Razorpay AI Buildathon 2026 — AI Revenue Recovery** track.

It helps merchants recover failed-payment revenue by diagnosing why a payment is at risk, evaluating the safest effective recovery action, adapting to new information, and stopping when further intervention is not justified.

**AI recommends. The customer decides.**

---

## The Problem

When a payment fails, conventional recovery systems often fall back to fixed retries or generic interventions.

That creates four problems:

- They do not understand **why** a specific payment failed.
- They treat different customers, payment methods, and failure conditions similarly.
- They can create unnecessary friction through repeated retries or irrelevant recommendations.
- They have limited ability to explain **why an intervention was chosen** or when recovery should stop.

RecoverIQ focuses on the missing decision layer:

> **Given the current payment context, what is the safest action most likely to recover this revenue — and when should we stop?**

---

## What RecoverIQ Does

RecoverIQ turns fragmented payment signals into explicit, bounded recovery decisions.

```text
Payment Failure
      ↓
Context Engine
      ↓
AI Investigator
      ↓
Structured Diagnosis
      ↓
Decision Engine
      ↓
Candidate Actions
      ↓
Probability + Expected Value
      ↓
Policy / Safety Guardrails
      ↓
Customer Recommendation
      ↓
Outcome / New Information
      ↓
Re-evaluate
```

### Recovery actions

The agent can choose among bounded actions such as:

- Retry now
- Retry later
- Recommend an alternative payment method
- Ask a useful non-sensitive question
- Stop / abstain

**Abstention is a feature, not a failure.**

The agent does not force a payment method. Recommendations remain under customer control.

---

## Why It Is Different

### 1. Context-aware recovery

Instead of blindly retrying, RecoverIQ considers:

- Payment method
- Failure type
- Previous attempts
- Customer payment history
- Merchant context
- Timing
- Payment-method / environment health
- Customer-provided non-sensitive information

### 2. Explicit decision economics

For each permitted action, RecoverIQ estimates:

```text
ENV(action)
= P(success | context, action)
  × Expected Revenue
  − Intervention Cost
  − Customer Friction Cost
  − Risk Penalty
```

The highest-value permitted action is selected only when it clears the decision threshold. Otherwise the agent can ask, defer, or stop.

### 3. Deterministic safety layer

The LLM is not the final authority over recovery policy.

AI interprets context and helps diagnose the failure. Deterministic decision logic handles:

- Attempt limits
- Failure-type constraints
- Confidence requirements
- Allowed actions
- Session-level constraints
- Explicit customer consent
- Stop conditions

This keeps the agent explainable and bounded.

### 4. Adaptive customer interaction

The recovery decision is re-evaluated when the customer provides new information.

Example:

```text
UPI fails twice
      ↓
RecoverIQ recommends Card
      ↓
Customer: "I don't have my card"
      ↓
RecoverIQ updates context
      ↓
Net Banking recommended
      ↓
Customer: "Wait, I found my card"
      ↓
RecoverIQ re-evaluates
      ↓
Card recommended
      ↓
Customer explicitly chooses Card
```

---

## Customer Experience

The customer-facing recovery experience is intentionally separate from merchant intelligence.

### Customer

`/`

A focused recovery chatbot and payment context designed to help the customer complete a failed payment without exposing merchant-only analytics.

### Merchant

`/merchant`

A merchant/operator dashboard showing recovery performance, safety signals, evaluation results, and the rationale for why RecoverIQ is valuable.

In production, these surfaces would sit behind authenticated role-based access control.

---

## Security & Privacy

RecoverIQ uses an **Ephemeral Recovery Session** model.

The conversational session is temporary and does not require sensitive payment credentials.

The customer is explicitly warned:

> Never share your UPI PIN, card PIN, CVV, OTP, password, or banking credentials in this chat. We will never ask for them.

Sensitive-data handling is designed to fail closed:

```text
Ephemeral Chat
      ↓
Sensitive-data Detection
      ↓
Redaction / Sanitization
      ↓
Safety Verification
      ↓
Structured Recovery Events
      ↓
Analytics / Learning
```

The system favors structured, anonymized recovery events over retaining raw conversations.

The audit trail records decision-relevant information such as:

- Failure type
- Relevant signals
- Agent decision
- Policy decision
- Customer-selected action
- Outcome
- Recovered amount

It does not require payment credentials or unnecessary private conversation.

> **The conversation disappears. The accountability doesn't.**

---

## Evaluation

RecoverIQ includes a deterministic evaluation harness comparing the adaptive agent against a strong **Fixed Retry** baseline.

### Evaluation split

- 70% — development / training
- 10% — validation
- 20% — held-out test

The canonical evaluator uses **100 deterministic scenarios** with fixed seeds.

The scenarios cover variation in payment histories, payment methods, failure conditions, temporary and persistent failures, incomplete information, delayed outcomes, environment degradation, customer responses, and cases where stopping is the correct decision.

### Canonical evaluation snapshot

| Metric | Fixed Retry | RecoverIQ |
|---|---:|---:|
| Recovery rate | 72% | **95%** |
| Recovered revenue | ₹3,29,065 | **₹4,08,647** |
| Avg. attempts | 2.52 | **2.30** |
| Policy violations | 0 | **0** |

**Incremental recovered revenue: ₹79,582**

This is an evaluation result from the deterministic scenario harness, not a claim of production revenue recovered.

The primary comparison is:

```text
Incremental Recovered Revenue
= Adaptive Agent Revenue
  − Fixed-Retry Baseline Revenue
```

The same held-out scenarios are used for comparison rather than comparing against a deliberately weak baseline.

---

## Demo Scenario

The included demo models a failed ₹2,499 transaction.

Customer history:

- Card: 9/10 successful
- UPI: 4/6 successful
- Net Banking: 4/5 successful

Current context:

- UPI has failed twice
- Failure signal: `bank_timeout`
- UPI environment is degraded
- Card and Net Banking are healthy

RecoverIQ recommends Card based on the available evidence.

If the customer says they do not have their card, the agent adapts and recommends Net Banking.

If the customer later says they found their card, RecoverIQ re-evaluates and can recommend Card again.

The customer explicitly chooses the method before payment execution.

Successful completion recovers **₹2,499** in the demo flow.

---

## Architecture

The project separates probabilistic interpretation from deterministic control:

```text
                 ┌──────────────────────┐
                 │   Payment Context    │
                 └──────────┬───────────┘
                            ↓
                 ┌──────────────────────┐
                 │   AI Investigator    │
                 │ Diagnosis / Context  │
                 └──────────┬───────────┘
                            ↓
                 ┌──────────────────────┐
                 │   Decision Engine    │
                 │ P(success) + ENV    │
                 └──────────┬───────────┘
                            ↓
                 ┌──────────────────────┐
                 │ Policy / Guardrails  │
                 └──────────┬───────────┘
                            ↓
                 ┌──────────────────────┐
                 │ Customer Decision    │
                 └──────────┬───────────┘
                            ↓
                 ┌──────────────────────┐
                 │ Outcome / Re-evaluate│
                 └──────────────────────┘
```

### Key design principle

The LLM is not allowed to directly determine unrestricted payment behavior.

It operates inside a bounded action space, while deterministic code enforces policy and safety constraints.

---

## Tech Stack

- **Next.js**
- **TypeScript**
- **React**
- AI-assisted recovery reasoning
- Deterministic recovery decision engine
- Deterministic evaluation harness
- Vercel deployment

---

## Running Locally

### Requirements

- Node.js
- npm

### Install

```bash
npm install
```

### Start development server

```bash
npm run dev
```

Then open:

```text
http://localhost:3000
```

Merchant intelligence:

```text
http://localhost:3000/merchant
```

### Validate

```bash
npm run typecheck
npm run build
```

If an evaluation script is included in the repository, use the canonical evaluator rather than inventing new evaluation parameters when reproducing the published snapshot.

---

## Project Structure

```text
app/
├── page.tsx                 # Customer recovery experience
├── merchant/
│   └── page.tsx             # Merchant intelligence
└── api/
    └── chat/
        └── route.ts         # Recovery interaction API

src/
├── ai/
│   ├── recovery-agent.ts
│   └── conversation-state.ts
├── recovery/
│   └── policy.ts
└── evaluation/
    └── te.ts                # Canonical deterministic evaluator
```

---

## Design Principles

### AI recommends. Customer decides.

RecoverIQ is an advisor, not an authority.

### Least-friction effective intervention

The goal is not to maximize retries. It is to maximize expected recovered revenue while accounting for customer friction and risk.

### Bounded autonomy

The agent can act only within explicit policy constraints.

### Re-evaluate when reality changes

New customer information or payment outcomes can change the best action.

### Stop when recovery is no longer justified

A recovery system should know when **not** to intervene.

---

## Future Extensions

The same decision framework can be extended beyond failed payments to:

- Subscription payment recovery
- Checkout abandonment
- Refund / reversal recovery
- Failed payout recovery
- B2B receivables
- Merchant-specific recovery playbooks

These are intentionally outside the current MVP scope.

---

## Buildathon Thesis

> **Merchants don't primarily have a recovery execution problem. They have a recovery decision problem.**

RecoverIQ is built around that thesis: diagnose the situation, evaluate the available actions, choose the safest effective intervention, adapt when new information appears, and measure whether the intervention actually improved recovery.

---

## Status

**MVP complete · Demo ready · Deployed on Vercel**

Built for the **Razorpay AI Buildathon 2026**.
