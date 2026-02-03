import { Layer } from "effect"

import { DifficultyScorer } from "./scorer.ts"
import { SolutionFinder } from "./solver.ts"
import { TechniqueDetector } from "./technique-detector.ts"

export const SudokuLive = Layer.mergeAll(
  TechniqueDetector.Default,
  SolutionFinder.Default,
  DifficultyScorer.Default,
)
