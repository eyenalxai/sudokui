import { Schema } from "effect"

import { SudokuGrid } from "../grid/class.ts"
import { CANDIDATE_MASKS } from "../grid/constants.ts"
import { getBlockIndices } from "../grid/helpers.ts"
import { CellElimination, CellIndex, CellValue, TechniqueMove } from "../technique.ts"

const makeCellIndex = (n: number): CellIndex => Schema.decodeUnknownSync(CellIndex)(n)
const makeCellValue = (n: number): CellValue => Schema.decodeUnknownSync(CellValue)(n)
const makeCellElimination = (index: number, values: readonly number[]): CellElimination => ({
  index: makeCellIndex(index),
  values: values.map((v) => makeCellValue(v)),
})

const getMask = (value: number): number => CANDIDATE_MASKS[value] ?? 0

/**
 * Pointing Pairs/Triples (LOCKED_PAIR, LOCKED_TRIPLE)
 * When a candidate is confined to one row or column within a box,
 * it can be eliminated from that row or column outside the box.
 */
const findPointingInBox = (grid: SudokuGrid, boxStartIndex: number): TechniqueMove | null => {
  const boxIndices = [
    boxStartIndex,
    boxStartIndex + 1,
    boxStartIndex + 2,
    boxStartIndex + 9,
    boxStartIndex + 10,
    boxStartIndex + 11,
    boxStartIndex + 18,
    boxStartIndex + 19,
    boxStartIndex + 20,
  ]

  for (let value = 1; value <= 9; value++) {
    const mask = getMask(value)
    if (mask === 0) continue

    const cellsWithCandidate: number[] = []

    for (const idx of boxIndices) {
      if (grid.getCell(idx) === 0) {
        const candidates = grid.getCandidates(idx)
        if ((candidates & mask) !== 0) {
          cellsWithCandidate.push(idx)
        }
      }
    }

    if (cellsWithCandidate.length < 2 || cellsWithCandidate.length > 3) continue

    const firstCell = cellsWithCandidate[0]
    if (firstCell === undefined) continue

    const row = Math.floor(firstCell / 9)
    const allInSameRow = cellsWithCandidate.every((idx) => Math.floor(idx / 9) === row)

    if (allInSameRow) {
      const eliminations: CellElimination[] = []
      const boxRow = Math.floor(boxStartIndex / 27)

      for (let c = 0; c < 9; c++) {
        const idx = row * 9 + c
        if (grid.getCell(idx) !== 0) continue
        if (Math.floor(idx / 27) === boxRow) continue
        if (cellsWithCandidate.includes(idx)) continue

        const candidates = grid.getCandidates(idx)
        if ((candidates & mask) !== 0) {
          eliminations.push(makeCellElimination(idx, [value]))
        }
      }

      if (eliminations.length > 0) {
        return {
          technique: cellsWithCandidate.length === 2 ? "LOCKED_PAIR" : "LOCKED_TRIPLE",
          cellIndex: makeCellIndex(firstCell),
          value: makeCellValue(value),
          eliminations,
        }
      }
    }

    const col = firstCell % 9
    const allInSameCol = cellsWithCandidate.every((idx) => idx % 9 === col)

    if (allInSameCol) {
      const eliminations: CellElimination[] = []
      const boxCol = Math.floor((boxStartIndex % 9) / 3)

      for (let r = 0; r < 9; r++) {
        const idx = r * 9 + col
        if (grid.getCell(idx) !== 0) continue
        if (Math.floor((idx % 9) / 3) === boxCol) continue
        if (cellsWithCandidate.includes(idx)) continue

        const candidates = grid.getCandidates(idx)
        if ((candidates & mask) !== 0) {
          eliminations.push(makeCellElimination(idx, [value]))
        }
      }

      if (eliminations.length > 0) {
        return {
          technique: cellsWithCandidate.length === 2 ? "LOCKED_PAIR" : "LOCKED_TRIPLE",
          cellIndex: makeCellIndex(firstCell),
          value: makeCellValue(value),
          eliminations,
        }
      }
    }
  }

  return null
}

/**
 * Box/Line Reduction (LOCKED_CANDIDATES)
 * When all occurrences of a candidate in a row or column are confined to one box,
 * the candidate can be eliminated from the rest of that box.
 */
const findBoxLineReductionInRow = (grid: SudokuGrid, row: number): TechniqueMove | null => {
  for (let value = 1; value <= 9; value++) {
    const mask = getMask(value)
    if (mask === 0) continue

    const cellsWithCandidate: number[] = []

    for (let c = 0; c < 9; c++) {
      const idx = row * 9 + c
      if (grid.getCell(idx) === 0 && (grid.getCandidates(idx) & mask) !== 0) {
        cellsWithCandidate.push(idx)
      }
    }

    if (cellsWithCandidate.length === 0) continue

    const firstCell = cellsWithCandidate[0]
    if (firstCell === undefined) continue

    const boxStart = Math.floor(firstCell / 27) * 27 + Math.floor((firstCell % 9) / 3) * 3
    const allInSameBox = cellsWithCandidate.every((idx) => {
      const cellBoxStart = Math.floor(idx / 27) * 27 + Math.floor((idx % 9) / 3) * 3
      return cellBoxStart === boxStart
    })

    if (!allInSameBox) continue

    const eliminations: CellElimination[] = []
    const boxIndices = getBlockIndices(firstCell)

    for (const idx of boxIndices) {
      if (grid.getCell(idx) !== 0) continue
      if (Math.floor(idx / 9) === row) continue
      if (cellsWithCandidate.includes(idx)) continue

      if ((grid.getCandidates(idx) & mask) !== 0) {
        eliminations.push(makeCellElimination(idx, [value]))
      }
    }

    if (eliminations.length > 0) {
      return {
        technique: "LOCKED_CANDIDATES",
        cellIndex: makeCellIndex(firstCell),
        value: makeCellValue(value),
        eliminations,
      }
    }
  }

  return null
}

const findBoxLineReductionInCol = (grid: SudokuGrid, col: number): TechniqueMove | null => {
  for (let value = 1; value <= 9; value++) {
    const mask = getMask(value)
    if (mask === 0) continue

    const cellsWithCandidate: number[] = []

    for (let r = 0; r < 9; r++) {
      const idx = r * 9 + col
      if (grid.getCell(idx) === 0 && (grid.getCandidates(idx) & mask) !== 0) {
        cellsWithCandidate.push(idx)
      }
    }

    if (cellsWithCandidate.length === 0) continue

    const firstCell = cellsWithCandidate[0]
    if (firstCell === undefined) continue

    const boxStart = Math.floor(firstCell / 27) * 27 + Math.floor(col / 3) * 3
    const allInSameBox = cellsWithCandidate.every((idx) => {
      const cellBoxStart = Math.floor(idx / 27) * 27 + Math.floor((idx % 9) / 3) * 3
      return cellBoxStart === boxStart
    })

    if (!allInSameBox) continue

    const eliminations: CellElimination[] = []
    const boxIndices = getBlockIndices(firstCell)

    for (const idx of boxIndices) {
      if (grid.getCell(idx) !== 0) continue
      if (idx % 9 === col) continue
      if (cellsWithCandidate.includes(idx)) continue

      if ((grid.getCandidates(idx) & mask) !== 0) {
        eliminations.push(makeCellElimination(idx, [value]))
      }
    }

    if (eliminations.length > 0) {
      return {
        technique: "LOCKED_CANDIDATES",
        cellIndex: makeCellIndex(firstCell),
        value: makeCellValue(value),
        eliminations,
      }
    }
  }

  return null
}

/**
 * Find Pointing Pairs or Triples in any box.
 * When a candidate appears in only 2 or 3 cells within a box, and those cells
 * are all in the same row or column, the candidate can be eliminated from
 * that row or column outside the box.
 */
export const findPointingCandidates = (grid: SudokuGrid): TechniqueMove | null => {
  for (let blockRow = 0; blockRow < 3; blockRow++) {
    for (let blockCol = 0; blockCol < 3; blockCol++) {
      const boxStartIndex = blockRow * 27 + blockCol * 3
      const result = findPointingInBox(grid, boxStartIndex)
      if (result !== null) return result
    }
  }
  return null
}

/**
 * Find Box/Line Reduction (locked candidates) in rows and columns.
 * When all occurrences of a candidate in a row or column are confined to one box,
 * the candidate can be eliminated from the rest of that box.
 */
export const findLockedCandidates = (grid: SudokuGrid): TechniqueMove | null => {
  for (let row = 0; row < 9; row++) {
    const result = findBoxLineReductionInRow(grid, row)
    if (result !== null) return result
  }

  for (let col = 0; col < 9; col++) {
    const result = findBoxLineReductionInCol(grid, col)
    if (result !== null) return result
  }

  return null
}
