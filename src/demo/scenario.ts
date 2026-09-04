import type {
  Customer,
  EnvironmentState,
  PaymentAttempt,
  Transaction,
} from "../simulation/types";

export const demoCustomer: Customer = {
  id: "demo-customer-001",
  availablePaymentMethods: [
    "upi",
    "card",
    "net_banking",
  ],
  totalTransactions: 18,
  totalSuccessfulTransactions: 17,

  methodStats: {
    upi: {
      attempts: 6,
      successes: 4,
    },

    card: {
      attempts: 10,
      successes: 9,
    },

    net_banking: {
      attempts: 5,
      successes: 4,
    },
  },
};

const firstAttempt: PaymentAttempt = {
  id: "demo-attempt-001",
  transactionId: "demo-transaction-001",
  method: "upi",
  amount: 2499,
  status: "failed",
  failureType: "bank_timeout",
  timestamp: "2026-09-03T12:00:00.000Z",
};

const secondAttempt: PaymentAttempt = {
  id: "demo-attempt-002",
  transactionId: "demo-transaction-001",
  method: "upi",
  amount: 2499,
  status: "failed",
  failureType: "bank_timeout",
  timestamp: "2026-09-03T12:01:00.000Z",
};

export const demoTransaction: Transaction = {
  id: "demo-transaction-001",
  customerId: demoCustomer.id,
  merchantId: "demo-merchant-001",
  amount: 2499,
  currency: "INR",
  attempts: [
    firstAttempt,
    secondAttempt,
  ],
  status: "failed",
};

export const demoEnvironment: EnvironmentState = {
  upiHealth: "degraded",
  cardNetworkHealth: "healthy",
  netBankingHealth: "healthy",
  hourOfDay: 12,
};