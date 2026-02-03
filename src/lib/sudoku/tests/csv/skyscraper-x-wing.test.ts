import { describe, it, expect } from "bun:test"

import { runDifficultyTest } from "./csv-tests.ts"

describe("Skyscraper + X-Wing Logical Solver", () => {
  it("should solve Skyscraper + X-Wing puzzles from CSV using logical techniques", async () => {
    const { puzzles, aggregated } = await runDifficultyTest(
      "Skyscraper + X-Wing",
      "./src/lib/sudoku/tests/csv/data/skyscraper-x-wing.csv",
    )

    expect(aggregated.failed).toBe(0)
    expect(aggregated.solved).toBe(puzzles.length)
  })
})
