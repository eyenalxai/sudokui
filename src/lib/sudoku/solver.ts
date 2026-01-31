import { Effect } from "effect"
import { SudokuGrid, getSingleCandidate, getCandidatesArray } from "./grid.ts"
import { SolutionResult, SolveError } from "./puzzle.ts"

// =============================================================================
// SolutionFinder Service
// =============================================================================

export class SolutionFinder extends Effect.Service<SolutionFinder>()("SolutionFinder", {
  effect: Effect.gen(function* () {
    
    // Count solutions up to max limit
    const countSolutions = (grid: SudokuGrid, maxCount: number): Effect.Effect<number> => 
      Effect.gen(function* () {
        let count = 0
        
        const solveRecursive = (g: SudokuGrid): void => {
          if (count >= maxCount) return
          
          // Apply naked singles first
          const singles = g.findNakedSingles()
          if (singles.length > 0) {
            const newGrid = g.clone()
            for (const idx of singles) {
              const value = getSingleCandidate(newGrid.getCandidates(idx))
              if (value !== null && !newGrid.setCell(idx, value)) {
                return // Invalid
              }
            }
            solveRecursive(newGrid)
            return
          }
          
          // Find cell with minimum candidates
          const minCell = g.findMinCandidatesCell()
          if (!minCell) {
            // Solved
            count++
            return
          }
          
          if (minCell.count === 0) {
            return // Dead end
          }
          
          // Try each candidate
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
      }).pipe(Effect.withSpan("SolutionFinder.countSolutions"))
    
    // Check if puzzle has unique solution
    const hasUniqueSolution = (grid: SudokuGrid): Effect.Effect<boolean> =>
      Effect.gen(function* () {
        const count = yield* countSolutions(grid, 2)
        return count === 1
      }).pipe(Effect.withSpan("SolutionFinder.hasUniqueSolution"))
    
    // Solve puzzle completely and return solution
    const solve = (grid: SudokuGrid): Effect.Effect<SolutionResult, SolveError> =>
      Effect.gen(function* () {
        // First check if valid
        if (!grid.isValid()) {
          return yield* Effect.fail(new SolveError({ message: "Invalid puzzle" }))
        }
        
        // Count solutions
        const solutionCount = yield* countSolutions(grid, 2)
        
        if (solutionCount === 0) {
          return {
            solved: false,
            solutionCount: 0,
            steps: [],
          }
        }
        
        if (solutionCount > 1) {
          return {
            solved: false,
            solutionCount,
            steps: [],
          }
        }
        
        // Find the actual solution
        const findSolution = (g: SudokuGrid): SudokuGrid | null => {
          // Apply naked singles
          const singles = g.findNakedSingles()
          if (singles.length > 0) {
            const newGrid = g.clone()
            for (const idx of singles) {
              const value = getSingleCandidate(newGrid.getCandidates(idx))
              if (value !== null && !newGrid.setCell(idx, value)) {
                return null
              }
            }
            return findSolution(newGrid)
          }
          
          // Check if complete
          if (g.isComplete()) {
            return g
          }
          
          // Find min candidates cell
          const minCell = g.findMinCandidatesCell()
          if (!minCell || minCell.count === 0) {
            return null
          }
          
          // Try candidates
          const candidates = getCandidatesArray(g.getCandidates(minCell.index))
          for (const value of candidates) {
            const newGrid = g.clone()
            if (newGrid.setCell(minCell.index, value)) {
              const result = findSolution(newGrid)
              if (result !== null) {
                return result
              }
            }
          }
          
          return null
        }
        
        const solution = findSolution(grid)
        if (!solution) {
          return yield* Effect.fail(new SolveError({ message: "Failed to find solution" }))
        }
        
        return {
          solved: true,
          solutionCount: 1,
          steps: [],
          finalGrid: solution.toString(),
        }
      }).pipe(Effect.withSpan("SolutionFinder.solve"))
    
    return {
      countSolutions,
      hasUniqueSolution,
      solve,
    }
  }),
}) {}
