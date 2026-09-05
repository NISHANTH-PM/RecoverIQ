# Razorpay AI Buildathon – AI Revenue Recovery Track
## Complete Pain Points Document

**Track Focus**: Find revenue that’s slipping away and win it back.  
Build an agent that detects revenue at risk, determines the right intervention, and executes a bounded recovery workflow (payment failures, checkout abandonment, failed subscriptions, overdue receivables, etc.).

---

## 1. Merchant Pain Points (Primary Focus)

Merchants are the businesses using Razorpay. They directly lose money and time when revenue slips away.

### 1.1 Silent & Significant Revenue Leakage
- On average, **9–20% of online payments fail**.
- For subscription businesses, roughly **9% of Monthly Recurring Revenue (MRR)** is at risk every month due to failed renewals.
- Involuntary churn (customers who did not choose to leave) accounts for **20–40% of total churn**.
- Most merchants recover less than 40% of failed payments (best-in-class recover 70%+).

**Impact**: Pure lost revenue. Customer acquisition cost has already been spent, and the money simply disappears.

### 1.2 No Clear Understanding of *Why* Payments Fail
- Different banks, UPI apps, cards, and payment methods return inconsistent or generic error codes.
- 80%+ of merchants report poor visibility into the real reason behind declines.
- Soft declines (temporary – e.g., insufficient funds, temporary bank issue) and hard declines (permanent – e.g., expired/stolen card, closed account) often look similar in dashboards.

**Impact**: Merchants cannot apply the correct recovery strategy. They either retry everything the same way (wasteful) or give up too early.

### 1.3 Ineffective & Costly Recovery Processes
- Most systems use basic retry logic: try 3–4 times at fixed intervals with the same payment method.
- This recovers only ~20–30% of failed payments.
- Aggressive retries can damage the merchant’s reputation with card networks (MID score), leading to higher future decline rates and even penalties.
- Recovery emails/SMS are often generic, poorly timed, or too aggressive.

**Impact**: Money and effort are spent on recovery that doesn’t work well, while long-term payment success rates are put at risk.

### 1.4 High Operational & Manual Effort
- Support teams get flooded with “Why did my payment fail?” tickets.
- Finance teams spend hours reconciling failed vs successful transactions and chasing overdue invoices.
- For B2B merchants in India, **over 60% of invoices are overdue**, and many MSMEs wait 60–90+ days (sometimes longer) to get paid.
- Manual follow-ups for abandoned carts, failed subscriptions, and receivables are time-consuming and inconsistent.

**Impact**: Valuable team time is wasted on low-value recovery work instead of growth, product, or customer success. Cash flow becomes unpredictable.

### 1.5 Extremely High Checkout Abandonment
- Global average cart abandonment rate is around **70%**.
- Major payment-related causes:
  - Unexpected extra costs (shipping, taxes, fees) appearing late
  - Limited or missing preferred payment methods
  - Payment failure at the last step
  - Trust concerns or complicated checkout flow
  - Poor mobile experience

**Impact**: Huge volume of high-intent traffic is lost at the final stage. Merchants have already paid for ads/traffic only to lose the sale.

### 1.6 Subscription-Specific Problems
- Common failure reasons: expired/reissued cards, insufficient funds, bank fraud flags, e-mandate issues (especially relevant in India).
- Merchants struggle with the grace period decision:
  - Cut access immediately → angry customers
  - Keep access open too long → free riders and higher losses
- Many customers never even realize their payment failed until the service stops.

**Impact**: Merchants lose loyal, paying customers purely due to payment friction, not product dissatisfaction.

### 1.7 Cash Flow Stress & Downstream Effects
- Delayed or failed payments create unpredictable cash flow.
- Higher decline rates can lead to:
  - Increased scrutiny from banks
  - Higher payment processing costs
  - Difficulty getting better commercial terms or higher transaction limits
- In B2B, overdue receivables lock up working capital that could be used for inventory, marketing, or growth.

**Impact**: The business becomes less efficient and less resilient. Growth slows because capital is stuck.

---

### Merchant Pain Points – One-Line Summary
**Merchants know they are losing significant money to failed payments, abandoned checkouts, and unpaid invoices, but they lack smart, automated, measurable systems that can detect the problem, understand the root cause, and recover the revenue without creating extra support load or annoying customers.**

---

## 2. Customer (End Buyer) Pain Points

These are the people who wanted to pay but hit friction.

| Pain Point | Details | Impact |
|------------|---------|--------|
| Frustrating payment failures | Card declined for temporary reasons (insufficient funds, bank soft decline, 3DS issues, network problems). In India, network/UPI disruptions are common. | Immediate frustration → abandon purchase or subscription |
| Confusing or aggressive communication | Generic “Payment failed” emails, repeated aggressive reminders, or sudden access cut-off. | Feels like being punished → voluntary cancellation or brand distrust |
| No easy way to fix the problem | Multiple screens to update card, unclear instructions, no alternative payment method offered at the right moment. | High friction → customer simply leaves |
| Checkout friction | Surprise fees, long forms, forced signup, limited payment options (especially on mobile), trust concerns. | High-intent buyers are pushed away |
| Subscription lock-out | Service stopped before they knew the payment failed, or no clear recovery path. | Lost access to something they still value → permanent churn |
| Overdue invoice pressure (B2B) | Aggressive collection calls/emails when liquidity is temporary. | Damaged relationship with the supplier |

**Customer Summary**: Most failed payments are *not* intentional. Customers feel the pain of friction, poor communication, and lack of helpful recovery options. Good recovery feels like assistance; bad recovery feels like harassment.

---

## 3. Razorpay (Platform) Pain Points

These affect the payments company itself.

| Pain Point | Details | Impact |
|------------|---------|--------|
| Lower transaction volume & GMV | Every failed or abandoned payment means less volume flowing through Razorpay. | Direct impact on Razorpay’s revenue |
| Merchant churn / dissatisfaction | Merchants who lose significant revenue become frustrated and may switch providers. | Higher merchant attrition risk |
| Support & operational load | High volume of “why did this payment fail?” tickets, chargeback disputes, and settlement queries. | Increased support costs |
| Reputation & success-rate pressure | Persistent failures (even if issuer/bank side) reflect poorly on the gateway experience. | Competitive disadvantage |
| Missed opportunity in agentic/AI era | Ability to automatically detect → diagnose → recover becomes a key differentiator. | Strategic risk |
| Data & orchestration gaps | Merchants often lack unified, real-time insight across decline reasons and recovery outcomes. | Harder to demonstrate full-stack value |

**Razorpay Summary**: Recovering more revenue for merchants increases volume, improves merchant health and loyalty, reduces support load, and strengthens the platform’s competitive position.

---

## Quick Reference Table

| Side       | Core Pain                              | What a Strong AI Recovery Agent Should Solve |
|------------|----------------------------------------|----------------------------------------------|
| **Merchant** | Lost revenue + high manual effort     | Detect → diagnose root cause → execute bounded recovery → show measured money recovered + audit trail |
| **Customer** | Friction + poor communication         | Helpful, timely, channel-appropriate outreach + easy fix options without feeling harassed |
| **Razorpay** | Lower volume + merchant dissatisfaction | Higher success rates, stickier merchants, better platform differentiation |

---

**Document prepared for Razorpay AI Buildathon – AI Revenue Recovery Track**  
*Use this as a foundation for identifying the problem your project will solve.*
