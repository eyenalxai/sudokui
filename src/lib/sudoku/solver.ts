import { Effect, Option } from "effect"

import { getCandidatesArray, getSingleCandidate } from "./grid/candidates.ts"
import { findMinCandidatesCell, findNakedSingles } from "./grid/search.ts"
import { SudokuGrid } from "./grid/sudoku-grid.ts"
import { isComplete, isValid } from "./grid/validation.ts"
import { InvalidCellIndexError, InvalidCellValueError, SolutionStep, SolveError } from "./puzzle.ts"
import { TechniqueDetector } from "./technique-detector.ts"
import { TechniqueMove, toCellValue } from "./technique.ts"

const trySetCell = (
  grid: SudokuGrid,
  index: number,
  value: number,
): Effect.Effect<boolean, InvalidCellIndexError | InvalidCellValueError> =>
  grid.setCell(index, value).pipe(
    Effect.as(true),
    Effect.catchTags({
      CellConflictError: () => Effect.succeed(false),
      NoCandidatesRemainingError: () => Effect.succeed(false),
    }),
  )

const countSolutionsImpl: (
  grid: SudokuGrid,
  maxCount: number,
) => Effect.Effect<number, InvalidCellIndexError | InvalidCellValueError> = Effect.fn(
  "SolutionFinder.countSolutionsImpl",
)(function* (grid, maxCount) {
  let count = 0

  const solveRecursive = (
    g: SudokuGrid,
  ): Effect.Effect<void, InvalidCellIndexError | InvalidCellValueError> =>
    Effect.gen(function* () {
      if (count >= maxCount) return

      const singles = findNakedSingles(g)
      if (singles.length > 0) {
        const newGrid = g.clone()
        for (const idx of singles) {
          const value = getSingleCandidate(newGrid.getCandidates(idx))
          const setResult = yield* Option.match(value, {
            onNone: () => Effect.succeed(true),
            onSome: (candidate) => trySetCell(newGrid, idx, candidate),
          })
          if (!setResult) {
            return
          }
        }
        yield* solveRecursive(newGrid)
        return
      }

      const minCell = findMinCandidatesCell(g)
      yield* Option.match(minCell, {
        onNone: () => {
          count++
          return Effect.void
        },
        onSome: ({ index, count: candidateCount }) => {
          if (candidateCount === 0) {
            return Effect.void
          }
          const candidates = getCandidatesArray(g.getCandidates(index))
          return Effect.forEach(
            candidates,
            (value) =>
              Effect.gen(function* () {
                const newGrid = g.clone()
                const setResult = yield* trySetCell(newGrid, index, value)
                if (setResult) {
                  yield* solveRecursive(newGrid)
                }
              }),
            { discard: true },
          )
        },
      })
    })

  yield* solveRecursive(grid)
  return count
})

const findSolutionImpl: (
  grid: SudokuGrid,
) => Effect.Effect<Option.Option<SudokuGrid>, InvalidCellIndexError | InvalidCellValueError> =
  Effect.fn("SolutionFinder.findSolutionImpl")(function* (grid) {
    const singles = findNakedSingles(grid)
    if (singles.length > 0) {
      const newGrid = grid.clone()
      for (const idx of singles) {
        const value = getSingleCandidate(newGrid.getCandidates(idx))
        const setResult = yield* Option.match(value, {
          onNone: () => Effect.succeed(true),
          onSome: (candidate) => trySetCell(newGrid, idx, candidate),
        })
        if (!setResult) {
          return Option.none()
        }
      }
      return yield* findSolutionImpl(newGrid)
    }

    if (isComplete(grid)) {
      return Option.some(grid)
    }

    const minCell = findMinCandidatesCell(grid)
    return yield* Option.match(minCell, {
      onNone: () => Effect.succeed(Option.none()),
      onSome: ({ index, count: candidateCount }) => {
        if (candidateCount === 0) {
          return Effect.succeed(Option.none())
        }
        const candidates = getCandidatesArray(grid.getCandidates(index))
        return Effect.gen(function* () {
          for (const value of candidates) {
            const newGrid = grid.clone()
            const setResult = yield* trySetCell(newGrid, index, value)
            if (setResult) {
              const result = yield* findSolutionImpl(newGrid)
              if (Option.isSome(result)) {
                return result
              }
            }
          }
          return Option.none()
        })
      },
    })
  })

const toSolutionStep = (move: TechniqueMove): SolutionStep => ({
  technique: move.technique,
  cell: move.cellIndex,
  value: toCellValue(move.value),
})

export class SolutionFinder extends Effect.Service<SolutionFinder>()("SolutionFinder", {
  accessors: true,
  dependencies: [TechniqueDetector.Default],
  succeed: {
    countSolutions: Effect.fn("SolutionFinder.countSolutions")(function* (
      grid: SudokuGrid,
      maxCount: number,
    ) {
      return yield* countSolutionsImpl(grid, maxCount)
    }),

    hasUniqueSolution: Effect.fn("SolutionFinder.hasUniqueSolution")(function* (grid: SudokuGrid) {
      const count = yield* countSolutionsImpl(grid, 2)
      return count === 1
    }),

    solveBruteForce: Effect.fn("SolutionFinder.solveBruteForce")(function* (grid: SudokuGrid) {
      if (!isValid(grid)) {
        return yield* Effect.fail(new SolveError({ message: "Invalid puzzle" }))
      }

      const solutionCount = yield* countSolutionsImpl(grid, 2)

      if (solutionCount === 0) {
        return { solved: false, solutionCount: 0, steps: [] }
      }

      if (solutionCount > 1) {
        return { solved: false, solutionCount, steps: [] }
      }

      const solution = yield* findSolutionImpl(grid)
      return yield* Option.match(solution, {
        onNone: () => Effect.fail(new SolveError({ message: "Failed to find solution" })),
        onSome: (finalGrid) =>
          Effect.succeed({
            solved: true,
            solutionCount: 1,
            steps: [],
            finalGrid: finalGrid.toString(),
          }),
      })
    }),

    solveLogically: Effect.fn("SolutionFinder.solveLogically")(function* (grid: SudokuGrid) {
      if (!isValid(grid)) {
        return yield* Effect.fail(new SolveError({ message: "Invalid puzzle" }))
      }

      const detector = yield* TechniqueDetector
      let workingGrid = grid.clone()
      const steps: SolutionStep[] = []

      while (true) {
        const move = yield* detector.findNextMove(workingGrid).pipe(
          Effect.map(Option.some),
          Effect.catchTag("NoMoveFoundError", () => Effect.succeed(Option.none())),
        )

        if (Option.isNone(move)) {
          break
        }

        steps.push(toSolutionStep(move.value))
        const newGrid = yield* detector.applyMove(workingGrid, move.value)
        workingGrid = newGrid
      }

      const solved = isComplete(workingGrid)
      return {
        solved,
        solutionCount: solved ? 1 : 0,
        steps,
        finalGrid: solved ? workingGrid.toString() : undefined,
      }
    }),
  },
}) {}
