import { Effect } from "effect"

import { DifficultyLevel, DIFFICULTY_MAX_SCORES } from "./difficulty.ts"
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

// HoDoKu-style difficulty calculation
// 1. Max technique difficulty determines base level
// 2. Score bumps level if it exceeds maxScore for current level
const determineDifficultyImpl = (techniques: Technique[]): DifficultyLevel => {
  if (techniques.length === 0) {
    return "INCOMPLETE"
  }

  // Find max technique difficulty
  let maxTechniqueDifficulty: DifficultyLevel = "EASY"
  let totalScore = 0

  const difficultyOrder: DifficultyLevel[] = [
    "EASY",
    "MEDIUM",
    "HARD",
    "EXPERT",
    "EXTREME",
    "DIABOLICAL",
  ]

  for (const tech of techniques) {
    const difficulty = TECHNIQUE_DIFFICULTY[tech]
    const score = TECHNIQUE_SCORES[tech] ?? 0
    totalScore += score

    if (difficulty !== "INCOMPLETE") {
      const currentIndex = difficultyOrder.indexOf(maxTechniqueDifficulty)
      const newIndex = difficultyOrder.indexOf(difficulty)
      if (newIndex > currentIndex) {
        maxTechniqueDifficulty = difficulty
      }
    }
  }

  // HoDoKu: If score exceeds max for current level, bump difficulty
  // Start from technique difficulty and bump if score is too high
  let resultDifficulty: DifficultyLevel = maxTechniqueDifficulty
  let resultIndex = difficultyOrder.indexOf(resultDifficulty)

  while (resultIndex < difficultyOrder.length - 1) {
    const nextLevel = difficultyOrder[resultIndex + 1]
    if (nextLevel && totalScore > DIFFICULTY_MAX_SCORES[resultDifficulty]) {
      resultDifficulty = nextLevel
      resultIndex++
    } else {
      break
    }
  }

  return resultDifficulty
}

// HoDoKu-style rejectTooLowScore check
// For levels above EASY, reject if score is below maxScore of previous level
export const shouldRejectTooLowScore = (difficulty: DifficultyLevel, score: number): boolean => {
  if (difficulty === "INCOMPLETE" || difficulty === "EASY") {
    return false
  }

  const difficultyOrder: DifficultyLevel[] = [
    "EASY",
    "MEDIUM",
    "HARD",
    "EXPERT",
    "EXTREME",
    "DIABOLICAL",
  ]
  const currentIndex = difficultyOrder.indexOf(difficulty)

  if (currentIndex <= 0) return false

  const previousLevel = difficultyOrder[currentIndex - 1]
  if (!previousLevel) return false

  return score < DIFFICULTY_MAX_SCORES[previousLevel]
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

      // HoDoKu: Only score puzzles that can be solved logically
      if (!result.solved) {
        return {
          difficulty: "INCOMPLETE" as const,
          score: 0,
          techniques: [] as Technique[],
          solved: false,
        }
      }

      const techniques = result.steps.flatMap((step) =>
        isTechnique(step.technique) ? [step.technique] : [],
      )
      const score = calculateScoreImpl(techniques)
      const difficulty = determineDifficultyImpl(techniques)

      return { difficulty, score, techniques, solved: true }
    }),
  },
}) {}
