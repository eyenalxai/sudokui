import { describe, it, expect } from "bun:test"

import { Effect } from "effect"

import { SudokuGrid } from "./grid.ts"
import { SolutionFinder } from "./solver.ts"

const loadPuzzlesFromCSV = async (filePath: string, sampleSize?: number): Promise<string[]> => {
  const file = Bun.file(filePath)
  const content = await file.text()
  const lines = content
    .split("\n")
    .map((line: string) => line.replace("\r", "").trim())
    .filter((line: string) => line.length === 81)

  if (sampleSize !== undefined && sampleSize < lines.length) {
    const shuffled = [...lines].toSorted(() => Math.random() - 0.5)
    return shuffled.slice(0, sampleSize)
  }

  return lines
}

const testPuzzleSolving = (
  puzzle: string,
  description: string,
): Effect.Effect<void, never, SolutionFinder> => {
  return Effect.gen(function* () {
    const solutionFinder = yield* SolutionFinder
    const grid = yield* SudokuGrid.fromString(puzzle).pipe(Effect.orDie)

    const startTime = performance.now()
    const hasUnique = yield* solutionFinder.hasUniqueSolution(grid)
    const solveStart = performance.now()
    const result = yield* solutionFinder.solve(grid).pipe(Effect.orDie)
    const endTime = performance.now()

    const uniqueCheckTime = solveStart - startTime
    const solveTime = endTime - solveStart
    const totalTime = endTime - startTime

    console.log(
      `  ${description}: ${totalTime.toFixed(2)}ms (unique: ${uniqueCheckTime.toFixed(2)}ms, solve: ${solveTime.toFixed(2)}ms)`,
    )

    expect(hasUnique).toBe(true)
    expect(result.solved).toBe(true)
    expect(result.solutionCount).toBe(1)
  })
}

describe("Kyle Gough Solving Benchmarks", () => {
  const testDir = "/home/ulezot/Projects/misc/sudoku-kyle-gough/tests"
  const sampleSize = 2

  describe("X-Wing puzzles", () => {
    it("should solve X-Wing puzzle samples", async () => {
      const puzzles = await loadPuzzlesFromCSV(`${testDir}/xwing.csv`, sampleSize)

      const program = Effect.gen(function* () {
        console.log(`\nX-Wing puzzles (${puzzles.length} samples):`)
        for (let i = 0; i < puzzles.length; i++) {
          const puzzle = puzzles[i]
          if (puzzle !== undefined) {
            yield* testPuzzleSolving(puzzle, `Puzzle ${i + 1}`)
          }
        }
      })

      await Effect.runPromise(program.pipe(Effect.provide(SolutionFinder.Default)))
    })
  })

  describe("Y-Wing puzzles", () => {
    it("should solve Y-Wing puzzle samples", async () => {
      const puzzles = await loadPuzzlesFromCSV(`${testDir}/ywing.csv`, sampleSize)

      const program = Effect.gen(function* () {
        console.log(`\nY-Wing puzzles (${puzzles.length} samples):`)
        for (let i = 0; i < puzzles.length; i++) {
          const puzzle = puzzles[i]
          if (puzzle !== undefined) {
            yield* testPuzzleSolving(puzzle, `Puzzle ${i + 1}`)
          }
        }
      })

      await Effect.runPromise(program.pipe(Effect.provide(SolutionFinder.Default)))
    })
  })

  describe("Swordfish puzzles", () => {
    it("should solve Swordfish puzzle samples", async () => {
      const puzzles = await loadPuzzlesFromCSV(`${testDir}/swordfish.csv`, sampleSize)

      const program = Effect.gen(function* () {
        console.log(`\nSwordfish puzzles (${puzzles.length} samples):`)
        for (let i = 0; i < puzzles.length; i++) {
          const puzzle = puzzles[i]
          if (puzzle !== undefined) {
            yield* testPuzzleSolving(puzzle, `Puzzle ${i + 1}`)
          }
        }
      })

      await Effect.runPromise(program.pipe(Effect.provide(SolutionFinder.Default)))
    })
  })

  describe("XYZ-Wing puzzles", () => {
    it("should solve XYZ-Wing puzzle samples", async () => {
      const puzzles = await loadPuzzlesFromCSV(`${testDir}/xyzwing.csv`, sampleSize)

      const program = Effect.gen(function* () {
        console.log(`\nXYZ-Wing puzzles (${puzzles.length} samples):`)
        for (let i = 0; i < puzzles.length; i++) {
          const puzzle = puzzles[i]
          if (puzzle !== undefined) {
            yield* testPuzzleSolving(puzzle, `Puzzle ${i + 1}`)
          }
        }
      })

      await Effect.runPromise(program.pipe(Effect.provide(SolutionFinder.Default)))
    })
  })

  describe("Diabolical puzzles", () => {
    it("should solve diabolical puzzle samples", async () => {
      const puzzles1 = await loadPuzzlesFromCSV(`${testDir}/diabolical1.csv`, 1)
      const puzzles2 = await loadPuzzlesFromCSV(`${testDir}/diabolical2.csv`, 1)
      const puzzles = puzzles1.concat(puzzles2)

      const program = Effect.gen(function* () {
        console.log(`\nDiabolical puzzles (${puzzles.length} samples):`)
        for (let i = 0; i < puzzles.length; i++) {
          const puzzle = puzzles[i]
          if (puzzle !== undefined) {
            yield* testPuzzleSolving(puzzle, `Diabolical ${i + 1}`)
          }
        }
      })

      await Effect.runPromise(program.pipe(Effect.provide(SolutionFinder.Default)))
    })
  })
})
