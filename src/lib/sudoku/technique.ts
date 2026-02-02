import { Schema } from "effect"

import { GRID_SIZE } from "./grid/constants.ts"

export const Technique = Schema.Literal(
  "FULL_HOUSE",
  "NAKED_SINGLE",
  "HIDDEN_SINGLE",
  "LOCKED_PAIR",
  "LOCKED_TRIPLE",
  "LOCKED_CANDIDATES",
  "NAKED_PAIR",
  "NAKED_TRIPLE",
  "NAKED_QUADRUPLE",
  "HIDDEN_PAIR",
  "HIDDEN_TRIPLE",
  "HIDDEN_QUADRUPLE",
)

export type Technique = typeof Technique.Type

export const CellIndex = Schema.Number.pipe(
  Schema.int(),
  Schema.between(0, 80),
  Schema.brand("CellIndex"),
)
export type CellIndex = typeof CellIndex.Type

export const CellValue = Schema.Number.pipe(
  Schema.int(),
  Schema.between(1, GRID_SIZE),
  Schema.brand("CellValue"),
)
export type CellValue = typeof CellValue.Type

export const CellElimination = Schema.Struct({
  index: CellIndex,
  values: Schema.Array(CellValue),
})
export type CellElimination = typeof CellElimination.Type

export const TechniqueMove = Schema.Struct({
  technique: Technique,
  cellIndex: CellIndex,
  value: CellValue,
  eliminations: Schema.Array(CellElimination),
})
export type TechniqueMove = typeof TechniqueMove.Type
