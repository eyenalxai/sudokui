import { Schema } from "effect"

import { GRID_SIZE } from "./grid/constants.ts"
import { CellIndex, CellValue, Technique } from "./puzzle.ts"

export const TechniqueCellValue = Schema.Number.pipe(
  Schema.int(),
  Schema.between(1, GRID_SIZE),
  Schema.brand("TechniqueCellValue"),
)
export type TechniqueCellValue = typeof TechniqueCellValue.Type

export const toCellValue = (value: TechniqueCellValue): CellValue =>
  Schema.decodeSync(CellValue)(value)

export const CellElimination = Schema.Struct({
  index: CellIndex,
  values: Schema.Array(TechniqueCellValue),
})
export type CellElimination = typeof CellElimination.Type

export const TechniqueMove = Schema.Struct({
  technique: Technique,
  cellIndex: CellIndex,
  value: TechniqueCellValue,
  eliminations: Schema.Array(CellElimination),
})
export type TechniqueMove = typeof TechniqueMove.Type
