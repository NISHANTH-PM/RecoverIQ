import type {
  Customer,
  Merchant,
  PaymentMethod,
  PaymentStatus,
  Transaction,
  PaymentAttempt,
} from "./types";

import type { Random } from "./random";

function randomInt(
  min: number,
  max: number,
  random: Random
): number {
  return Math.floor(
    random() * (max - min + 1)
  ) + min;
}

function randomItem<T>(
  items: T[],
  random: Random
): T {
  return items[
    Math.floor(random() * items.length)
  ];
}

function generateAmount(
  merchant: Merchant,
  random: Random
): number {
  const variation = merchant.averageTransactionAmount * 0.5;

  const min = Math.max(
    100,
    merchant.averageTransactionAmount - variation
  );

  const max =
    merchant.averageTransactionAmount + variation;

  return Math.round(randomInt(min, max, random));
}

function generatePaymentMethod(
  customer: Customer,
  random: Random
): PaymentMethod {
  return randomItem(
    customer.availablePaymentMethods, 
    random
  );
}

function generateTimestamp(
  random: Random
): string {
  const date = new Date();

  date.setHours(
    date.getHours() - randomInt(0, 72, random)
  );

  date.setMinutes(
    randomInt(0, 59, random)
  );

  date.setSeconds(0);
  date.setMilliseconds(0);

  return date.toISOString();
}

function generateTransaction(
  id: number,
  customer: Customer,
  merchant: Merchant,
  random: Random
): Transaction {
  const transactionId =
    `TXN${String(id).padStart(6, "0")}`;

  const amount = generateAmount(merchant, random);

  const method =
    generatePaymentMethod(customer, random);

  const timestamp = generateTimestamp(random);

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
  merchants: Merchant[],
  random: Random
): Transaction[] {
  const transactions: Transaction[] = [];

  for (let i = 1; i <= count; i++) {
    const customer = randomItem(customers, random);
    const merchant = randomItem(merchants, random);

    transactions.push(
      generateTransaction(
        i,
        customer,
        merchant,
        random
      )
    );
  }

  return transactions;
}