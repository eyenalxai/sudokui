import type { DifficultyLevel } from "./difficulty.ts"
import { Chunk, Effect, Option, Random } from "effect"

import { getCandidatesArray } from "./grid/candidates.ts"
import { TOTAL_CELLS } from "./grid/constants.ts"
import { SudokuGrid } from "./grid/sudoku-grid.ts"
import { countGivens } from "./grid/validation.ts"
import { GenerationError, type GenerateOptions, Puzzle, type Technique } from "./puzzle.ts"
import { DifficultyScorer } from "./scorer.ts"
import { SolutionFinder } from "./solver.ts"

const toGenerationFailure =
  (difficulty: DifficultyLevel) =>
  (error: { message: string }): Effect.Effect<never, GenerationError> =>
    Effect.fail(new GenerationError({ message: error.message, difficulty }))

const generateFullGridImpl = Effect.fn("PuzzleGenerator.generateFullGridImpl")(function* () {
  const grid = new SudokuGrid()
  const toFailure = toGenerationFailure("MEDIUM")

  const setCellOrFail = (index: number, value: number) =>
    grid.setCell(index, value).pipe(
      Effect.catchTags({
        CellConflictError: toFailure,
        NoCandidatesRemainingError: toFailure,
        InvalidCellIndexError: toFailure,
        InvalidCellValueError: toFailure,
      }),
    )

  const trySetCell = (index: number, value: number) =>
    grid.setCell(index, value).pipe(
      Effect.as(true),
      Effect.catchTags({
        CellConflictError: () => Effect.succeed(false),
        NoCandidatesRemainingError: () => Effect.succeed(false),
        InvalidCellIndexError: toFailure,
        InvalidCellValueError: toFailure,
      }),
    )

  const indicesChunk = yield* Random.shuffle(Array.from({ length: TOTAL_CELLS }, (_, i) => i))
  const indices = Chunk.toArray(indicesChunk)

  const stack: Array<{ pos: number; candidates: number[]; candidateIdx: number }> = []
  let currentPos = 0

  while (currentPos < TOTAL_CELLS) {
    const idx = indices[currentPos]
    if (idx === undefined) break

    while (stack.length > currentPos) {
      const state = stack.pop()
      if (state) {
        const stateIdx = indices[state.pos]
        if (stateIdx !== undefined) {
          yield* setCellOrFail(stateIdx, 0)
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
      if (value !== undefined && (yield* trySetCell(idx, value))) {
        state.candidateIdx = i + 1
        found = true
        break
      }
    }

    if (found) {
      currentPos++
    } else {
      yield* setCellOrFail(idx, 0)
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

const removeCellsImpl = Effect.fn("PuzzleGenerator.removeCellsImpl")(function* (
  fullGrid: SudokuGrid,
  targetDifficulty: DifficultyLevel,
  symmetric: boolean,
  minClues: number,
) {
  const puzzle = fullGrid.clone()
  const toFailure = toGenerationFailure(targetDifficulty)
  const solutionFinder = yield* SolutionFinder
  const difficultyScorer = yield* DifficultyScorer

  const setCellOrFail = (index: number, value: number) =>
    puzzle.setCell(index, value).pipe(
      Effect.catchTags({
        CellConflictError: toFailure,
        NoCandidatesRemainingError: toFailure,
        InvalidCellIndexError: toFailure,
        InvalidCellValueError: toFailure,
      }),
    )

  const indicesChunk = yield* Random.shuffle(Array.from({ length: TOTAL_CELLS }, (_, i) => i))
  const indices = Chunk.toArray(indicesChunk)

  const used = new Set<number>()

  for (const idx of indices) {
    if (used.has(idx)) continue
    if (puzzle.getCell(idx) === 0) continue

    if (symmetric && idx !== Math.floor(TOTAL_CELLS / 2)) {
      const symmetricIdx = TOTAL_CELLS - 1 - idx
      if (puzzle.getCell(symmetricIdx) === 0) continue
    }

    const value = puzzle.getCell(idx)
    yield* setCellOrFail(idx, 0)
    used.add(idx)

    let symmetricValue = 0
    if (symmetric && idx !== Math.floor(TOTAL_CELLS / 2)) {
      const symmetricIdx = TOTAL_CELLS - 1 - idx
      symmetricValue = puzzle.getCell(symmetricIdx)
      yield* setCellOrFail(symmetricIdx, 0)
      used.add(symmetricIdx)
    }

    const isUnique = yield* solutionFinder.hasUniqueSolution(puzzle)

    if (!isUnique) {
      yield* setCellOrFail(idx, value)
      if (symmetric && idx !== Math.floor(TOTAL_CELLS / 2)) {
        yield* setCellOrFail(TOTAL_CELLS - 1 - idx, symmetricValue)
      }
    }

    const clues = countGivens(puzzle)
    if (clues <= minClues) {
      break
    }
  }

  const analysis = yield* difficultyScorer.analyzePuzzle(puzzle)

  const difficultyOrder = ["INCOMPLETE", "EASY", "MEDIUM", "HARD", "UNFAIR", "EXTREME"] as const
  const targetIndex = difficultyOrder.indexOf(targetDifficulty)
  const actualIndex = difficultyOrder.indexOf(analysis.difficulty)

  if (Math.abs(actualIndex - targetIndex) <= 1) {
    return Option.some(puzzle)
  }

  return Option.none<typeof puzzle>()
})

const toPuzzle = (
  puzzle: SudokuGrid,
  solution: SudokuGrid,
  analysis: { difficulty: DifficultyLevel; score: number; techniques: readonly Technique[] },
): Puzzle => ({
  grid: puzzle.toString(),
  solution: solution.toString(),
  difficulty: analysis.difficulty,
  score: analysis.score,
  clues: countGivens(puzzle),
  techniques: [...analysis.techniques],
})

export class PuzzleGenerator extends Effect.Service<PuzzleGenerator>()("PuzzleGenerator", {
  accessors: true,
  dependencies: [SolutionFinder.Default, DifficultyScorer.Default],
  succeed: {
    generate: Effect.fn("PuzzleGenerator.generate")(function* (options?: GenerateOptions) {
      const opts = options ?? {
        difficulty: "MEDIUM" as const,
        symmetric: false,
        minClues: 17,
        maxAttempts: 10000,
      }

      const targetDifficulty: DifficultyLevel = opts.difficulty ?? "MEDIUM"
      const symmetric = opts.symmetric ?? false
      const minClues = opts.minClues ?? 17
      const maxAttempts = opts.maxAttempts ?? 10000
      const solutionFinder = yield* SolutionFinder
      const difficultyScorer = yield* DifficultyScorer

      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        const fullGrid = yield* generateFullGridImpl()

        const puzzleOpt = yield* removeCellsImpl(fullGrid, targetDifficulty, symmetric, minClues)

        if (Option.isSome(puzzleOpt)) {
          const puzzle = puzzleOpt.value
          const analysis = yield* difficultyScorer.analyzePuzzle(puzzle)

          const solutionResult = yield* solutionFinder
            .solveBruteForce(puzzle)
            .pipe(
              Effect.catchTag("SolveError", () =>
                Effect.succeed({ solved: false, solutionCount: 0, steps: [] }),
              ),
            )

          if (!solutionResult.solved) {
            continue
          }

          return toPuzzle(puzzle, fullGrid, analysis)
        }
      }

      return yield* Effect.fail(
        new GenerationError({
          message: `Failed to generate puzzle with difficulty ${targetDifficulty} after ${maxAttempts} attempts`,
          difficulty: targetDifficulty,
        }),
      )
    }),
  },
}) {}
