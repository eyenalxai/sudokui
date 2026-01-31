import { Effect } from "effect"

import { InvalidPuzzleError } from "../puzzle.ts"

// Grid Parsing

export const parsePuzzle = (puzzle: string): Effect.Effect<number[], InvalidPuzzleError> => {
  if (puzzle.length !== 81) {
    return Effect.fail(
      new InvalidPuzzleError({
        message: `Invalid puzzle length: ${puzzle.length}, expected 81`,
      }),
    )
  }

  const grid: number[] = []
  for (let i = 0; i < 81; i++) {
    const char = puzzle[i]
    if (char === undefined) {
      // This shouldn't happen since we checked length, but handle it for type safety
      return Effect.fail(
        new InvalidPuzzleError({
          message: `Unexpected undefined at position ${i}`,
        }),
      )
    }
    if (char === "." || char === "0") {
      grid.push(0)
    } else {
      const value = parseInt(char, 10)
      if (isNaN(value) || value < 1 || value > 9) {
        return Effect.fail(
          new InvalidPuzzleError({
            message: `Invalid character at position ${i}: ${char}`,
          }),
        )
      }
      grid.push(value)
    }
  }

  return Effect.succeed(grid)
}

export const gridToString = (grid: readonly number[]): string => {
  return grid.map((v) => (v === 0 ? "." : v.toString())).join("")
}
