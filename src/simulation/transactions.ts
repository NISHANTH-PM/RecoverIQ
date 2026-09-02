import type {
  Customer,
  Merchant,
  PaymentMethod,
  PaymentStatus,
  Transaction,
  PaymentAttempt,
} from "./types.js";

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomItem<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

function generateAmount(
  merchant: Merchant
): number {
  const variation = merchant.averageTransactionAmount * 0.5;

  const min = Math.max(
    100,
    merchant.averageTransactionAmount - variation
  );

  const max =
    merchant.averageTransactionAmount + variation;

  return Math.round(randomInt(min, max));
}

function generatePaymentMethod(
  customer: Customer
): PaymentMethod {
  return randomItem(
    customer.availablePaymentMethods
  );
}

function generateTimestamp(): string {
  const date = new Date();

  date.setHours(
    date.getHours() - randomInt(0, 72)
  );

  date.setMinutes(
    randomInt(0, 59)
  );

  date.setSeconds(0);
  date.setMilliseconds(0);

  return date.toISOString();
}

function generateTransaction(
  id: number,
  customer: Customer,
  merchant: Merchant
): Transaction {
  const transactionId =
    `TXN${String(id).padStart(6, "0")}`;

  const amount = generateAmount(merchant);

  const method =
    generatePaymentMethod(customer);

  const timestamp = generateTimestamp();

  const attempt: PaymentAttempt = {
    id: `${transactionId}_ATTEMPT_1`,
    transactionId,

    method,
    amount,

    status: "pending",

    timestamp,
  };

  return {
    id: transactionId,

    customerId: customer.id,
    merchantId: merchant.id,

    amount,
    currency: "INR",

    attempts: [attempt],

    status: "pending",
  };
}

export function generateTransactions(
  count: number,
  customers: Customer[],
  merchants: Merchant[]
): Transaction[] {
  const transactions: Transaction[] = [];

  for (let i = 1; i <= count; i++) {
    const customer = randomItem(customers);
    const merchant = randomItem(merchants);

    transactions.push(
      generateTransaction(
        i,
        customer,
        merchant
      )
    );
  }

  return transactions;
}