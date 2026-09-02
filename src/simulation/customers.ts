import type {
  Customer,
  PaymentMethod,
  MethodStats,
} from "./types.js";

const PAYMENT_METHODS: PaymentMethod[] = [
  "upi",
  "card",
  "net_banking",
  "wallet",
];

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomItem<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

function generateMethodStats(
  attempts: number,
  successRate: number
): MethodStats {
  const successes = Math.round(attempts * successRate);

  return {
    attempts,
    successes,
  };
}

function generateCustomer(id: number): Customer {
  const totalTransactions = randomInt(5, 50);

  const totalSuccessfulTransactions = Math.round(
    totalTransactions * (0.65 + Math.random() * 0.3)
  );

  const availablePaymentMethods = PAYMENT_METHODS.filter(
    () => Math.random() > 0.2
  );

  // Make sure every customer has at least two methods available.
  while (availablePaymentMethods.length < 2) {
    const method = randomItem(PAYMENT_METHODS);

    if (!availablePaymentMethods.includes(method)) {
      availablePaymentMethods.push(method);
    }
  }

  const methodStats: Partial<Record<PaymentMethod, MethodStats>> = {};

  for (const method of availablePaymentMethods) {
    const attempts = randomInt(2, 20);

    // Different customers naturally have different success rates.
    const successRate = 0.5 + Math.random() * 0.5;

    methodStats[method] = generateMethodStats(
      attempts,
      successRate
    );
  }

  return {
    id: `C${String(id).padStart(4, "0")}`,

    availablePaymentMethods,

    totalTransactions,

    totalSuccessfulTransactions,

    methodStats,
  };
}

export function generateCustomers(count: number): Customer[] {
  const customers: Customer[] = [];

  for (let i = 1; i <= count; i++) {
    customers.push(generateCustomer(i));
  }

  return customers;
}