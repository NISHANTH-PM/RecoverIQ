export type PaymentMethod =
  | "upi"
  | "card"
  | "net_banking"
  | "wallet";

export type FailureType =
  | "bank_timeout"
  | "network_error"
  | "insufficient_funds"
  | "hard_decline"
  | "authentication_failed"
  | "upi_unavailable"
  | "issuer_unavailable"
  | "unknown";

export type PaymentStatus =
  | "success"
  | "failed"
  | "pending";

export interface MethodStats {
  attempts: number;
  successes: number;
}

export interface Customer {
  id: string;

  availablePaymentMethods: PaymentMethod[];

  totalTransactions: number;
  totalSuccessfulTransactions: number;

  methodStats: Partial<Record<PaymentMethod, MethodStats>>;
}

export interface Merchant {
  id: string;
  name: string;

  averageTransactionAmount: number;

  totalTransactions: number;
  successfulTransactions: number;
}

export interface EnvironmentState {
  upiHealth: "healthy" | "degraded" | "outage";
  cardNetworkHealth: "healthy" | "degraded";
  netBankingHealth: "healthy" | "degraded";

  hourOfDay: number;
}

export interface PaymentAttempt {
  id: string;
  transactionId: string;

  method: PaymentMethod;

  amount: number;

  status: PaymentStatus;

  failureType?: FailureType;

  timestamp: string;
}

export interface Transaction {
  id: string;

  customerId: string;
  merchantId: string;

  amount: number;
  currency: "INR";

  attempts: PaymentAttempt[];

  status: PaymentStatus;
}

export type RecoveryAction =
  | "retry_now"
  | "retry_later"
  | "recommend_upi"
  | "recommend_card"
  | "recommend_net_banking"
  | "recommend_wallet"
  | "ask_customer"
  | "stop";

export interface RecoveryDecision {
  action: RecoveryAction;

  reason: string;

  confidence: number;

  timestamp: string;
}

export interface RecoverySession {
  id: string;

  transactionId: string;

  decisions: RecoveryDecision[];

  customerConstraints: string[];

  status:
    | "active"
    | "recovered"
    | "stopped"
    | "expired";

  recoveredAmount: number;

  startedAt: string;

  endedAt?: string;
}