import { Effect, Option, Random, Chunk } from "effect"

import { DifficultyLevel } from "./difficulty.ts"
import { getCandidatesArray } from "./grid/candidates.ts"
import { SudokuGrid } from "./grid/class.ts"
import { GenerateOptions, GenerationError } from "./puzzle.ts"
import { DifficultyScorer } from "./scorer.ts"
import { SolutionFinder } from "./solver.ts"

export class PuzzleGenerator extends Effect.Service<PuzzleGenerator>()("PuzzleGenerator", {
  accessors: true,
  dependencies: [SolutionFinder.Default, DifficultyScorer.Default],
  effect: Effect.gen(function* () {
    const solutionFinder = yield* SolutionFinder
    const difficultyScorer = yield* DifficultyScorer

    const generateFullGrid = Effect.fn("PuzzleGenerator.generateFullGrid")(function* () {
      const grid = new SudokuGrid()

      const indicesChunk = yield* Random.shuffle(Array.from({ length: 81 }, (_, i) => i))
      const indices = Chunk.toArray(indicesChunk)

      const stack: Array<{ pos: number; candidates: number[]; candidateIdx: number }> = []
      let currentPos = 0

      while (currentPos < 81) {
        const idx = indices[currentPos]
        if (idx === undefined) break

        while (stack.length > currentPos) {
          const state = stack.pop()
          if (state) {
            const idx = indices[state.pos]
            if (idx !== undefined) {
              grid.setCell(idx, 0)
            }
          }
        }

        let candidates: number[]
        const existingState = stack[currentPos]

        if (existingState) {
          candidates = existingState.candidates
          existingState.candidateIdx++
        } else {
          candidates = getCandidatesArray(grid.getCandidates(idx))
          const shuffledChunk = yield* Random.shuffle(candidates)
          candidates = Chunk.toArray(shuffledChunk)
          stack.push({ pos: currentPos, candidates, candidateIdx: 0 })
        }

        const state = stack[currentPos]
        if (!state) break

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

    const removeCells = Effect.fn("PuzzleGenerator.removeCells")(function* (
      fullGrid: SudokuGrid,
      targetDifficulty: DifficultyLevel,
      symmetric: boolean,
      minClues: number,
    ) {
      const puzzle = fullGrid.clone()

      const indicesChunk = yield* Random.shuffle(Array.from({ length: 81 }, (_, i) => i))
      const indices = Chunk.toArray(indicesChunk)

      const used = new Set<number>()

      for (const idx of indices) {
        if (used.has(idx)) continue
        if (puzzle.getCell(idx) === 0) continue

        if (symmetric && idx !== 40) {
          const symmetricIdx = 80 - idx
          if (puzzle.getCell(symmetricIdx) === 0) continue
        }

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

        const isUnique = yield* solutionFinder.hasUniqueSolution(puzzle)

        if (!isUnique) {
          puzzle.setCell(idx, value)
          if (symmetric && idx !== 40) {
            puzzle.setCell(80 - idx, symmetricValue)
          }
        }

        const clues = puzzle.countGivens()
        if (clues <= minClues) {
          break
        }
      }

      const analysis = yield* difficultyScorer.analyzePuzzle(puzzle)

      const difficultyOrder = ["INCOMPLETE", "EASY", "MEDIUM", "HARD", "UNFAIR", "EXTREME"] as const
      const targetIndex = difficultyOrder.indexOf(targetDifficulty)
      const actualIndex = difficultyOrder.indexOf(analysis.difficulty)

      if (Math.abs(actualIndex - targetIndex) <= 1) {
        return Option.fromNullable(puzzle)
      }

      return Option.none()
    })

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
        const fullGrid = yield* generateFullGrid()

        const puzzleOpt = yield* removeCells(fullGrid, targetDifficulty, symmetric, minClues)

        if (Option.isSome(puzzleOpt)) {
          const puzzle = puzzleOpt.value
          const analysis = yield* difficultyScorer.analyzePuzzle(puzzle)

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
