# Razorpay AI Buildathon — AI Revenue Recovery Agent

## 1. Project Thesis

### Core Insight

Merchants don't primarily have a recovery execution problem. They have a **recovery decision problem**.

Existing systems can detect that money was lost and often respond with blunt retries or generic messages. They are weak at answering:

- Why did this specific payment failure happen?
- Is it still recoverable?
- What is the lowest-friction intervention that has a meaningful chance of working?
- When should we stop so we don't damage customer or merchant relationships?
- Did the intervention actually cause incremental recovery?

The project therefore focuses on **better recovery decisions under uncertainty**, rather than simply adding more retries or another chatbot.

---

## 2. Problem Statement

Online merchants lose revenue when payments fail, but conventional recovery systems largely rely on fixed retries and generic interventions.

They lack an intelligent system that can:

1. Understand why a specific payment failed.
2. Determine whether the failure is likely recoverable.
3. Evaluate possible recovery actions.
4. Recommend the safest effective intervention.
5. Adapt when new information becomes available.
6. Know when further intervention is not worthwhile.
7. Measure whether the intervention produced incremental recovered revenue.

---

## 3. Solution

We are building a **constrained AI recovery agent** that turns fragmented payment signals into explicit, explainable, and bounded recovery decisions.

### One-sentence thesis

> **We build a constrained AI agent that diagnoses why revenue is at risk, determines the safest effective intervention, executes it within hard limits, and measures incremental recovery—instead of retrying or messaging blindly.**

The initial MVP focuses on **failed payment recovery**.

---

## 4. Core Recovery Loop

```text
PAYMENT FAILURE
      ↓
CONTEXT ENGINE
      ↓
AI INVESTIGATION
      ↓
RECOVERY DECISION
      ↓
POLICY / GUARDRAIL CHECK
      ↓
CUSTOMER RECOMMENDATION
      ↓
CUSTOMER CHOICE
      ↓
NEW INFORMATION / PAYMENT OUTCOME
      ↓
RE-EVALUATE
      ↓
RECOVER / RECOMMEND AGAIN / STOP
```

The agent should consider:

- Current payment attempt
- Payment method
- Failure/error signals
- Customer payment history
- Merchant context
- Previous attempts
- Timing
- Relevant network/payment-method context
- Customer-provided non-sensitive information

---

## 5. Customer Agency

A central product principle is:

> **AI recommends. Customer decides.**

The agent must never force a payment method simply because its model predicts that method has the highest probability of success.

Example:

> UPI has failed twice. Your previous Visa payments have usually succeeded, so we'd recommend trying Visa. You can still choose UPI again, Net Banking, or another available method.

The AI provides an opinion backed by evidence. The customer remains in control.

### Adaptive conversation

The chatbot is **not a scripted FAQ bot** and should not repeatedly force fixed response options.

If the customer provides new information, that information becomes new evidence.

Example:

1. UPI fails repeatedly.
2. Agent recommends Visa based on historical/contextual signals.
3. Customer says: "I don't have my card with me."
4. Agent updates the state.
5. Agent recommends the next best available option, such as Net Banking.
6. If no option is sufficiently promising, the agent can recommend stopping.

A customer response is therefore not simply an input to a fixed flow; it can change the recovery decision.

---

## 6. The Agent Must Be Able to Abstain

A strong recovery system should not always attempt another action.

Possible decisions:

- Retry now
- Retry later
- Recommend another payment method
- Ask a relevant non-sensitive question
- Stop / abstain

For hard declines or low-confidence situations, the correct recommendation may be:

> "I don't recommend repeatedly trying this payment method."

**Abstention is a feature, not a failure.**

---

## 7. Policy and Guardrails

The AI does not receive unlimited authority.

A deterministic policy layer controls what the agent is permitted to do.

Examples:

- Maximum retry count
- Minimum time between retries
- Communication frequency limits
- Allowed payment-method actions
- Amount thresholds
- Confidence requirements
- Stopping conditions
- Escalation conditions

The architecture separates:

**AI reasoning → recommendation**

from:

**Policy engine → permission to act**

Every customer-facing or money-related action must be explainable, bounded, and auditable.

If the AI/model is unavailable or uncertain, the system should gracefully fall back to safe deterministic rules.

---

## 8. Privacy and Security

### Ephemeral Recovery Session

Each customer recovery conversation should be treated as an **ephemeral recovery session**, rather than a normal persistent chatbot conversation.

The customer should be explicitly told:

- Never share OTPs.
- Never share UPI PINs.
- Never share card PINs.
- Never share CVVs.
- Never share passwords or banking credentials.
- The recovery agent will never require these details.

Sensitive payment authentication should happen only through the secure payment interface, outside the AI conversation.

### Privacy Firewall

If interaction data is required for analytics or model improvement, raw conversation should not simply be dumped into a training database.

Proposed pipeline:

```text
EPHEMERAL CHAT
      ↓
SENSITIVE-DATA DETECTION
      ↓
REDACTION / SANITIZATION
      ↓
SAFETY VERIFICATION
      ↓
STRUCTURED / ANONYMIZED RECOVERY EVENTS
      ↓
ANALYTICS / TRAINING DATA
```

Deterministic detection should be used wherever possible for recognizable sensitive information, potentially supplemented by ML/AI detection for contextual cases.

The system should **fail closed**: if information cannot confidently be classified as safe to persist, it should not be persisted.

### Conversation vs Audit Trail

The customer's private conversation and the system's accountability record are separate.

The conversation can expire while a minimal audit record remains, such as:

- Failure type
- Agent decision
- Reason for recommendation
- Policy decision
- Customer-selected action
- Outcome
- Recovery amount

The audit trail should avoid storing sensitive credentials or unnecessary private conversation content.

> **The conversation disappears. The accountability doesn't.**

---

## 9. Core Technical Thesis

The novelty is **not simply using an LLM for payment recovery**.

The core technical thesis is:

> **Recovery is a sequential decision problem under uncertainty.**

The system should evaluate several possible actions and select the one with the best expected outcome while accounting for:

- Probability of recovery
- Revenue at stake
- Customer friction
- Risk
- Previous attempts
- Policy constraints
- New information

An illustrative objective is:

```text
Expected Value of Intervention
≈
Probability of Recovery × Revenue Recovered
− Intervention Cost
− Customer Friction Cost
− Risk Cost
```

The exact formulation will be determined during implementation and evaluation rather than assumed in advance.

---

## 10. Baseline vs Adaptive Agent

A probabilistic/adaptive system is only valuable if it demonstrates improvement over a simpler baseline.

The evaluation should compare the agent against deterministic recovery strategies such as:

- Fixed retry policy
- Fixed retry timing
- Generic alternative-method suggestion

The key question is:

> **Does contextual, adaptive decision-making recover more revenue with less unnecessary friction than a fixed recovery policy?**

---

## 11. Incremental Recovery

We must distinguish:

**Recovery after intervention**

from:

**Recovery caused by the intervention.**

The system should therefore evaluate against a baseline/control policy.

For example:

```text
Failed Payment Opportunities
        │
        ├── Baseline Group
        │      Fixed recovery policy
        │
        └── Agent Group
               Adaptive recovery policy
```

Primary metric:

> **Incremental recovered revenue**

Supporting metrics may include:

- Recovery rate
- Revenue recovered
- Time to recovery
- Number of retries
- Unnecessary interventions
- Customer friction
- Repeat failures
- Escalations
- Policy violations
- Abstention rate
- Recommendation accuracy

---

## 12. Synthetic Evaluation Environment

Because this project will initially use synthetic data, the synthetic environment must be designed to test actual decision quality rather than merely make the demo look successful.

The environment should contain realistic variation in:

- Transaction context
- Payment methods
- Failure types
- Customer histories
- Merchant histories
- Previous payment attempts
- Timing
- Payment/network conditions
- Customer responses
- Eventual payment outcomes

The evaluation data must be separated from model-development data.

The environment should provide enough ground truth to determine whether an agent recommendation was better than the baseline decision.

**Do not invent performance numbers. Report only measured results from the actual test environment.**

---

## 13. Example End-to-End Scenario

### Initial failure

Customer attempts a ₹2,499 payment through UPI.

UPI fails.

The agent investigates:

- UPI has failed multiple times.
- Customer has previously succeeded frequently with Visa.
- Current contextual signals indicate Visa is a viable alternative.

Agent:

> "UPI has failed twice for this payment. Your previous Visa payments have usually succeeded, so we'd recommend trying Visa. You can also choose another available payment method."

Customer:

> "I don't have my card with me."

Agent updates its context and does not keep pushing Visa.

Agent:

> "Understood. In that case, I'd recommend Net Banking. You can also retry UPI if you'd prefer."

Customer chooses Net Banking.

Payment succeeds.

The merchant system records:

- Recovery amount: ₹2,499
- Agent recommendation
- Customer-selected action
- Decision rationale
- Outcome
- Policy checks

The evaluation system later determines whether the adaptive policy generated incremental recovery compared with the baseline.

---

## 14. What This Is Not

This project is deliberately **not**:

- A generic payment chatbot
- A fixed decision-tree bot
- A blind retry engine
- An aggressive collections bot
- An autonomous agent that changes payment methods without consent
- A system that asks customers for OTPs, PINs, CVVs, passwords, or banking credentials
- A system that claims recovery improvements without controlled evaluation

---

## 15. MVP Scope

### In scope

**Failed payment recovery**

The core MVP:

> Failed payment → diagnosis → recovery recommendation → customer choice → adaptive recovery → outcome → baseline comparison

### Potential future extensions

The same decision framework could later extend to:

- Subscription renewal failures
- Checkout abandonment
- B2B receivables
- Other revenue leakage scenarios

These are **future extensions, not MVP requirements**.

---

## 16. Buildathon Success Criteria

The project should demonstrate:

### Product

- Clear customer value
- Low-friction recovery
- Customer agency
- Useful explanations

### AI

- Contextual diagnosis
- Adaptive decision-making
- Sequential reasoning
- Appropriate abstention
- Meaningful use of historical/contextual signals

### Engineering

- Deterministic policy enforcement
- Safe fallback behavior
- Ephemeral customer sessions
- Privacy firewall
- Structured audit trail
- Reliable action boundaries

### Evidence

- Baseline comparison
- Held-out evaluation
- Incremental recovery measurement
- Honest error/exception reporting
- Security/privacy test cases

---

## 17. Guiding Principles

1. **AI recommends; customer decides.**
2. **Recovery is a decision problem, not merely a retry problem.**
3. **Use context, not generic rules.**
4. **New customer information should change the decision when appropriate.**
5. **Do not force recovery.**
6. **Abstain when uncertain.**
7. **Every action must be bounded by policy.**
8. **Never request or retain sensitive payment credentials in the AI conversation.**
9. **Privacy by default.**
10. **Measure incremental recovery, not activity.**
11. **The conversation can disappear; accountability must remain.**
12. **Do not claim performance without controlled evidence.**

---

## 18. Current Status

**Thesis:** Locked  
**Problem statement:** Locked  
**MVP:** Failed payment recovery  
**Customer experience principles:** Locked  
**Agent autonomy boundaries:** Locked  
**Privacy approach:** Locked  
**Evaluation philosophy:** Locked  

### Next build phase

1. Design the synthetic transaction world.
2. Define the data schema.
3. Define failure/root-cause taxonomy.
4. Define baseline recovery policies.
5. Define the adaptive decision engine.
6. Define the policy/guardrail engine.
7. Define the privacy firewall.
8. Build the recovery-session UX.
9. Build the evaluation harness.
10. Run baseline vs agent experiments.
11. Iterate based on measured results.

---

## 19. Locked MVP Decision Model & Evaluation Metrics

This section locks the concrete decision and measurement approach for the MVP. It is the implementation contract unless later evidence requires a deliberate revision.

### 19.1 Primary Success Metric

> **Incremental Recovered Revenue** = revenue recovered by the Adaptive Agent − revenue recovered by the strong Fixed-Retry Baseline.

The comparison must use the same held-out failed-payment scenarios through counterfactual/replay evaluation where the synthetic environment supports it. If separate randomized groups are used instead, assignment must be locked before evaluation and the groups must be comparable.

The **20% holdout/test set is never used for tuning** the agent, rules, thresholds, or baseline.

### 19.2 Non-Negotiable Supporting Constraints

- **Policy violation rate = 0%** — hard requirement.
- **Unnecessary intervention rate ≤ 15%** — interventions judged to have near-zero expected benefit under the predefined evaluation policy.
- **Customer friction score** — average number of customer actions required per recovery, reported alongside recovery outcomes.

The definition and threshold for unnecessary intervention must be established before final evaluation and not changed after seeing holdout results.

### 19.3 Secondary Metrics

| Rank | Metric | Purpose |
|---|---|---|
| 1 | Incremental Recovered Revenue | Primary business claim |
| 2 | Recovery Rate — Agent vs Baseline | Directly communicates recovery improvement |
| 3 | Average Attempts Until Recovery / Stop | Measures efficiency |
| 4 | Abstention Rate | Shows whether the agent knows when not to intervene |
| 5 | Unnecessary Intervention Rate | Protects customer experience |
| 6 | Time to Recovery | Measures speed of recovery |
| 7 | Policy Violation Count / Rate | Measures safety |
| 8 | Recommendation Acceptance Rate | Measures customer-facing recommendation quality |

For comparability across experiments, also report incremental recovered revenue **per 100 failed-payment opportunities** in addition to total rupee value.

### 19.4 Practical P(success | context, action) Estimation

The MVP does not require a complex neural probability model. We will begin with a **transparent historical-frequency model plus a small number of explicit context adjustments**.

#### Base probability

```text
Base P(success)
    = historical success rate for similar
      failure type + payment method + action
```

The lookup/history dimensions may include:

- Failure type
- Payment method
- Candidate action
- Relevant customer/payment history
- Merchant context
- Time/network context where available

#### Context adjustments

A small, explicit set of adjustments can modify the base estimate:

| Context signal | Example effect |
|---|---|
| Customer has high historical success with an alternative method | Increase alternative-method estimate |
| Multiple recent failures using the same method | Decrease immediate-retry estimate |
| Hard decline detected | Strongly cap retry probability |
| Network/UPI outage pattern | Increase retry-later estimate |
| Very little history / new customer | Lower confidence; prefer ask or abstain |
| High transaction amount | Use more conservative decision thresholds |

Adjustment magnitudes and thresholds are implementation parameters. They must be tuned only on development/validation data and never chosen by inspecting final holdout outcomes.

The resulting probability is kept in a conservative range rather than allowing arbitrary overconfidence.

### 19.5 Confidence Is Separate From P(success)

`P(success | context, action)` estimates the likelihood of success. **Confidence** estimates how much evidence supports that estimate.

- **High confidence:** many relevant historical examples and consistent signals.
- **Medium confidence:** some relevant evidence but meaningful uncertainty.
- **Low confidence:** little history, conflicting signals, or an unusual case.

Low confidence should push the system toward a safer action, such as asking a useful non-sensitive question or abstaining.

### 19.6 Expected Net Value (ENV)

Candidate actions are ranked using:

```text
ENV(action)
    = P(success | context, action) × Expected Revenue
      − Intervention Cost
      − Customer Friction Cost
      − Risk Penalty
```

For the MVP:

- **Expected Revenue** can begin with the payment amount, adjusted where partial recovery is explicitly modeled.
- **Intervention Cost** may be zero for silent actions or represented by a configured cost.
- **Customer Friction Cost** is lower for silent retries and in-page recommendations and higher for multi-step conversations.
- **Risk Penalty** increases for actions near policy limits or actions associated with higher failure/customer-impact risk.

The exact cost units, weights, and thresholds will be fixed before final evaluation and tuned only on development/validation data.

### 19.7 MVP Decision Rule

```text
1. Generate candidate recovery actions.
2. Remove actions that fail deterministic policy constraints.
3. Estimate P(success | context, action).
4. Estimate confidence.
5. Calculate ENV for each allowed action.
6. If the best ENV is below the configured threshold:
       → Abstain / Stop.
7. If confidence is low and a useful question has sufficient ENV:
       → Ask the customer a specific non-sensitive question.
8. Otherwise:
       → Select the highest-ENV action permitted by policy
         and customer-consent rules.
```

The customer-facing system must preserve:

> **AI recommends. Customer decides.**

A recommendation to use an alternative payment method is not permission to silently switch the customer to that method.

---

## 20. Evaluation Design

### 20.1 Dataset Split

```text
70% TRAIN / DEVELOPMENT
    Policy learning, tuning, synthetic-world development

10% VALIDATION
    Model/policy selection and threshold tuning

20% HOLDOUT TEST
    Final unbiased evaluation
```

The holdout remains untouched until the final experiment.

### 20.2 Baseline

The baseline must be **strong enough to be credible**, not a deliberately weak strawman. It should represent a realistic deterministic fixed-retry strategy with reasonable retry timing and stopping rules. Its exact configuration will be locked before final comparison.

### 20.3 Evaluation Structure

```text
                 Same held-out opportunity
                          │
                ┌─────────┴─────────┐
                ↓                   ↓
        Fixed-Retry Baseline   Adaptive Agent
                │                   │
                └─────────┬─────────┘
                          ↓
                    Outcomes
                          ↓
                 Metrics comparison
```

Where counterfactual replay is available, both policies should be evaluated against the same underlying scenario and outcome model. This avoids attributing differences to different case mixes.

### 20.4 Synthetic-World Requirements

The synthetic environment must contain:

- Realistic customer payment histories
- Merchant-level variation
- Payment-method behavior
- Multiple failure types
- Temporary and persistent failure patterns
- Conflicting/noisy signals
- Delayed confirmations
- Partial information
- Outage/network patterns
- Customers with little or no history
- Cases where the correct action is to stop
- Cases where the customer's response changes the optimal next action

The environment must also contain **hard negatives** — cases where an alternative action appears attractive but should not recover the payment — so the agent cannot win by simply recommending alternatives.

### 20.5 What We Must Not Do

- Do not tune the synthetic environment to make the agent win.
- Do not tune the agent using holdout outcomes.
- Do not choose arbitrary probability/ENV values after seeing test results.
- Do not claim causality from raw post-intervention recovery alone.
- Do not report invented performance numbers.
- Do not hide failure cases or exceptions.

---

## 21. Reliability & Explanation Layer

The customer-facing explanation is not treated as proof that the model's reasoning is correct.

```text
Primary Decision Model
        ↓
Confidence / Verification
        ↓
Policy Check
        ↓
Action: Recommend / Ask / Stop / Execute
        ↓
Customer-facing explanation
```

When signals conflict, evidence is weak, or model confidence is low, the system should prefer a safer action rather than producing a confident-sounding explanation.

Examples:

- **Hard decline + strong evidence:** stop or recommend another allowed route.
- **Temporary outage pattern:** retry later may have higher ENV.
- **Conflicting signals + little history:** ask a specific non-sensitive question or abstain.
- **Very uncertain case:** do not retry blindly.

The explanation should state the important evidence behind a recommendation without exposing internal sensitive data.

---

## 22. Implementation Scope Lock

To prevent implementation sprawl, the MVP is intentionally narrow.

### MVP

- Failed payments only
- Core payment methods: UPI / Card / Net Banking
- Root-cause diagnosis
- Historical-frequency + context-adjusted P(success)
- ENV ranking
- Basic deterministic policy guardrails
- Top recommendation / adaptive customer flow
- Ephemeral recovery session
- Privacy/sensitive-data protection
- Synthetic benchmark + strong baseline
- Holdout evaluation
- Audit events and metrics

### Not MVP

- Subscription recovery
- B2B/invoice receivables
- Chargeback handling
- Cash-flow forecasting
- Full CRM/marketing automation
- Voice bot
- Multi-channel outreach campaigns
- Broad multi-merchant optimization

These may become later extensions after the core recovery decision loop is proven.

---

## 23. Final Lock Before Build

The thesis is considered **implementation-ready** when the following are preserved:

- **Problem:** recovery decisions are the bottleneck, not simply retry execution.
- **Agent:** diagnoses, estimates, ranks, recommends, adapts, and can abstain.
- **Customer:** retains control over payment choice.
- **Policy:** deterministic guardrails constrain AI authority.
- **Privacy:** customer recovery chat is ephemeral; sensitive credentials are never required.
- **Learning:** persistent data is sanitized/structured rather than raw credential-bearing chat.
- **Evaluation:** adaptive policy is compared against a strong fixed baseline on held-out scenarios.
- **Primary claim:** incremental recovered revenue.
- **Decision model:** historical frequency + explicit context adjustments + ENV.
- **Reliability:** confidence, verification, and abstention prevent confident nonsense.
- **Scope:** failed-payment recovery is the MVP; everything else is secondary.

**Status: Ready to build.**
