import { Effect, Option } from "effect"

import {
  CellConflictError,
  InvalidCellIndexError,
  InvalidCellValueError,
  NoCandidatesRemainingError,
} from "../puzzle.ts"

import { countCandidates, getSingleCandidate } from "./candidates.ts"
import { TOTAL_CELLS } from "./constants.ts"
import { SudokuGrid } from "./sudoku-grid.ts"

export const findMinCandidatesCell = (
  grid: SudokuGrid,
): Option.Option<{ index: number; count: number }> => {
  let minIndex = -1
  let minCount = 10

  for (let i = 0; i < TOTAL_CELLS; i++) {
    const cell = grid.cells[i]
    if (cell === undefined) continue
    if (cell.value === 0) {
      const count = countCandidates(cell.candidates)
      if (count < minCount) {
        minCount = count
        minIndex = i
        if (count === 1) break
      }
    }
  }

  if (minIndex === -1) return Option.none()
  return Option.some({ index: minIndex, count: minCount })
}

export const findNakedSingles = (grid: SudokuGrid): number[] => {
  const singles: number[] = []
  for (let i = 0; i < TOTAL_CELLS; i++) {
    const cell = grid.cells[i]
    if (cell === undefined) continue
    if (cell.value === 0 && countCandidates(cell.candidates) === 1) {
      singles.push(i)
    }
  }
  return singles
}

export const setNakedSingles = (
  grid: SudokuGrid,
): Effect.Effect<
  void,
  InvalidCellIndexError | InvalidCellValueError | CellConflictError | NoCandidatesRemainingError
> => {
  const { cells } = grid.getCellsRef()
  const setCell = (index: number, value: number) => grid.setCell(index, value)
  const findSingles = () => findNakedSingles(grid)
  return Effect.gen(function* () {
    let changed = true
    let iterations = 0
    const maxIterations = TOTAL_CELLS
    while (changed && iterations < maxIterations) {
      changed = false
      iterations++
      const singles = findSingles()
      for (const index of singles) {
        const cell = cells[index]
        if (cell === undefined) {
          return yield* Effect.fail(
            new InvalidCellIndexError({
              index,
              message: `Invalid cell index: ${index}`,
            }),
          )
        }
        const value = getSingleCandidate(cell.candidates)
        if (Option.isSome(value)) {
          yield* setCell(index, value.value)
          changed = true
        }
      }
    }
  })
}
