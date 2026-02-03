import { describe, it, expect } from "bun:test"

import { runDifficultyTest } from "./csv-tests.ts"

describe("Vicious Logical Solver", () => {
  it("should solve Vicious puzzles from CSV using logical techniques", async () => {
    const { puzzles, aggregated } = await runDifficultyTest(
      "Vicious",
      "./src/lib/sudoku/tests/csv/data/vicious.csv",
    )

    expect(aggregated.failed).toBe(0)
    expect(aggregated.solved).toBe(puzzles.length)
  })
})
