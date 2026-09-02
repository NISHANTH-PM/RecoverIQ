import type { Merchant } from "./types.js";

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomFloat(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

const MERCHANT_NAMES = [
  "UrbanCart",
  "FreshBasket",
  "TechNest",
  "StyleHub",
  "HomeEase",
  "QuickMart",
  "BookSquare",
  "FitZone",
  "TravelNest",
  "DailyNeeds",
];

function generateMerchant(id: number): Merchant {
  const totalTransactions = randomInt(500, 10000);

  const successRate = randomFloat(0.75, 0.97);

  const successfulTransactions = Math.round(
    totalTransactions * successRate
  );

  return {
    id: `M${String(id).padStart(4, "0")}`,

    name:
      MERCHANT_NAMES[(id - 1) % MERCHANT_NAMES.length],

    averageTransactionAmount: Math.round(
      randomFloat(300, 8000)
    ),

    totalTransactions,

    successfulTransactions,
  };
}

export function generateMerchants(count: number): Merchant[] {
  const merchants: Merchant[] = [];

  for (let i = 1; i <= count; i++) {
    merchants.push(generateMerchant(i));
  }

  return merchants;
}