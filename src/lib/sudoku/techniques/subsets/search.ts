import type { HiddenTechnique, NakedTechnique } from "./utils.ts"
import { Effect, Option, ParseResult } from "effect"

import { BLOCK_SIZE, GRID_SIZE } from "../../grid/constants.ts"
import { getBlockIndices, getColIndices, getRowIndices } from "../../grid/helpers.ts"
import { SudokuGrid } from "../../grid/sudoku-grid.ts"
import { TechniqueMove } from "../../technique.ts"

import { findHiddenSubsetInUnit } from "./hidden.ts"
import { findNakedSubsetInUnit } from "./naked.ts"

const BLOCK_AREA = GRID_SIZE * BLOCK_SIZE

/**
 * Search for subset in all units
 */
export const findSubsetInAllUnits = (
  grid: SudokuGrid,
  size: 2 | 3 | 4,
  type: "naked" | "hidden",
): Effect.Effect<Option.Option<TechniqueMove>, ParseResult.ParseError> =>
  Effect.gen(function* () {
    const nakedTechniques: Record<number, NakedTechnique> = {
      2: "NAKED_PAIR",
      3: "NAKED_TRIPLE",
      4: "NAKED_QUADRUPLE",
    }

    const hiddenTechniques: Record<number, HiddenTechnique> = {
      2: "HIDDEN_PAIR",
      3: "HIDDEN_TRIPLE",
      4: "HIDDEN_QUADRUPLE",
    }

    if (type === "naked") {
      const technique = nakedTechniques[size]
      if (technique === undefined) return Option.none()

      for (let row = 0; row < GRID_SIZE; row++) {
        const result = yield* findNakedSubsetInUnit(
          grid,
          getRowIndices(row * GRID_SIZE),
          size,
          technique,
        )
        if (Option.isSome(result)) return result
      }

      for (let col = 0; col < GRID_SIZE; col++) {
        const result = yield* findNakedSubsetInUnit(grid, getColIndices(col), size, technique)
        if (Option.isSome(result)) return result
      }

      for (let blockRow = 0; blockRow < BLOCK_SIZE; blockRow++) {
        for (let blockCol = 0; blockCol < BLOCK_SIZE; blockCol++) {
          const result = yield* findNakedSubsetInUnit(
            grid,
            getBlockIndices(blockRow * BLOCK_AREA + blockCol * BLOCK_SIZE),
            size,
            technique,
          )
          if (Option.isSome(result)) return result
        }
      }
      return Option.none()
    }

    const technique = hiddenTechniques[size]
    if (technique === undefined) return Option.none()

    for (let row = 0; row < GRID_SIZE; row++) {
      const result = yield* findHiddenSubsetInUnit(
        grid,
        getRowIndices(row * GRID_SIZE),
        size,
        technique,
      )
      if (Option.isSome(result)) return result
    }

    for (let col = 0; col < GRID_SIZE; col++) {
      const result = yield* findHiddenSubsetInUnit(grid, getColIndices(col), size, technique)
      if (Option.isSome(result)) return result
    }

    for (let blockRow = 0; blockRow < BLOCK_SIZE; blockRow++) {
      for (let blockCol = 0; blockCol < BLOCK_SIZE; blockCol++) {
        const result = yield* findHiddenSubsetInUnit(
          grid,
          getBlockIndices(blockRow * BLOCK_AREA + blockCol * BLOCK_SIZE),
          size,
          technique,
        )
        if (Option.isSome(result)) return result
      }
    }

    return Option.none()
  })
