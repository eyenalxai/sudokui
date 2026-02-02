import { Effect } from "effect"

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
        if (value !== null && !newGrid.setCell(idx, value)) {
          return
        }
      }
      solveRecursive(newGrid)
      return
    }

    const minCell = g.findMinCandidatesCell()
    if (!minCell) {
      count++
      return
    }

    if (minCell.count === 0) {
      return
    }

    const candidates = getCandidatesArray(g.getCandidates(minCell.index))
    for (const value of candidates) {
      const newGrid = g.clone()
      if (newGrid.setCell(minCell.index, value)) {
        solveRecursive(newGrid)
      }
    }
  }

  solveRecursive(grid)
  return count
}

const findSolutionImpl = (grid: SudokuGrid): SudokuGrid | null => {
  const singles = grid.findNakedSingles()
  if (singles.length > 0) {
    const newGrid = grid.clone()
    for (const idx of singles) {
      const value = getSingleCandidate(newGrid.getCandidates(idx))
      if (value !== null && !newGrid.setCell(idx, value)) {
        return null
      }
    }
    return findSolutionImpl(newGrid)
  }

  if (grid.isComplete()) {
    return grid
  }

  const minCell = grid.findMinCandidatesCell()
  if (!minCell || minCell.count === 0) {
    return null
  }

  const candidates = getCandidatesArray(grid.getCandidates(minCell.index))
  for (const value of candidates) {
    const newGrid = grid.clone()
    if (newGrid.setCell(minCell.index, value)) {
      const result = findSolutionImpl(newGrid)
      if (result !== null) {
        return result
      }
    }
  }

  return null
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
      if (!solution) {
        return yield* Effect.fail(new SolveError({ message: "Failed to find solution" }))
      }

      return {
        solved: true,
        solutionCount: 1,
        steps: [],
        finalGrid: solution.toString(),
      }
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
          Effect.matchEffect({
            onSuccess: (nextMove) => Effect.succeed(nextMove),
            onFailure: () => Effect.succeed(null),
          }),
        )

        if (move === null) {
          break
        }

        steps.push(toSolutionStep(move))
        const newGrid = yield* detector.applyMove(workingGrid, move).pipe(
          Effect.catchAll((error) => {
            const message =
              typeof error === "object" && error !== null && "message" in error
                ? String(error.message)
                : "Failed to apply logical move"
            return Effect.fail(new SolveError({ message }))
          }),
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
