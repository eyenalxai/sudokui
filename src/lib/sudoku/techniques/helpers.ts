import { Effect, ParseResult, Schema } from "effect"

import { CANDIDATE_MASKS } from "../grid/constants.ts"
import { SudokuGrid } from "../grid/sudoku-grid.ts"
import { CellIndex } from "../puzzle.ts"
import { CellElimination, TechniqueCellValue } from "../technique.ts"

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

export const collectCandidateEliminations = (
  grid: SudokuGrid,
  indices: readonly number[],
  digit: number,
  mask: number,
  exclude: Set<number> | null = null,
): RawElimination[] => {
  if (mask === 0) return []
  const eliminations: RawElimination[] = []

  for (const idx of indices) {
    if (exclude !== null && exclude.has(idx)) continue
    if (grid.getCell(idx) !== 0) continue
    if ((grid.getCandidates(idx) & mask) === 0) continue
    eliminations.push({ index: idx, values: [digit] })
  }

  return eliminations
}
