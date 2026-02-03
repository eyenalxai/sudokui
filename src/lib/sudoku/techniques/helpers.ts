import { Effect, ParseResult, Schema } from "effect"

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
