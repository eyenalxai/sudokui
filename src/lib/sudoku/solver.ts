import { Effect } from "effect"

import { SudokuGrid, getSingleCandidate, getCandidatesArray } from "./grid.ts"
import { SolveError } from "./puzzle.ts"

// =============================================================================
// Pure computation functions
// =============================================================================

// Count solutions up to max limit
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

// Find the solution
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

// =============================================================================
// SolutionFinder Service
// =============================================================================

export class SolutionFinder extends Effect.Service<SolutionFinder>()("SolutionFinder", {
  succeed: {
    countSolutions: (grid: SudokuGrid, maxCount: number): Effect.Effect<number> =>
      Effect.succeed(countSolutionsImpl(grid, maxCount)),

    hasUniqueSolution: (grid: SudokuGrid): Effect.Effect<boolean> =>
      Effect.succeed(countSolutionsImpl(grid, 2) === 1),

    solve: Effect.fn("SolutionFinder.solve")(function* (grid: SudokuGrid) {
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
  },
}) {}
