import { Effect, ParseResult, Schema } from "effect"

import { CANDIDATE_MASKS, GRID_SIZE } from "../../grid/constants.ts"
import { SudokuGrid } from "../../grid/sudoku-grid.ts"
import { CellIndex } from "../../puzzle.ts"
import { CellElimination, TechniqueCellValue } from "../../technique.ts"

export const makeCellIndex = (n: number) => Schema.decodeUnknown(CellIndex)(n)
export const makeCellValue = (n: number) => Schema.decodeUnknown(TechniqueCellValue)(n)

export type RawElimination = { index: number; values: readonly number[] }
export const makeCellElimination = (
  elimination: RawElimination,
): Effect.Effect<CellElimination, ParseResult.ParseError> =>
  Effect.gen(function* () {
    const index = yield* makeCellIndex(elimination.index)
    const values = yield* Effect.forEach(elimination.values, (value) => makeCellValue(value))
    return { index, values }
  })

export const getMask = (value: number): number => CANDIDATE_MASKS[value] ?? 0

export const findRowsWithNCandidates = (
  grid: SudokuGrid,
  digit: number,
  n: number,
): Array<[number, number, number]> => {
  const mask = getMask(digit)
  if (mask === 0) return []

  const result: Array<[number, number, number]> = []

  for (let row = 0; row < GRID_SIZE; row++) {
    const cells: number[] = []
    for (let col = 0; col < GRID_SIZE; col++) {
      const idx = row * GRID_SIZE + col
      if (grid.getCell(idx) === 0 && (grid.getCandidates(idx) & mask) !== 0) {
        cells.push(idx)
      }
    }
    if (cells.length === n && n >= 2 && cells[0] !== undefined && cells[1] !== undefined) {
      result.push([row, cells[0], cells[1]])
    }
  }

  return result
}

export const findColsWithNCandidates = (
  grid: SudokuGrid,
  digit: number,
  n: number,
): Array<[number, number, number]> => {
  const mask = getMask(digit)
  if (mask === 0) return []

  const result: Array<[number, number, number]> = []

  for (let col = 0; col < GRID_SIZE; col++) {
    const cells: number[] = []
    for (let row = 0; row < GRID_SIZE; row++) {
      const idx = row * GRID_SIZE + col
      if (grid.getCell(idx) === 0 && (grid.getCandidates(idx) & mask) !== 0) {
        cells.push(idx)
      }
    }
    if (cells.length === n && n >= 2 && cells[0] !== undefined && cells[1] !== undefined) {
      result.push([col, cells[0], cells[1]])
    }
  }

  return result
}

export const sameCol = (idx1: number, idx2: number): boolean => {
  return idx1 % GRID_SIZE === idx2 % GRID_SIZE
}

export const sameRow = (idx1: number, idx2: number): boolean => {
  return Math.floor(idx1 / GRID_SIZE) === Math.floor(idx2 / GRID_SIZE)
}
