import { Effect } from "effect"

import { InvalidPuzzleError } from "../puzzle.ts"

import { GRID_SIZE, TOTAL_CELLS } from "./constants.ts"

export const parsePuzzle = (puzzle: string): Effect.Effect<number[], InvalidPuzzleError> => {
  if (puzzle.length !== TOTAL_CELLS) {
    return Effect.fail(
      new InvalidPuzzleError({
        message: `Invalid puzzle length: ${puzzle.length}, expected ${TOTAL_CELLS}`,
      }),
    )
  }

  const grid: number[] = []
  for (let i = 0; i < TOTAL_CELLS; i++) {
    const char = puzzle[i]
    if (char === undefined) {
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
      if (isNaN(value) || value < 1 || value > GRID_SIZE) {
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
