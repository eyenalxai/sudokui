import { describe, it, expect } from "bun:test"

import { runDifficultyTest } from "./csv-tests.ts"

describe("Skyscraper + X-Wing + Two-String-Kite Logical Solver", () => {
  it("should solve Skyscraper + X-Wing + Two-String-Kite puzzles from CSV using logical techniques", async () => {
    const { puzzles, aggregated } = await runDifficultyTest(
      "Skyscraper + X-Wing + Two-String-Kite",
      "./src/lib/sudoku/tests/csv/data/skyscraper-x-wing-two-string-kite.csv",
    )

    expect(aggregated.failed).toBe(0)
    expect(aggregated.solved).toBe(puzzles.length)
  })
})
