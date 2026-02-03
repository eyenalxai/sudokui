import { describe, it, expect } from "bun:test"

import { runDifficultyTest } from "./csv-tests.ts"

describe("Moderately Hard Logical Solver", () => {
  it("should solve all Moderately Hard puzzles from CSV using logical techniques", async () => {
    const { puzzles, aggregated } = await runDifficultyTest(
      "Moderately Hard",
      "./src/lib/sudoku/tests/csv/data/moderately-hard.csv",
    )

    expect(aggregated.failed).toBe(0)
    expect(aggregated.solved).toBe(puzzles.length)
  })
})
