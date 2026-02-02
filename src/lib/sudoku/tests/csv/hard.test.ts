import { describe, it, expect } from "bun:test"

import { Effect } from "effect"

import { TechniqueDetector } from "../../technique-detector.ts"

import { aggregateResults, loadPuzzlesFromCSV, printResults, solvePuzzle } from "./csv-tests.ts"

describe("Hard Logical Solver", () => {
  it("should solve all Hard puzzles from CSV using logical techniques", async () => {
    const puzzles = await loadPuzzlesFromCSV("./src/lib/sudoku/tests/csv/data/hard.csv")

    expect(puzzles.length).toBeGreaterThan(0)

    const results = []
    for (const puzzleData of puzzles) {
      const result = Effect.runSync(
        solvePuzzle(puzzleData.puzzle, puzzleData.solution).pipe(
          Effect.provide(TechniqueDetector.Default),
        ),
      )
      results.push(result)
    }

    const aggregated = aggregateResults(results)
    printResults("Hard", puzzles.length, aggregated)

    expect(aggregated.failed).toBe(0)
    expect(aggregated.solved).toBe(puzzles.length)
  })
})
