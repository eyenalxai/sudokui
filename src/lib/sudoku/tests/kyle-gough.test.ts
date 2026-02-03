import { describe, it, expect } from "bun:test"
import { existsSync } from "node:fs"

import { Effect } from "effect"

import { TOTAL_CELLS } from "../grid/constants.ts"
import { SudokuGrid } from "../grid/sudoku-grid.ts"
import { SolutionFinder } from "../solver.ts"

const loadPuzzlesFromCSV = async (filePath: string, sampleSize?: number): Promise<string[]> => {
  const file = Bun.file(filePath)
  const content = await file.text()
  const lines = content
    .split("\n")
    .map((line: string) => line.replace("\r", "").trim())
    .filter((line: string) => line.length === TOTAL_CELLS)

  if (sampleSize !== undefined && sampleSize < lines.length) {
    const shuffled = [...lines].toSorted(() => Math.random() - 0.5)
    return shuffled.slice(0, sampleSize)
  }

  return lines
}

interface PuzzleResult {
  success: boolean
  totalTime: number
  uniqueCheckTime: number
  solveTime: number
  index: number
}

const solvePuzzle = (puzzle: string) =>
  Effect.gen(function* () {
    const solutionFinder = yield* SolutionFinder
    const grid = yield* SudokuGrid.fromString(puzzle).pipe(Effect.orDie)

    const startTime = performance.now()
    const hasUnique = yield* solutionFinder.hasUniqueSolution(grid)
    const solveStart = performance.now()
    const result = yield* solutionFinder.solveBruteForce(grid).pipe(Effect.orDie)
    const endTime = performance.now()

    const uniqueCheckTime = solveStart - startTime
    const solveTime = endTime - solveStart
    const totalTime = endTime - startTime

    return {
      success: hasUnique && result.solved && result.solutionCount === 1,
      totalTime,
      uniqueCheckTime,
      solveTime,
    }
  })

const testDir = "/home/ulezot/Projects/misc/sudoku-kyle-gough/tests"

describe.skipIf(!existsSync(testDir))("Kyle Gough Solving Benchmarks", () => {
  const sampleSize = 2

  describe("X-Wing puzzles", () => {
    it("should solve X-Wing puzzle samples", async () => {
      const puzzles = await loadPuzzlesFromCSV(`${testDir}/xwing.csv`, sampleSize)

      const results: PuzzleResult[] = []
      for (let i = 0; i < puzzles.length; i++) {
        const puzzle = puzzles[i]
        if (puzzle === undefined) continue
        const result = Effect.runSync(
          solvePuzzle(puzzle).pipe(
            Effect.map((r) => ({ ...r, index: i + 1 })),
            Effect.provide(SolutionFinder.Default),
          ),
        )
        results.push(result)
      }

      console.log(`\nX-Wing puzzles (${results.length} samples):`)
      for (const result of results) {
        console.log(
          `  Puzzle ${result.index}: ${result.totalTime.toFixed(2)}ms (unique: ${result.uniqueCheckTime.toFixed(2)}ms, solve: ${result.solveTime.toFixed(2)}ms)`,
        )
        expect(result.success).toBe(true)
      }
    })
  })

  describe("Y-Wing puzzles", () => {
    it("should solve Y-Wing puzzle samples", async () => {
      const puzzles = await loadPuzzlesFromCSV(`${testDir}/ywing.csv`, sampleSize)

      const results: PuzzleResult[] = []
      for (let i = 0; i < puzzles.length; i++) {
        const puzzle = puzzles[i]
        if (puzzle === undefined) continue
        const result = Effect.runSync(
          solvePuzzle(puzzle).pipe(
            Effect.map((r) => ({ ...r, index: i + 1 })),
            Effect.provide(SolutionFinder.Default),
          ),
        )
        results.push(result)
      }

      console.log(`\nY-Wing puzzles (${results.length} samples):`)
      for (const result of results) {
        console.log(
          `  Puzzle ${result.index}: ${result.totalTime.toFixed(2)}ms (unique: ${result.uniqueCheckTime.toFixed(2)}ms, solve: ${result.solveTime.toFixed(2)}ms)`,
        )
        expect(result.success).toBe(true)
      }
    })
  })

  describe("Swordfish puzzles", () => {
    it("should solve Swordfish puzzle samples", async () => {
      const puzzles = await loadPuzzlesFromCSV(`${testDir}/swordfish.csv`, sampleSize)

      const results: PuzzleResult[] = []
      for (let i = 0; i < puzzles.length; i++) {
        const puzzle = puzzles[i]
        if (puzzle === undefined) continue
        const result = Effect.runSync(
          solvePuzzle(puzzle).pipe(
            Effect.map((r) => ({ ...r, index: i + 1 })),
            Effect.provide(SolutionFinder.Default),
          ),
        )
        results.push(result)
      }

      console.log(`\nSwordfish puzzles (${results.length} samples):`)
      for (const result of results) {
        console.log(
          `  Puzzle ${result.index}: ${result.totalTime.toFixed(2)}ms (unique: ${result.uniqueCheckTime.toFixed(2)}ms, solve: ${result.solveTime.toFixed(2)}ms)`,
        )
        expect(result.success).toBe(true)
      }
    })
  })

  describe("XYZ-Wing puzzles", () => {
    it("should solve XYZ-Wing puzzle samples", async () => {
      const puzzles = await loadPuzzlesFromCSV(`${testDir}/xyzwing.csv`, sampleSize)

      const results: PuzzleResult[] = []
      for (let i = 0; i < puzzles.length; i++) {
        const puzzle = puzzles[i]
        if (puzzle === undefined) continue
        const result = Effect.runSync(
          solvePuzzle(puzzle).pipe(
            Effect.map((r) => ({ ...r, index: i + 1 })),
            Effect.provide(SolutionFinder.Default),
          ),
        )
        results.push(result)
      }

      console.log(`\nXYZ-Wing puzzles (${results.length} samples):`)
      for (const result of results) {
        console.log(
          `  Puzzle ${result.index}: ${result.totalTime.toFixed(2)}ms (unique: ${result.uniqueCheckTime.toFixed(2)}ms, solve: ${result.solveTime.toFixed(2)}ms)`,
        )
        expect(result.success).toBe(true)
      }
    })
  })

  describe("Diabolical puzzles", () => {
    it("should solve diabolical puzzle samples", async () => {
      const puzzles1 = await loadPuzzlesFromCSV(`${testDir}/diabolical1.csv`, 1)
      const puzzles2 = await loadPuzzlesFromCSV(`${testDir}/diabolical2.csv`, 1)
      const puzzles = puzzles1.concat(puzzles2)

      const results: PuzzleResult[] = []
      for (let i = 0; i < puzzles.length; i++) {
        const puzzle = puzzles[i]
        if (puzzle === undefined) continue
        const result = Effect.runSync(
          solvePuzzle(puzzle).pipe(
            Effect.map((r) => ({ ...r, index: i + 1 })),
            Effect.provide(SolutionFinder.Default),
          ),
        )
        results.push(result)
      }

      console.log(`\nDiabolical puzzles (${results.length} samples):`)
      for (const result of results) {
        console.log(
          `  Diabolical ${result.index}: ${result.totalTime.toFixed(2)}ms (unique: ${result.uniqueCheckTime.toFixed(2)}ms, solve: ${result.solveTime.toFixed(2)}ms)`,
        )
        expect(result.success).toBe(true)
      }
    })
  })
})
