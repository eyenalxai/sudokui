import type { CellData, HiddenTechnique, RawElimination } from "./utils.ts"
import { Effect, Option, ParseResult } from "effect"

import { getCandidatesArray } from "../../grid/candidates.ts"
import { SudokuGrid } from "../../grid/class.ts"
import { GRID_SIZE } from "../../grid/constants.ts"
import { TechniqueMove } from "../../technique.ts"

import { getCombinations, makeCellElimination, makeCellIndex, makeCellValue } from "./utils.ts"

/**
 * Hidden Subsets: Find n values that appear in only n cells within a unit
 */
export const findHiddenSubsetInUnit = (
  grid: SudokuGrid,
  unitIndices: readonly number[],
  size: 2 | 3 | 4,
  technique: HiddenTechnique,
): Effect.Effect<Option.Option<TechniqueMove>, ParseResult.ParseError> =>
  Effect.gen(function* () {
    const emptyCells: CellData[] = []

    for (const idx of unitIndices) {
      if (grid.getCell(idx) === 0) {
        const candidates = getCandidatesArray(grid.getCandidates(idx))
        if (candidates.length > 0) {
          emptyCells.push({ index: idx, candidates })
        }
      }
    }

    if (emptyCells.length <= size) return Option.none()

    const valueCells = new Map<number, number[]>()

    for (let v = 1; v <= GRID_SIZE; v++) {
      const cellsWithValue: number[] = []

      for (const cell of emptyCells) {
        if (cell.candidates.includes(v)) {
          cellsWithValue.push(cell.index)
        }
      }

      if (cellsWithValue.length >= 2 && cellsWithValue.length <= size) {
        valueCells.set(v, cellsWithValue)
      }
    }

    if (valueCells.size < size) return Option.none()

    const values = Array.from(valueCells.keys())
    const combinations = getCombinations(values, size)

    for (const combo of combinations) {
      const unionCells = new Set<number>()

      for (const v of combo) {
        const cells = valueCells.get(v)
        if (cells) {
          for (const idx of cells) {
            unionCells.add(idx)
          }
        }
      }

      if (unionCells.size === size) {
        const indices = Array.from(unionCells)
        const eliminations: RawElimination[] = []

        for (const idx of indices) {
          const cellCandidates = getCandidatesArray(grid.getCandidates(idx))
          const valuesToEliminate = cellCandidates.filter((c) => !combo.includes(c))

          if (valuesToEliminate.length > 0) {
            eliminations.push({ index: idx, values: valuesToEliminate })
          }
        }

        const firstIndex = indices[0]
        const firstValue = combo[0]

        if (eliminations.length > 0 && firstIndex !== undefined && firstValue !== undefined) {
          return Option.some({
            technique,
            cellIndex: yield* makeCellIndex(firstIndex),
            value: yield* makeCellValue(firstValue),
            eliminations: yield* Effect.forEach(eliminations, (elimination) =>
              makeCellElimination(elimination),
            ),
          })
        }
      }
    }

    return Option.none()
  })
