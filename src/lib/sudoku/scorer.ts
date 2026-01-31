import { Effect } from "effect"

import { DifficultyLevel, DIFFICULTY_THRESHOLDS } from "./difficulty.ts"
import { SudokuGrid, countCandidates } from "./grid.ts"
import { Technique, TECHNIQUE_SCORES, TECHNIQUE_DIFFICULTY } from "./techniques.ts"

// =============================================================================
// Pure computation functions
// =============================================================================

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

const analyzePuzzleImpl = (
  grid: SudokuGrid,
): {
  difficulty: DifficultyLevel
  score: number
  techniques: Technique[]
} => {
  const techniques: Technique[] = ["NAKED_SINGLE", "HIDDEN_SINGLE"]

  let cellsWithManyCandidates = 0
  let maxCandidates = 0

  for (let i = 0; i < 81; i++) {
    if (grid.getCell(i) === 0) {
      const candidates = countCandidates(grid.getCandidates(i))
      if (candidates > maxCandidates) {
        maxCandidates = candidates
      }
      if (candidates > 4) {
        cellsWithManyCandidates++
      }
    }
  }

  if (cellsWithManyCandidates > 20) {
    techniques.push("NAKED_PAIR")
  }
  if (cellsWithManyCandidates > 30) {
    techniques.push("NAKED_TRIPLE")
    techniques.push("HIDDEN_PAIR")
  }
  if (maxCandidates >= 7) {
    techniques.push("X_WING")
  }

  const score = calculateScoreImpl(techniques)
  const difficulty = determineDifficultyImpl(techniques)

  return { difficulty, score, techniques }
}

// =============================================================================
// DifficultyScorer Service
// =============================================================================

export class DifficultyScorer extends Effect.Service<DifficultyScorer>()("DifficultyScorer", {
  succeed: {
    calculateScore: (techniques: Technique[]): Effect.Effect<number> =>
      Effect.succeed(calculateScoreImpl(techniques)),

    determineDifficulty: (techniques: Technique[]): Effect.Effect<DifficultyLevel> =>
      Effect.succeed(determineDifficultyImpl(techniques)),

    analyzePuzzle: (
      grid: SudokuGrid,
    ): Effect.Effect<{
      difficulty: DifficultyLevel
      score: number
      techniques: Technique[]
    }> => Effect.succeed(analyzePuzzleImpl(grid)),
  },
}) {}
