import { Schema } from "effect"

import { SudokuGrid } from "../grid/class.ts"
import { BLOCK_SIZE, CANDIDATE_MASKS, GRID_SIZE } from "../grid/constants.ts"
import { getBlockIndices } from "../grid/helpers.ts"
import { CellElimination, CellIndex, CellValue, TechniqueMove } from "../technique.ts"

const makeCellIndex = (n: number): CellIndex => Schema.decodeUnknownSync(CellIndex)(n)
const makeCellValue = (n: number): CellValue => Schema.decodeUnknownSync(CellValue)(n)
const makeCellElimination = (index: number, values: readonly number[]): CellElimination => ({
  index: makeCellIndex(index),
  values: values.map((v) => makeCellValue(v)),
})

const getMask = (value: number): number => CANDIDATE_MASKS[value] ?? 0
const BLOCK_AREA = GRID_SIZE * BLOCK_SIZE

/**
 * Pointing Pairs/Triples (LOCKED_PAIR, LOCKED_TRIPLE)
 * When a candidate is confined to one row or column within a box,
 * it can be eliminated from that row or column outside the box.
 */
const findPointingInBox = (grid: SudokuGrid, boxStartIndex: number): TechniqueMove | null => {
  const boxIndices = getBlockIndices(boxStartIndex)

  for (let value = 1; value <= GRID_SIZE; value++) {
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

    const row = Math.floor(firstCell / GRID_SIZE)
    const allInSameRow = cellsWithCandidate.every((idx) => Math.floor(idx / GRID_SIZE) === row)

    if (allInSameRow) {
      const eliminations: CellElimination[] = []
      const boxCol = Math.floor((boxStartIndex % GRID_SIZE) / BLOCK_SIZE)

      for (let c = 0; c < GRID_SIZE; c++) {
        const idx = row * GRID_SIZE + c
        if (grid.getCell(idx) !== 0) continue
        if (Math.floor((idx % GRID_SIZE) / BLOCK_SIZE) === boxCol) continue
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

    const col = firstCell % GRID_SIZE
    const allInSameCol = cellsWithCandidate.every((idx) => idx % GRID_SIZE === col)

    if (allInSameCol) {
      const eliminations: CellElimination[] = []
      const boxRow = Math.floor(boxStartIndex / BLOCK_AREA)

      for (let r = 0; r < GRID_SIZE; r++) {
        const idx = r * GRID_SIZE + col
        if (grid.getCell(idx) !== 0) continue
        if (Math.floor(idx / BLOCK_AREA) === boxRow) continue
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
  for (let value = 1; value <= GRID_SIZE; value++) {
    const mask = getMask(value)
    if (mask === 0) continue

    const cellsWithCandidate: number[] = []

    for (let c = 0; c < GRID_SIZE; c++) {
      const idx = row * GRID_SIZE + c
      if (grid.getCell(idx) === 0 && (grid.getCandidates(idx) & mask) !== 0) {
        cellsWithCandidate.push(idx)
      }
    }

    if (cellsWithCandidate.length === 0) continue

    const firstCell = cellsWithCandidate[0]
    if (firstCell === undefined) continue

    const boxStart =
      Math.floor(firstCell / BLOCK_AREA) * BLOCK_AREA +
      Math.floor((firstCell % GRID_SIZE) / BLOCK_SIZE) * BLOCK_SIZE
    const allInSameBox = cellsWithCandidate.every((idx) => {
      const cellBoxStart =
        Math.floor(idx / BLOCK_AREA) * BLOCK_AREA +
        Math.floor((idx % GRID_SIZE) / BLOCK_SIZE) * BLOCK_SIZE
      return cellBoxStart === boxStart
    })

    if (!allInSameBox) continue

    const eliminations: CellElimination[] = []
    const boxIndices = getBlockIndices(firstCell)

    for (const idx of boxIndices) {
      if (grid.getCell(idx) !== 0) continue
      if (Math.floor(idx / GRID_SIZE) === row) continue
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
  for (let value = 1; value <= GRID_SIZE; value++) {
    const mask = getMask(value)
    if (mask === 0) continue

    const cellsWithCandidate: number[] = []

    for (let r = 0; r < GRID_SIZE; r++) {
      const idx = r * GRID_SIZE + col
      if (grid.getCell(idx) === 0 && (grid.getCandidates(idx) & mask) !== 0) {
        cellsWithCandidate.push(idx)
      }
    }

    if (cellsWithCandidate.length === 0) continue

    const firstCell = cellsWithCandidate[0]
    if (firstCell === undefined) continue

    const boxStart =
      Math.floor(firstCell / BLOCK_AREA) * BLOCK_AREA + Math.floor(col / BLOCK_SIZE) * BLOCK_SIZE
    const allInSameBox = cellsWithCandidate.every((idx) => {
      const cellBoxStart =
        Math.floor(idx / BLOCK_AREA) * BLOCK_AREA +
        Math.floor((idx % GRID_SIZE) / BLOCK_SIZE) * BLOCK_SIZE
      return cellBoxStart === boxStart
    })

    if (!allInSameBox) continue

    const eliminations: CellElimination[] = []
    const boxIndices = getBlockIndices(firstCell)

    for (const idx of boxIndices) {
      if (grid.getCell(idx) !== 0) continue
      if (idx % GRID_SIZE === col) continue
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
  for (let blockRow = 0; blockRow < BLOCK_SIZE; blockRow++) {
    for (let blockCol = 0; blockCol < BLOCK_SIZE; blockCol++) {
      const boxStartIndex = blockRow * BLOCK_AREA + blockCol * BLOCK_SIZE
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
  for (let row = 0; row < GRID_SIZE; row++) {
    const result = findBoxLineReductionInRow(grid, row)
    if (result !== null) return result
  }

  for (let col = 0; col < GRID_SIZE; col++) {
    const result = findBoxLineReductionInCol(grid, col)
    if (result !== null) return result
  }

  return null
}
