import type { CellData, NakedTechnique } from "./utils.ts"
import { Effect, Option, ParseResult } from "effect"

import { getCandidatesArray } from "../../grid/candidates.ts"
import { SudokuGrid } from "../../grid/sudoku-grid.ts"
import { TechniqueMove } from "../../technique.ts"
import {
  makeCellElimination,
  makeCellIndex,
  makeCellValue,
  type RawElimination,
} from "../helpers.ts"

import { getCombinations } from "./utils.ts"

/**
 * Collect eliminations for naked subset technique
 */
const collectEliminations = (
  grid: SudokuGrid,
  unitIndices: readonly number[],
  subsetIndices: number[],
  subsetValues: number[],
): RawElimination[] => {
  const eliminations: RawElimination[] = []

  for (const idx of unitIndices) {
    if (grid.getCell(idx) === 0 && !subsetIndices.includes(idx)) {
      const cellCandidates = getCandidatesArray(grid.getCandidates(idx))
      const valuesToEliminate = cellCandidates.filter((c) => subsetValues.includes(c))

      if (valuesToEliminate.length > 0) {
        eliminations.push({ index: idx, values: valuesToEliminate })
      }
    }
  }

  return eliminations
}

/**
 * Naked Subsets: Find n cells in a unit that together contain exactly n candidates
 */
export const findNakedSubsetInUnit = (
  grid: SudokuGrid,
  unitIndices: readonly number[],
  size: 2 | 3 | 4,
  technique: NakedTechnique,
): Effect.Effect<Option.Option<TechniqueMove>, ParseResult.ParseError> =>
  Effect.gen(function* () {
    const candidateCells: CellData[] = []

    for (const idx of unitIndices) {
      if (grid.getCell(idx) === 0) {
        const candidates = getCandidatesArray(grid.getCandidates(idx))
        if (candidates.length > 0 && candidates.length <= size) {
          candidateCells.push({ index: idx, candidates })
        }
      }
    }

    if (candidateCells.length < size) return Option.none()

    const combinations = getCombinations(candidateCells, size)

    for (const combo of combinations) {
      const unionCandidates = new Set<number>()
      const indices: number[] = []

      for (const cell of combo) {
        indices.push(cell.index)
        for (const c of cell.candidates) {
          unionCandidates.add(c)
        }
      }

      if (unionCandidates.size !== size) continue

      const values = Array.from(unionCandidates)
      const eliminations = collectEliminations(grid, unitIndices, indices, values)

      if (eliminations.length > 0 && values[0] !== undefined && indices[0] !== undefined) {
        return Option.some({
          technique,
          cellIndex: yield* makeCellIndex(indices[0]),
          value: yield* makeCellValue(values[0]),
          eliminations: yield* Effect.forEach(eliminations, makeCellElimination),
        })
      }
    }

    return Option.none()
  })
