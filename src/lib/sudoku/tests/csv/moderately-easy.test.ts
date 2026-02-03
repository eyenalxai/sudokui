import { describe, it, expect } from "bun:test"

import { runDifficultyTest } from "./csv-tests.ts"

describe("Moderately Easy Logical Solver", () => {
  it("should solve all Moderately Easy puzzles from CSV using logical techniques", async () => {
    const { puzzles, aggregated } = await runDifficultyTest(
      "Moderately Easy",
      "./src/lib/sudoku/tests/csv/data/moderately-easy.csv",
    )

    expect(aggregated.failed).toBe(0)
    expect(aggregated.solved).toBe(puzzles.length)
  })
})
