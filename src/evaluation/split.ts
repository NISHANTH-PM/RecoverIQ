export interface EvaluationSplit {
  development: number[];
  validation: number[];
  holdout: number[];
}

export function createEvaluationSplit(
  totalScenarios: number,
  seed: number = 2026
): EvaluationSplit {
  if (totalScenarios < 10) {
    throw new Error(
      "Evaluation requires at least 10 scenarios."
    );
  }

  const seeds = Array.from(
    { length: totalScenarios },
    (_, index) => seed + index
  );

  const developmentCount =
    Math.floor(totalScenarios * 0.7);

  const validationCount =
    Math.floor(totalScenarios * 0.1);

  return {
    development: seeds.slice(
      0,
      developmentCount
    ),

    validation: seeds.slice(
      developmentCount,
      developmentCount + validationCount
    ),

    holdout: seeds.slice(
      developmentCount + validationCount
    ),
  };
}