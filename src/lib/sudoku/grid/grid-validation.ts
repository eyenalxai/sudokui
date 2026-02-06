import { Effect, Schema } from "effect"

import { CellIndex, CellValue, InvalidCellIndexError, InvalidCellValueError } from "../puzzle.ts"

import { GRID_SIZE } from "./constants.ts"

const isCellIndex = Schema.is(CellIndex)
const isCellValue = Schema.is(CellValue)

export const getCellIndexOrFail = (
  index: number,
): Effect.Effect<CellIndex, InvalidCellIndexError> =>
  Effect.gen(function* () {
    if (!isCellIndex(index)) {
      return yield* Effect.fail(
        new InvalidCellIndexError({
          index,
          message: `Invalid cell index: ${index}`,
        }),
      )
    }
    return index
  })

export const validateCellValue = (
  cellIndex: CellIndex,
  value: number,
): Effect.Effect<CellValue, InvalidCellValueError> =>
  Effect.gen(function* () {
    if (value < 0 || value > GRID_SIZE || !isCellValue(value)) {
      return yield* Effect.fail(
        new InvalidCellValueError({
          cellIndex,
          value,
          message: `Invalid cell value: ${value}`,
        }),
      )
    }
    return value
  })

export const validateCandidateValue = (
  cellIndex: CellIndex,
  value: number,
): Effect.Effect<CellValue, InvalidCellValueError> =>
  Effect.gen(function* () {
    if (value === 0 || value < 1 || value > GRID_SIZE || !isCellValue(value)) {
      return yield* Effect.fail(
        new InvalidCellValueError({
          cellIndex,
          value,
          message: `Invalid candidate value: ${value}`,
        }),
      )
    }
    return value
  })
