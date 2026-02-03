import { Effect, Option } from "effect"

import { getPeers } from "../../grid/helpers.ts"
import { SudokuGrid } from "../../grid/sudoku-grid.ts"

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

const findSkyscraperEliminations = Effect.fn("Skyscraper.findEliminations")(function* (
  grid: SudokuGrid,
  end1: number,
  end2: number,
  digit: number,
  mask: number,
) {
  const peers1 = new Set(getPeers(end1))
  const peers2 = new Set(getPeers(end2))

  const eliminations: RawElimination[] = []
  for (const peer of peers1) {
    if (peers2.has(peer) && grid.getCell(peer) === 0 && (grid.getCandidates(peer) & mask) !== 0) {
      eliminations.push({ index: peer, values: [digit] })
    }
  }

  if (eliminations.length > 0) {
    return Option.some({
      technique: "SKYSCRAPER" as const,
      cellIndex: yield* makeCellIndex(end1),
      value: yield* makeCellValue(digit),
      eliminations: yield* Effect.forEach(eliminations, makeCellElimination),
    })
  }

  return Option.none()
})

const findSkyscraperInRows = Effect.fn("Skyscraper.findInRows")(function* (grid: SudokuGrid) {
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

        let sharedCol = false
        let otherIdx1 = idx1b
        let otherIdx2 = idx2b

        if (sameCol(idx1a, idx2a)) {
          sharedCol = true
          otherIdx1 = idx1b
          otherIdx2 = idx2b
        } else if (sameCol(idx1a, idx2b)) {
          sharedCol = true
          otherIdx1 = idx1b
          otherIdx2 = idx2a
        } else if (sameCol(idx1b, idx2a)) {
          sharedCol = true
          otherIdx1 = idx1a
          otherIdx2 = idx2b
        } else if (sameCol(idx1b, idx2b)) {
          sharedCol = true
          otherIdx1 = idx1a
          otherIdx2 = idx2a
        }

        if (!sharedCol) continue
        if (sameCol(otherIdx1, otherIdx2)) continue

        const result = yield* findSkyscraperEliminations(grid, otherIdx1, otherIdx2, digit, mask)
        if (Option.isSome(result)) return result
      }
    }
  }

  return Option.none()
})

const findSkyscraperInCols = Effect.fn("Skyscraper.findInCols")(function* (grid: SudokuGrid) {
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

        let sharedRow = false
        let otherIdx1 = idx1b
        let otherIdx2 = idx2b

        if (sameRow(idx1a, idx2a)) {
          sharedRow = true
          otherIdx1 = idx1b
          otherIdx2 = idx2b
        } else if (sameRow(idx1a, idx2b)) {
          sharedRow = true
          otherIdx1 = idx1b
          otherIdx2 = idx2a
        } else if (sameRow(idx1b, idx2a)) {
          sharedRow = true
          otherIdx1 = idx1a
          otherIdx2 = idx2b
        } else if (sameRow(idx1b, idx2b)) {
          sharedRow = true
          otherIdx1 = idx1a
          otherIdx2 = idx2a
        }

        if (!sharedRow) continue
        if (sameRow(otherIdx1, otherIdx2)) continue

        const result = yield* findSkyscraperEliminations(grid, otherIdx1, otherIdx2, digit, mask)
        if (Option.isSome(result)) return result
      }
    }
  }

  return Option.none()
})

export const findSkyscraper = Effect.fn("TechniqueFinder.findSkyscraper")(function* (
  grid: SudokuGrid,
) {
  const rowResult = yield* findSkyscraperInRows(grid)
  if (Option.isSome(rowResult)) return rowResult

  return yield* findSkyscraperInCols(grid)
})
