import type { Merchant } from "./types";
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

function randomFloat(
  min: number,
  max: number,
  random: Random
): number {
  return min + random() * (max - min);
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

function generateMerchant(
  id: number,
  random: Random
): Merchant {
  const totalTransactions = randomInt(500, 10000, random);

  const successRate = randomFloat(0.75, 0.97, random);

  const successfulTransactions = Math.round(
    totalTransactions * successRate
  );

  return {
    id: `M${String(id).padStart(4, "0")}`,

    name:
      MERCHANT_NAMES[(id - 1) % MERCHANT_NAMES.length],

    averageTransactionAmount: Math.round(
      randomFloat(300, 8000, random)
    ),

    totalTransactions,

    successfulTransactions,
  };
}

export function generateMerchants(
  count: number,
  random: Random
): Merchant[] {  const merchants: Merchant[] = [];

  for (let i = 1; i <= count; i++) {
    merchants.push(generateMerchant(i,random));
  }

  return merchants;
}