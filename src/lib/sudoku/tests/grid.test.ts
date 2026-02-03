import { describe, it, expect } from "bun:test"

import { Effect } from "effect"

import { SudokuGrid } from "../grid/sudoku-grid.ts"
import { countGivens } from "../grid/validation.ts"
import { SolutionFinder } from "../solver.ts"

const convertTdokuFormat = (puzzle: string): string => {
  return puzzle.replaceAll(".", "0")
}

describe("SudokuGrid", () => {
  describe("tdoku puzzle #1", () => {
    const tdokuPuzzle =
      ".5..83.17...1..4..3.4..56.8....3...9.9.8245....6....7...9....5...729..861.36.72.4"
    const expectedSolution =
      "652483917978162435314975628825736149791824563436519872269348751547291386183657294"

    it("should parse tdoku puzzle format", () => {
      const puzzle = convertTdokuFormat(tdokuPuzzle)
      const program = Effect.gen(function* () {
        const grid = yield* SudokuGrid.fromString(puzzle)
        expect(grid.toString()).toBe(tdokuPuzzle)
        expect(countGivens(grid)).toBe(34)
      })

      Effect.runSync(program)
    })

    it("should solve the puzzle correctly", () => {
      const puzzle = convertTdokuFormat(tdokuPuzzle)
      const program = Effect.gen(function* () {
        const solutionFinder = yield* SolutionFinder
        const grid = yield* SudokuGrid.fromString(puzzle)
        const result = yield* solutionFinder.solveBruteForce(grid)

        expect(result.solved).toBe(true)
        expect(result.solutionCount).toBe(1)
        if (!result.solved || !("finalGrid" in result)) {
          throw new Error("Expected puzzle to be solved")
        }
        expect(result.finalGrid).toBe(expectedSolution)
      })

      Effect.runSync(program.pipe(Effect.provide(SolutionFinder.Default)))
    })

    it("should verify unique solution", () => {
      const puzzle = convertTdokuFormat(tdokuPuzzle)
      const program = Effect.gen(function* () {
        const solutionFinder = yield* SolutionFinder
        const grid = yield* SudokuGrid.fromString(puzzle)
        const hasUnique = yield* solutionFinder.hasUniqueSolution(grid)

        expect(hasUnique).toBe(true)
      })

      Effect.runSync(program.pipe(Effect.provide(SolutionFinder.Default)))
    })
  })

  describe("tdoku puzzle #2", () => {
    const tdokuPuzzle =
      "2.6.3......1.65.7..471.8.5.5......29..8.194.6...42...1....428..6.93....5.7.....13"
    const expectedSolution =
      "256734198891265374347198652514683729728519436963427581135942867689371245472856913"

    it("should parse and solve puzzle #2", () => {
      const puzzle = convertTdokuFormat(tdokuPuzzle)
      const program = Effect.gen(function* () {
        const solutionFinder = yield* SolutionFinder
        const grid = yield* SudokuGrid.fromString(puzzle)
        const result = yield* solutionFinder.solveBruteForce(grid)

        expect(result.solved).toBe(true)
        expect(result.solutionCount).toBe(1)
        if (!result.solved || !("finalGrid" in result)) {
          throw new Error("Expected puzzle to be solved")
        }
        expect(result.finalGrid).toBe(expectedSolution)
      })

      Effect.runSync(program.pipe(Effect.provide(SolutionFinder.Default)))
    })
  })

  describe("tdoku puzzle with 125 solutions", () => {
    const tdokuPuzzle =
      "8.........95.......67..........2.485...4.3192......736...651947...732518...894263"

    it("should detect multiple solutions", () => {
      const puzzle = convertTdokuFormat(tdokuPuzzle)
      const program = Effect.gen(function* () {
        const solutionFinder = yield* SolutionFinder
        const grid = yield* SudokuGrid.fromString(puzzle)

        const solutionCount = yield* solutionFinder.countSolutions(grid, 200)

        expect(solutionCount).toBe(125)
      })

      Effect.runSync(program.pipe(Effect.provide(SolutionFinder.Default)))
    })

    it("should not have unique solution", () => {
      const puzzle = convertTdokuFormat(tdokuPuzzle)
      const program = Effect.gen(function* () {
        const solutionFinder = yield* SolutionFinder
        const grid = yield* SudokuGrid.fromString(puzzle)
        const hasUnique = yield* solutionFinder.hasUniqueSolution(grid)

        expect(hasUnique).toBe(false)
      })

      Effect.runSync(program.pipe(Effect.provide(SolutionFinder.Default)))
    })
  })
})
