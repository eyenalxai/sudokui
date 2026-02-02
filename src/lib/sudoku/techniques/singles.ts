import { Schema } from "effect"

import { countCandidates, getSingleCandidate } from "../grid/candidates.ts"
import { SudokuGrid } from "../grid/class.ts"
import { CANDIDATE_MASKS } from "../grid/constants.ts"
import { getRowIndices, getColIndices, getBlockIndices } from "../grid/helpers.ts"
import { CellIndex, CellValue, TechniqueMove } from "../technique.ts"

const makeCellIndex = (n: number): CellIndex => Schema.decodeUnknownSync(CellIndex)(n)
const makeCellValue = (n: number): CellValue => Schema.decodeUnknownSync(CellValue)(n)

const getMissingValueInUnit = (grid: SudokuGrid, indices: readonly number[]): CellValue | null => {
  const present = new Set<number>()
  let emptyIndex: number | null = null

  for (const idx of indices) {
    const value = grid.getCell(idx)
    if (value === 0) {
      if (emptyIndex !== null) {
        return null
      }
      emptyIndex = idx
    } else {
      present.add(value)
    }
  }

  if (emptyIndex === null || present.size !== 8) {
    return null
  }

  for (let v = 1; v <= 9; v++) {
    if (!present.has(v)) {
      return makeCellValue(v)
    }
  }

  return null
}

export const findFullHouse = (grid: SudokuGrid): TechniqueMove | null => {
  for (let i = 0; i < 81; i++) {
    if (grid.getCell(i) !== 0) continue

    const units = [getRowIndices(i), getColIndices(i), getBlockIndices(i)]

    for (const unit of units) {
      const missingValue = getMissingValueInUnit(grid, unit)
      if (missingValue !== null) {
        return {
          technique: "FULL_HOUSE",
          cellIndex: makeCellIndex(i),
          value: missingValue,
          eliminations: [],
        }
      }
    }
  }

  return null
}

export const findNakedSingle = (grid: SudokuGrid): TechniqueMove | null => {
  for (let i = 0; i < 81; i++) {
    if (grid.getCell(i) !== 0) continue

    const candidates = grid.getCandidates(i)
    if (countCandidates(candidates) === 1) {
      const value = getSingleCandidate(candidates)
      if (value !== null) {
        return {
          technique: "NAKED_SINGLE",
          cellIndex: makeCellIndex(i),
          value: makeCellValue(value),
          eliminations: [],
        }
      }
    }
  }

  return null
}

const findHiddenSingleInUnit = (
  grid: SudokuGrid,
  indices: readonly number[],
): TechniqueMove | null => {
  const candidatePositions = new Map<number, number>()

  for (const idx of indices) {
    if (grid.getCell(idx) !== 0) continue

    const candidates = grid.getCandidates(idx)
    for (let v = 1; v <= 9; v++) {
      const mask = CANDIDATE_MASKS[v]
      if (mask !== undefined && (candidates & mask) !== 0) {
        if (candidatePositions.has(v)) {
          candidatePositions.set(v, -1)
        } else {
          candidatePositions.set(v, idx)
        }
      }
    }
  }

  for (const [value, idx] of candidatePositions) {
    if (idx !== -1) {
      return {
        technique: "HIDDEN_SINGLE",
        cellIndex: makeCellIndex(idx),
        value: makeCellValue(value),
        eliminations: [],
      }
    }
  }

  return null
}

export const findHiddenSingle = (grid: SudokuGrid): TechniqueMove | null => {
  for (let i = 0; i < 9; i++) {
    const rowStart = i * 9
    const rowIndices = Array.from({ length: 9 }, (_, j) => rowStart + j)
    const rowMove = findHiddenSingleInUnit(grid, rowIndices)
    if (rowMove !== null) return rowMove

    const colIndices = Array.from({ length: 9 }, (_, j) => j * 9 + i)
    const colMove = findHiddenSingleInUnit(grid, colIndices)
    if (colMove !== null) return colMove
  }

  for (let blockRow = 0; blockRow < 3; blockRow++) {
    for (let blockCol = 0; blockCol < 3; blockCol++) {
      const startIndex = blockRow * 27 + blockCol * 3
      const blockIndices = [
        startIndex,
        startIndex + 1,
        startIndex + 2,
        startIndex + 9,
        startIndex + 10,
        startIndex + 11,
        startIndex + 18,
        startIndex + 19,
        startIndex + 20,
      ]
      const blockMove = findHiddenSingleInUnit(grid, blockIndices)
      if (blockMove !== null) return blockMove
    }
  }

  return null
}
