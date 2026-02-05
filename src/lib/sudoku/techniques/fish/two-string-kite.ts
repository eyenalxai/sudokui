import { Effect, Option } from "effect"

import { GRID_SIZE } from "../../grid/constants.ts"
import { indexToBlock, indexToCol, indexToRow } from "../../grid/helpers.ts"
import { SudokuGrid } from "../../grid/sudoku-grid.ts"
import { TechniqueMove } from "../../technique.ts"
import { getMask, makeCellElimination, makeCellIndex, makeCellValue } from "../helpers.ts"

import { findColsWithNCandidates, findRowsWithNCandidates } from "./helpers.ts"

/**
 * TWO-STRING-KITE
 *
 * Algorithm based on Hodoku:
 * 1. Find all rows with exactly 2 cells containing a candidate (strong link in row)
 * 2. Find all columns with exactly 2 cells containing a candidate (strong link in column)
 * 3. For each row/col pair, check if one cell from each shares a box
 * 4. After finding a box connection, swap elements so that:
 *    - indices[0] for both row and col are the cells in the connecting box
 *    - indices[1] for both are the "free ends"
 * 5. Check all 4 cells are distinct
 * 6. Elimination is at the intersection of row's free end row and col's free end column
 */
export const findTwoStringKite = Effect.fn("TechniqueFinder.findTwoStringKite")(function* (
  grid: SudokuGrid,
) {
  for (let digit = 1; digit <= GRID_SIZE; digit++) {
    const mask = getMask(digit)
    if (mask === 0) continue

    // Get all rows with exactly 2 candidates
    const rowsWith2 = findRowsWithNCandidates(grid, digit, 2)
    // Get all columns with exactly 2 candidates
    const colsWith2 = findColsWithNCandidates(grid, digit, 2)

    if (rowsWith2.length === 0 || colsWith2.length === 0) continue

    // Try all combinations of rows and columns
    for (const rowPair of rowsWith2) {
      for (const colPair of colsWith2) {
        // Make mutable copies since we need to swap
        let [, rowCellA, rowCellB] = rowPair
        let [, colCellA, colCellB] = colPair

        // Check if any combination shares a box and swap accordingly
        // Hodoku logic: ensure indices[0] are in the box, indices[1] are free ends
        let found = false

        if (indexToBlock(rowCellA) === indexToBlock(colCellA)) {
          // rowCellA and colCellA are in the same box - perfect as is
          found = true
        } else if (indexToBlock(rowCellA) === indexToBlock(colCellB)) {
          // rowCellA and colCellB are in the same box - swap col cells
          const tmp = colCellA
          colCellA = colCellB
          colCellB = tmp
          found = true
        } else if (indexToBlock(rowCellB) === indexToBlock(colCellA)) {
          // rowCellB and colCellA are in the same box - swap row cells
          const tmp = rowCellA
          rowCellA = rowCellB
          rowCellB = tmp
          found = true
        } else if (indexToBlock(rowCellB) === indexToBlock(colCellB)) {
          // rowCellB and colCellB are in the same box - swap both
          let tmp = rowCellA
          rowCellA = rowCellB
          rowCellB = tmp
          tmp = colCellA
          colCellA = colCellB
          colCellB = tmp
          found = true
        }

        if (!found) continue

        // Now:
        // rowCellA and colCellA are in the connecting box
        // rowCellB is the free end of the row
        // colCellB is the free end of the column

        // All 4 cells must be distinct
        if (
          rowCellA === colCellA ||
          rowCellA === rowCellB ||
          rowCellA === colCellB ||
          colCellA === rowCellB ||
          colCellA === colCellB ||
          rowCellB === colCellB
        ) {
          continue
        }

        // The elimination is at the intersection of:
        // - row of col's free end (colCellB)
        // - column of row's free end (rowCellB)
        const crossRow = indexToRow(colCellB)
        const crossCol = indexToCol(rowCellB)
        const crossIndex = crossRow * GRID_SIZE + crossCol

        // Check if the cross cell has the candidate
        if (grid.getCell(crossIndex) === 0 && (grid.getCandidates(crossIndex) & mask) !== 0) {
          return Option.some<TechniqueMove>({
            technique: "TWO_STRING_KITE",
            cellIndex: yield* makeCellIndex(rowCellB),
            value: yield* makeCellValue(digit),
            eliminations: yield* Effect.forEach(
              [{ index: crossIndex, values: [digit] }],
              makeCellElimination,
            ),
          })
        }
      }
    }
  }

  return Option.none()
})
