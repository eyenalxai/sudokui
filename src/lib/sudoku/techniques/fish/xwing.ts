import { Effect, Option } from "effect"

import { GRID_SIZE } from "../../grid/constants.ts"
import { SudokuGrid } from "../../grid/sudoku-grid.ts"
import { TechniqueMove } from "../../technique.ts"

import {
  findColsWithNCandidates,
  findRowsWithNCandidates,
  getMask,
  makeCellElimination,
  makeCellIndex,
  makeCellValue,
  sameCol,
  sameRow,
  type RawElimination,
} from "./helpers.ts"

const findXWingEliminationsInCols = Effect.fn("XWing.findEliminationsInCols")(function* (
  grid: SudokuGrid,
  digit: number,
  mask: number,
  xWingCells: number[],
  col1: number,
  col2: number,
) {
  const eliminations: RawElimination[] = []
  const xWingSet = new Set(xWingCells)

  for (let row = 0; row < GRID_SIZE; row++) {
    const idx1 = row * GRID_SIZE + col1
    const idx2 = row * GRID_SIZE + col2

    if (
      !xWingSet.has(idx1) &&
      grid.getCell(idx1) === 0 &&
      (grid.getCandidates(idx1) & mask) !== 0
    ) {
      eliminations.push({ index: idx1, values: [digit] })
    }
    if (
      !xWingSet.has(idx2) &&
      grid.getCell(idx2) === 0 &&
      (grid.getCandidates(idx2) & mask) !== 0
    ) {
      eliminations.push({ index: idx2, values: [digit] })
    }
  }

  if (eliminations.length > 0 && xWingCells.length > 0) {
    const firstCell = xWingCells[0]
    if (firstCell === undefined) return Option.none()
    return Option.some<TechniqueMove>({
      technique: "X_WING",
      cellIndex: yield* makeCellIndex(firstCell),
      value: yield* makeCellValue(digit),
      eliminations: yield* Effect.forEach(eliminations, makeCellElimination),
    })
  }

  return Option.none()
})

const findXWingEliminationsInRows = Effect.fn("XWing.findEliminationsInRows")(function* (
  grid: SudokuGrid,
  digit: number,
  mask: number,
  xWingCells: number[],
  row1: number,
  row2: number,
) {
  const eliminations: RawElimination[] = []
  const xWingSet = new Set(xWingCells)

  for (let col = 0; col < GRID_SIZE; col++) {
    const idx1 = row1 * GRID_SIZE + col
    const idx2 = row2 * GRID_SIZE + col

    if (
      !xWingSet.has(idx1) &&
      grid.getCell(idx1) === 0 &&
      (grid.getCandidates(idx1) & mask) !== 0
    ) {
      eliminations.push({ index: idx1, values: [digit] })
    }
    if (
      !xWingSet.has(idx2) &&
      grid.getCell(idx2) === 0 &&
      (grid.getCandidates(idx2) & mask) !== 0
    ) {
      eliminations.push({ index: idx2, values: [digit] })
    }
  }

  if (eliminations.length > 0 && xWingCells.length > 0) {
    const firstCell = xWingCells[0]
    if (firstCell === undefined) return Option.none()
    return Option.some<TechniqueMove>({
      technique: "X_WING",
      cellIndex: yield* makeCellIndex(firstCell),
      value: yield* makeCellValue(digit),
      eliminations: yield* Effect.forEach(eliminations, makeCellElimination),
    })
  }

  return Option.none()
})

const findXWingInRows = Effect.fn("XWing.findInRows")(function* (grid: SudokuGrid) {
  for (let digit = 1; digit <= 9; digit++) {
    const mask = getMask(digit)
    if (mask === 0) continue

    const rowsWith2 = findRowsWithNCandidates(grid, digit, 2)
    if (rowsWith2.length < 2) continue

    for (let i = 0; i < rowsWith2.length; i++) {
      for (let j = i + 1; j < rowsWith2.length; j++) {
        const rowPair1 = rowsWith2[i]
        const rowPair2 = rowsWith2[j]
        if (rowPair1 === undefined || rowPair2 === undefined) continue
        const [_row1, idx1a, idx1b] = rowPair1
        const [_row2, idx2a, idx2b] = rowPair2

        let colA = -1,
          colB = -1
        let isXWing = false

        if (sameCol(idx1a, idx2a) && sameCol(idx1b, idx2b)) {
          isXWing = true
          colA = idx1a % GRID_SIZE
          colB = idx1b % GRID_SIZE
        } else if (sameCol(idx1a, idx2b) && sameCol(idx1b, idx2a)) {
          isXWing = true
          colA = idx1a % GRID_SIZE
          colB = idx1b % GRID_SIZE
        }

        if (!isXWing || colA < 0 || colB < 0) continue

        const result = yield* findXWingEliminationsInCols(
          grid,
          digit,
          mask,
          [idx1a, idx1b, idx2a, idx2b],
          colA,
          colB,
        )
        if (Option.isSome(result)) return result
      }
    }
  }

  return Option.none()
})

const findXWingInCols = Effect.fn("XWing.findInCols")(function* (grid: SudokuGrid) {
  for (let digit = 1; digit <= 9; digit++) {
    const mask = getMask(digit)
    if (mask === 0) continue

    const colsWith2 = findColsWithNCandidates(grid, digit, 2)
    if (colsWith2.length < 2) continue

    for (let i = 0; i < colsWith2.length; i++) {
      for (let j = i + 1; j < colsWith2.length; j++) {
        const colPair1 = colsWith2[i]
        const colPair2 = colsWith2[j]
        if (colPair1 === undefined || colPair2 === undefined) continue
        const [_col1, idx1a, idx1b] = colPair1
        const [_col2, idx2a, idx2b] = colPair2

        let rowA = -1,
          rowB = -1
        let isXWing = false

        if (sameRow(idx1a, idx2a) && sameRow(idx1b, idx2b)) {
          isXWing = true
          rowA = Math.floor(idx1a / GRID_SIZE)
          rowB = Math.floor(idx1b / GRID_SIZE)
        } else if (sameRow(idx1a, idx2b) && sameRow(idx1b, idx2a)) {
          isXWing = true
          rowA = Math.floor(idx1a / GRID_SIZE)
          rowB = Math.floor(idx1b / GRID_SIZE)
        }

        if (!isXWing || rowA < 0 || rowB < 0) continue

        const result = yield* findXWingEliminationsInRows(
          grid,
          digit,
          mask,
          [idx1a, idx1b, idx2a, idx2b],
          rowA,
          rowB,
        )
        if (Option.isSome(result)) return result
      }
    }
  }

  return Option.none()
})

export const findXWing = Effect.fn("TechniqueFinder.findXWing")(function* (grid: SudokuGrid) {
  const rowResult = yield* findXWingInRows(grid)
  if (Option.isSome(rowResult)) return rowResult

  return yield* findXWingInCols(grid)
})
