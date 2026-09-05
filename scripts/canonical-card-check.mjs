// Replicates the exact RNG + outcome-model path used by the demo execute route
// to predict whether the canonical Card attempt succeeds.

function createSeededRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function clamp(v, min = 0.02, max = 0.98) {
  return Math.min(max, Math.max(min, v));
}

// customer.methodStats.card: { attempts: 10, successes: 9 }
const cardHistorical = 9 / 10;
let cardProb = cardHistorical;
// cardNetworkHealth = "healthy" -> no penalty
// failureType = "bank_timeout" -> no penalty (temporary failures don't reduce methodProbability)
cardProb = clamp(cardProb);
console.log("Card methodSuccessProbability (hidden model):", cardProb);

const random = createSeededRandom(20260903);
// executeCustomerSelectedMethod calls generateHiddenOutcomeModel once (zero randoms),
// then calls random() ONCE to decide success.
const r = random();
console.log("random() drawn:", r);
console.log("Would Card succeed? (r < methodSuccessProbability):", r < cardProb);
