import { Effect } from "effect"
import { SudokuGrid, countCandidates } from "./grid.ts"
import { DifficultyLevel, DIFFICULTY_THRESHOLDS } from "./difficulty.ts"
import { Technique, TECHNIQUE_SCORES, TECHNIQUE_DIFFICULTY } from "./techniques.ts"

// =============================================================================
// DifficultyScorer Service
// =============================================================================

export class DifficultyScorer extends Effect.Service<DifficultyScorer>()("DifficultyScorer", {
  effect: Effect.gen(function* () {
    
    // Calculate score from list of techniques used
    const calculateScore = (techniques: Technique[]): Effect.Effect<number> =>
      Effect.sync(() => {
        let score = 0
        for (const tech of techniques) {
          score += TECHNIQUE_SCORES[tech] ?? 0
        }
        return score
      }).pipe(Effect.withSpan("DifficultyScorer.calculateScore"))
    
    // Determine difficulty level from techniques
    const determineDifficulty = (techniques: Technique[]): Effect.Effect<DifficultyLevel> =>
      Effect.sync(() => {
        if (techniques.length === 0) {
          return "INCOMPLETE" as DifficultyLevel
        }
        
        // Find highest difficulty technique used
        let maxDifficulty: DifficultyLevel = "EASY"
        let totalScore = 0
        
        const difficultyOrder = ["EASY", "MEDIUM", "HARD", "UNFAIR", "EXTREME"] as const
        
        for (const tech of techniques) {
          const difficulty = TECHNIQUE_DIFFICULTY[tech]
          const score = TECHNIQUE_SCORES[tech] ?? 0
          totalScore += score
          
          // Update max difficulty (skip INCOMPLETE as it's not in difficultyOrder)
          if (difficulty !== "INCOMPLETE") {
            const currentIndex = difficultyOrder.indexOf(maxDifficulty)
            const newIndex = difficultyOrder.indexOf(difficulty)
            if (newIndex > currentIndex) {
              maxDifficulty = difficulty
            }
          }
        }
        
        // Also check against score thresholds
        for (const level of difficultyOrder) {
          if (totalScore >= DIFFICULTY_THRESHOLDS[level]) {
            maxDifficulty = level
          }
        }
        
        return maxDifficulty
      }).pipe(Effect.withSpan("DifficultyScorer.determineDifficulty"))
    
    // Analyze puzzle difficulty by solving it and tracking techniques
    // For now, simplified version - just estimates based on candidate patterns
    const analyzePuzzle = (grid: SudokuGrid): Effect.Effect<{
      difficulty: DifficultyLevel
      score: number
      techniques: Technique[]
    }> =>
      Effect.gen(function* () {
        // This is a simplified analysis
        // In full implementation, this would actually solve the puzzle
        // and track which techniques are needed
        
        const techniques: Technique[] = [
          "NAKED_SINGLE", // Always present
          "HIDDEN_SINGLE", // Common in most puzzles
        ]
        
        // Analyze complexity based on candidate distribution
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
        
        // Simple heuristic: more cells with many candidates = harder puzzle
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
        
        const score = yield* calculateScore(techniques)
        const difficulty = yield* determineDifficulty(techniques)
        
        return {
          difficulty,
          score,
          techniques,
        }
      }).pipe(Effect.withSpan("DifficultyScorer.analyzePuzzle"))
    
    return {
      calculateScore,
      determineDifficulty,
      analyzePuzzle,
    }
  }),
}) {}
