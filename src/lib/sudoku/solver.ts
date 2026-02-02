import { Effect, Option } from "effect"

import { getCandidatesArray, getSingleCandidate } from "./grid/candidates.ts"
import { SudokuGrid } from "./grid/class.ts"
import { SolutionStep, SolveError } from "./puzzle.ts"
import { TechniqueDetector } from "./technique-detector.ts"
import { TechniqueMove } from "./technique.ts"

const countSolutionsImpl = (grid: SudokuGrid, maxCount: number): number => {
  let count = 0

  const solveRecursive = (g: SudokuGrid): void => {
    if (count >= maxCount) return

    const singles = g.findNakedSingles()
    if (singles.length > 0) {
      const newGrid = g.clone()
      for (const idx of singles) {
        const value = getSingleCandidate(newGrid.getCandidates(idx))
        const setResult = Option.match(value, {
          onNone: () => true,
          onSome: (candidate) => newGrid.setCell(idx, candidate),
        })
        if (!setResult) {
          return
        }
      }
      solveRecursive(newGrid)
      return
    }

    const minCell = g.findMinCandidatesCell()
    Option.match(minCell, {
      onNone: () => {
        count++
      },
      onSome: ({ index, count: candidateCount }) => {
        if (candidateCount === 0) {
          return
        }
        const candidates = getCandidatesArray(g.getCandidates(index))
        for (const value of candidates) {
          const newGrid = g.clone()
          if (newGrid.setCell(index, value)) {
            solveRecursive(newGrid)
          }
        }
      },
    })
  }

  solveRecursive(grid)
  return count
}

const findSolutionImpl = (grid: SudokuGrid): Option.Option<SudokuGrid> => {
  const singles = grid.findNakedSingles()
  if (singles.length > 0) {
    const newGrid = grid.clone()
    for (const idx of singles) {
      const value = getSingleCandidate(newGrid.getCandidates(idx))
      const setResult = Option.match(value, {
        onNone: () => true,
        onSome: (candidate) => newGrid.setCell(idx, candidate),
      })
      if (!setResult) {
        return Option.none()
      }
    }
    return findSolutionImpl(newGrid)
  }

  if (grid.isComplete()) {
    return Option.some(grid)
  }

  const minCell = grid.findMinCandidatesCell()
  return Option.match(minCell, {
    onNone: () => Option.none(),
    onSome: ({ index, count: candidateCount }) => {
      if (candidateCount === 0) {
        return Option.none()
      }
      const candidates = getCandidatesArray(grid.getCandidates(index))
      for (const value of candidates) {
        const newGrid = grid.clone()
        if (newGrid.setCell(index, value)) {
          const result = findSolutionImpl(newGrid)
          if (Option.isSome(result)) {
            return result
          }
        }
      }
      return Option.none()
    },
  })
}

const toSolutionStep = (move: TechniqueMove): SolutionStep => ({
  technique: move.technique,
  cell: move.cellIndex,
  value: move.value,
})

export class SolutionFinder extends Effect.Service<SolutionFinder>()("SolutionFinder", {
  accessors: true,
  dependencies: [TechniqueDetector.Default],
  succeed: {
    countSolutions: (grid: SudokuGrid, maxCount: number): Effect.Effect<number> =>
      Effect.succeed(countSolutionsImpl(grid, maxCount)),

    hasUniqueSolution: (grid: SudokuGrid): Effect.Effect<boolean> =>
      Effect.succeed(countSolutionsImpl(grid, 2) === 1),

    solveBruteForce: Effect.fn("SolutionFinder.solveBruteForce")(function* (grid: SudokuGrid) {
      if (!grid.isValid()) {
        return yield* Effect.fail(new SolveError({ message: "Invalid puzzle" }))
      }

      const solutionCount = countSolutionsImpl(grid, 2)

      if (solutionCount === 0) {
        return { solved: false, solutionCount: 0, steps: [] }
      }

      if (solutionCount > 1) {
        return { solved: false, solutionCount, steps: [] }
      }

      const solution = findSolutionImpl(grid)
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
      if (!grid.isValid()) {
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
        const newGrid = yield* detector
          .applyMove(workingGrid, move.value)
          .pipe(
            Effect.catchTag("InvalidGridError", (error) =>
              Effect.fail(new SolveError({ message: error.message })),
            ),
          )
        workingGrid = newGrid
      }

      const solved = workingGrid.isComplete()
      return {
        solved,
        solutionCount: solved ? 1 : 0,
        steps,
        finalGrid: solved ? workingGrid.toString() : undefined,
      }
    }),
  },
}) {}
