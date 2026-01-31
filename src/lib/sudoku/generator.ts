import { Effect, Option, Random, Chunk } from "effect"
import { SudokuGrid, getCandidatesArray } from "./grid.ts"
import { SolutionFinder } from "./solver.ts"
import { DifficultyScorer } from "./scorer.ts"
import { GenerateOptions, Puzzle, GenerationError } from "./puzzle.ts"
import { DifficultyLevel } from "./difficulty.ts"

// =============================================================================
// PuzzleGenerator Service
// =============================================================================

export class PuzzleGenerator extends Effect.Service<PuzzleGenerator>()("PuzzleGenerator", {
  dependencies: [SolutionFinder.Default, DifficultyScorer.Default],
  effect: Effect.gen(function* () {
    const solutionFinder = yield* SolutionFinder
    const difficultyScorer = yield* DifficultyScorer
    
    // Generate a complete valid sudoku grid using backtracking with random order
    const generateFullGrid = (): Effect.Effect<SudokuGrid> =>
      Effect.gen(function* () {
        const grid = new SudokuGrid()
        
        // Get shuffled indices for fill order
        const indicesChunk = yield* Random.shuffle(Array.from({ length: 81 }, (_, i) => i))
        const indices = Chunk.toArray(indicesChunk)
        
        const fillGrid = (pos: number): Effect.Effect<boolean> =>
          Effect.gen(function* () {
            if (pos >= 81) return true
            
            const idx = indices[pos]
            if (idx === undefined) return false
            
            // Get candidates and shuffle them
            const candidates = getCandidatesArray(grid.getCandidates(idx))
            const shuffledChunk = yield* Random.shuffle(candidates)
            const shuffledCandidates = Chunk.toArray(shuffledChunk)
            
            for (const value of shuffledCandidates) {
              if (grid.setCell(idx, value)) {
                const success = yield* fillGrid(pos + 1)
                if (success) return true
                // Backtrack
                grid.setCell(idx, 0)
              }
            }
            
            return false
          })
        
        yield* fillGrid(0)
        return grid
      }).pipe(Effect.withSpan("PuzzleGenerator.generateFullGrid"))
    
    // Remove cells to create puzzle while maintaining unique solution
    const removeCells = (
      fullGrid: SudokuGrid,
      targetDifficulty: DifficultyLevel,
      symmetric: boolean,
      minClues: number
    ): Effect.Effect<Option.Option<SudokuGrid>> =>
      Effect.gen(function* () {
        const puzzle = fullGrid.clone()
        
        // Get shuffled indices
        const indicesChunk = yield* Random.shuffle(Array.from({ length: 81 }, (_, i) => i))
        const indices = Chunk.toArray(indicesChunk)
        
        const used = new Set<number>()
        
        for (const idx of indices) {
          if (used.has(idx)) continue
          if (puzzle.getCell(idx) === 0) continue
          
          // Check symmetry
          if (symmetric && idx !== 40) {
            const symmetricIdx = 80 - idx
            if (puzzle.getCell(symmetricIdx) === 0) continue
          }
          
          // Try removing this cell
          const value = puzzle.getCell(idx)
          puzzle.setCell(idx, 0)
          used.add(idx)
          
          let symmetricValue = 0
          if (symmetric && idx !== 40) {
            const symmetricIdx = 80 - idx
            symmetricValue = puzzle.getCell(symmetricIdx)
            puzzle.setCell(symmetricIdx, 0)
            used.add(symmetricIdx)
          }
          
          // Check if still has unique solution
          const isUnique = yield* solutionFinder.hasUniqueSolution(puzzle)
          
          if (!isUnique) {
            // Restore cells
            puzzle.setCell(idx, value)
            if (symmetric && idx !== 40) {
              puzzle.setCell(80 - idx, symmetricValue)
            }
          }
          
          // Check if we have enough clues removed (reached minimum)
          const clues = puzzle.countGivens()
          if (clues <= minClues) {
            break
          }
        }
        
        // Analyze difficulty
        const analysis = yield* difficultyScorer.analyzePuzzle(puzzle)
        
        // Check if difficulty matches target
        const difficultyOrder = ["INCOMPLETE", "EASY", "MEDIUM", "HARD", "UNFAIR", "EXTREME"] as const
        const targetIndex = difficultyOrder.indexOf(targetDifficulty)
        const actualIndex = difficultyOrder.indexOf(analysis.difficulty)
        
        // Accept if difficulty is close to target
        if (Math.abs(actualIndex - targetIndex) <= 1) {
          return Option.some(puzzle)
        }
        
        return Option.none()
      }).pipe(Effect.withSpan("PuzzleGenerator.removeCells"))
    
    // Generate puzzle with target difficulty
    const generate = (options?: GenerateOptions): Effect.Effect<Puzzle, GenerationError> =>
      Effect.gen(function* () {
        const opts = options ?? {
          difficulty: "MEDIUM",
          symmetric: false,
          minClues: 17,
          maxAttempts: 10000,
        }
        
        const targetDifficulty: DifficultyLevel = opts.difficulty ?? "MEDIUM"
        const symmetric = opts.symmetric ?? false
        const minClues = opts.minClues ?? 17
        const maxAttempts = opts.maxAttempts ?? 10000
        
        for (let attempt = 0; attempt < maxAttempts; attempt++) {
          // Generate full grid
          const fullGrid = yield* generateFullGrid()
          
          // Remove cells to create puzzle
          const puzzleOpt = yield* removeCells(
            fullGrid,
            targetDifficulty,
            symmetric,
            minClues
          )
          
          if (Option.isSome(puzzleOpt)) {
            const puzzle = puzzleOpt.value
            const analysis = yield* difficultyScorer.analyzePuzzle(puzzle)
            
            // Check solution is unique
            const solutionResult = yield* solutionFinder.solve(puzzle).pipe(
              Effect.catchAll(() => Effect.succeed({ solved: false, solutionCount: 0, steps: [] }))
            )
            
            if (!solutionResult.solved) {
              continue
            }
            
            // Return puzzle matching the schema type
            return {
              grid: puzzle.toString(),
              solution: fullGrid.toString(),
              difficulty: analysis.difficulty,
              score: analysis.score,
              clues: puzzle.countGivens(),
              techniques: analysis.techniques,
            }
          }
        }
        
        return yield* Effect.fail(new GenerationError({
          message: `Failed to generate puzzle with difficulty ${targetDifficulty} after ${maxAttempts} attempts`,
          difficulty: targetDifficulty,
        }))
      }).pipe(Effect.withSpan("PuzzleGenerator.generate"))
    
    return {
      generate,
      generateFullGrid,
    }
  }),
}) {}
