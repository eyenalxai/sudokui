import { Effect, Option, Random, Chunk } from "effect"

import { DifficultyLevel } from "./difficulty.ts"
import { SudokuGrid, getCandidatesArray } from "./grid.ts"
import { GenerateOptions, GenerationError } from "./puzzle.ts"
import { DifficultyScorer } from "./scorer.ts"
import { SolutionFinder } from "./solver.ts"

export class PuzzleGenerator extends Effect.Service<PuzzleGenerator>()("PuzzleGenerator", {
  accessors: true,
  dependencies: [SolutionFinder.Default, DifficultyScorer.Default],
  effect: Effect.gen(function* () {
    const solutionFinder = yield* SolutionFinder
    const difficultyScorer = yield* DifficultyScorer

    // Generate a complete valid sudoku grid using backtracking with random order
    const generateFullGrid = Effect.fn("PuzzleGenerator.generateFullGrid")(function* () {
      const grid = new SudokuGrid()

      // Get shuffled indices for fill order
      const indicesChunk = yield* Random.shuffle(Array.from({ length: 81 }, (_, i) => i))
      const indices = Chunk.toArray(indicesChunk)

      // Use a stack-based approach to avoid recursion issues
      const stack: Array<{ pos: number; candidates: number[]; candidateIdx: number }> = []
      let currentPos = 0

      while (currentPos < 81) {
        const idx = indices[currentPos]
        if (idx === undefined) break

        // If we're backtracking, restore the grid state
        while (stack.length > currentPos) {
          const state = stack.pop()
          if (state) {
            const idx = indices[state.pos]
            if (idx !== undefined) {
              grid.setCell(idx, 0)
            }
          }
        }

        // Get candidates for current cell
        let candidates: number[]
        const existingState = stack[currentPos]

        if (existingState) {
          // Continue with next candidate
          candidates = existingState.candidates
          existingState.candidateIdx++
        } else {
          // New cell - shuffle candidates
          candidates = getCandidatesArray(grid.getCandidates(idx))
          const shuffledChunk = yield* Random.shuffle(candidates)
          candidates = Chunk.toArray(shuffledChunk)
          stack.push({ pos: currentPos, candidates, candidateIdx: 0 })
        }

        const state = stack[currentPos]
        if (!state) break

        // Try candidates starting from current index
        let found = false
        for (let i = state.candidateIdx; i < candidates.length; i++) {
          const value = candidates[i]
          if (value !== undefined && grid.setCell(idx, value)) {
            state.candidateIdx = i + 1
            found = true
            break
          }
        }

        if (found) {
          currentPos++
        } else {
          // Backtrack
          grid.setCell(idx, 0)
          stack.pop()
          currentPos--
          if (currentPos < 0) {
            return yield* Effect.fail(
              new GenerationError({
                message: "Failed to generate valid sudoku grid",
                difficulty: "MEDIUM",
              }),
            )
          }
        }
      }

      return grid
    })

    // Remove cells to create puzzle while maintaining unique solution
    const removeCells = Effect.fn("PuzzleGenerator.removeCells")(function* (
      fullGrid: SudokuGrid,
      targetDifficulty: DifficultyLevel,
      symmetric: boolean,
      minClues: number,
    ) {
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
        return Option.fromNullable(puzzle)
      }

      return Option.none()
    })

    // Generate puzzle with target difficulty
    const generate = Effect.fn("PuzzleGenerator.generate")(function* (options?: GenerateOptions) {
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
        const puzzleOpt = yield* removeCells(fullGrid, targetDifficulty, symmetric, minClues)

        if (Option.isSome(puzzleOpt)) {
          const puzzle = puzzleOpt.value
          const analysis = yield* difficultyScorer.analyzePuzzle(puzzle)

          // Check solution is unique
          const solutionResult = yield* solutionFinder
            .solve(puzzle)
            .pipe(
              Effect.catchTag("SolveError", () =>
                Effect.succeed({ solved: false, solutionCount: 0, steps: [] }),
              ),
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

      return yield* Effect.fail(
        new GenerationError({
          message: `Failed to generate puzzle with difficulty ${targetDifficulty} after ${maxAttempts} attempts`,
          difficulty: targetDifficulty,
        }),
      )
    })

    return {
      generate,
      generateFullGrid,
    }
  }),
}) {}
