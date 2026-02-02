import { Effect, ParseResult, Schema } from "effect"

import { CellElimination, CellIndex, CellValue } from "../../technique.ts"

export const makeCellIndex = (n: number) => Schema.decodeUnknown(CellIndex)(n)
export const makeCellValue = (n: number) => Schema.decodeUnknown(CellValue)(n)

export type RawElimination = { index: number; values: readonly number[] }
export const makeCellElimination = (
  elimination: RawElimination,
): Effect.Effect<CellElimination, ParseResult.ParseError> =>
  Effect.gen(function* () {
    const index = yield* makeCellIndex(elimination.index)
    const values = yield* Effect.forEach(elimination.values, (value) => makeCellValue(value))
    return { index, values }
  })

export type NakedTechnique = "NAKED_PAIR" | "NAKED_TRIPLE" | "NAKED_QUADRUPLE"
export type HiddenTechnique = "HIDDEN_PAIR" | "HIDDEN_TRIPLE" | "HIDDEN_QUADRUPLE"

/**
 * Get all combinations of n elements from array
 */
export const getCombinations = <T>(arr: readonly T[], n: number): T[][] => {
  const result: T[][] = []
  const current: T[] = []

  const combine = (start: number) => {
    if (current.length === n) {
      result.push([...current])
      return
    }

    for (let i = start; i < arr.length; i++) {
      const item = arr[i]
      if (item !== undefined) {
        current.push(item)
        combine(i + 1)
        current.pop()
      }
    }
  }

  combine(0)
  return result
}

export interface CellData {
  index: number
  candidates: readonly number[]
}
