import type { EnvironmentState } from "./types";

/**
 * Generate the environment state for a simulation world.
 *
 * The environment captures the health of payment rails
 * (UPI, card networks, net banking) and a coarse
 * "hour of day" signal that downstream models may use.
 *
 * It is the simulator's hidden view; RecoverIQ sees the
 * health fields directly through the world object.
 */
export function generateEnvironment(
  random: () => number
): EnvironmentState {
  const healthStates = [
    "healthy",
    "healthy",
    "healthy",
    "degraded",
    "outage",
  ] as const;

  return {
    upiHealth:
      healthStates[
        Math.floor(random() * healthStates.length)
      ],

    cardNetworkHealth:
      random() > 0.9
        ? "degraded"
        : "healthy",

    netBankingHealth:
      random() > 0.9
        ? "degraded"
        : "healthy",

    hourOfDay: Math.floor(
      random() * 24
    ),
  };
}
