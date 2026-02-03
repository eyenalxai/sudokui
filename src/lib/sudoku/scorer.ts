import { Effect } from "effect"

import { DifficultyLevel, DIFFICULTY_THRESHOLDS } from "./difficulty.ts"
import { SudokuGrid } from "./grid/sudoku-grid.ts"
import { Technique } from "./puzzle.ts"
import { SolutionFinder } from "./solver.ts"
import { TECHNIQUE_DIFFICULTY } from "./technique-difficulty.ts"
import { TECHNIQUE_SCORES } from "./technique-scores.ts"

const calculateScoreImpl = (techniques: Technique[]): number => {
  let score = 0
  for (const tech of techniques) {
    score += TECHNIQUE_SCORES[tech] ?? 0
  }
  return score
}

const determineDifficultyImpl = (techniques: Technique[]): DifficultyLevel => {
  if (techniques.length === 0) {
    return "INCOMPLETE"
  }

  let maxDifficulty: DifficultyLevel = "EASY"
  let totalScore = 0

  const difficultyOrder = ["EASY", "MEDIUM", "HARD", "UNFAIR", "EXTREME"] as const

  for (const tech of techniques) {
    const difficulty = TECHNIQUE_DIFFICULTY[tech]
    const score = TECHNIQUE_SCORES[tech] ?? 0
    totalScore += score

    if (difficulty !== "INCOMPLETE") {
      const currentIndex = difficultyOrder.indexOf(maxDifficulty)
      const newIndex = difficultyOrder.indexOf(difficulty)
      if (newIndex > currentIndex) {
        maxDifficulty = difficulty
      }
    }
  }

  for (const level of difficultyOrder) {
    if (totalScore >= DIFFICULTY_THRESHOLDS[level]) {
      maxDifficulty = level
    }
  }

  return maxDifficulty
}

const isTechnique = (value: string): value is Technique => Object.hasOwn(TECHNIQUE_SCORES, value)

export class DifficultyScorer extends Effect.Service<DifficultyScorer>()("DifficultyScorer", {
  accessors: true,
  dependencies: [SolutionFinder.Default],
  succeed: {
    calculateScore: (techniques: Technique[]): Effect.Effect<number> =>
      Effect.succeed(calculateScoreImpl(techniques)),

    determineDifficulty: (techniques: Technique[]): Effect.Effect<DifficultyLevel> =>
      Effect.succeed(determineDifficultyImpl(techniques)),

    analyzePuzzle: Effect.fn("DifficultyScorer.analyzePuzzle")(function* (grid: SudokuGrid) {
      const solutionFinder = yield* SolutionFinder
      const result = yield* solutionFinder
        .solveLogically(grid)
        .pipe(
          Effect.catchTag("SolveError", () =>
            Effect.succeed({ solved: false, solutionCount: 0, steps: [] }),
          ),
        )

      const techniques = result.steps.flatMap((step) =>
        isTechnique(step.technique) ? [step.technique] : [],
      )
      const score = calculateScoreImpl(techniques)
      const difficulty = determineDifficultyImpl(techniques)

      return { difficulty, score, techniques }
    }),
  },
}) {}
