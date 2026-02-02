import { Schema } from "effect"

import { getCandidatesArray } from "../grid/candidates.ts"
import { SudokuGrid } from "../grid/class.ts"
import { BLOCK_SIZE, GRID_SIZE } from "../grid/constants.ts"
import { getBlockIndices, getColIndices, getRowIndices } from "../grid/helpers.ts"
import { CellElimination, CellIndex, CellValue, TechniqueMove } from "../technique.ts"

const makeCellIndex = (n: number): CellIndex => Schema.decodeUnknownSync(CellIndex)(n)
const makeCellValue = (n: number): CellValue => Schema.decodeUnknownSync(CellValue)(n)
const makeCellElimination = (index: number, values: readonly number[]): CellElimination => ({
  index: makeCellIndex(index),
  values: values.map((v) => makeCellValue(v)),
})
const BLOCK_AREA = GRID_SIZE * BLOCK_SIZE

type NakedTechnique = "NAKED_PAIR" | "NAKED_TRIPLE" | "NAKED_QUADRUPLE"
type HiddenTechnique = "HIDDEN_PAIR" | "HIDDEN_TRIPLE" | "HIDDEN_QUADRUPLE"

/**
 * Get all combinations of n elements from array
 */
const getCombinations = <T>(arr: readonly T[], n: number): T[][] => {
  const result: T[][] = []
  const current: T[] = []

  const combine = (start: number) => {
    if (current.length === n) {
      result.push([...current])
      return
    }

    for (let i = start; i < arr.length; i++) {
      const item = arr[i]
      if (item !== undefined) {
        current.push(item)
        combine(i + 1)
        current.pop()
      }
    }
  }

  combine(0)
  return result
}

interface CellData {
  index: number
  candidates: readonly number[]
}

/**
 * Collect eliminations for naked subset technique
 */
const collectEliminations = (
  grid: SudokuGrid,
  unitIndices: readonly number[],
  subsetIndices: number[],
  subsetValues: number[],
): CellElimination[] => {
  const eliminations: CellElimination[] = []

  for (const idx of unitIndices) {
    if (grid.getCell(idx) === 0 && !subsetIndices.includes(idx)) {
      const cellCandidates = getCandidatesArray(grid.getCandidates(idx))
      const valuesToEliminate = cellCandidates.filter((c) => subsetValues.includes(c))

      if (valuesToEliminate.length > 0) {
        eliminations.push(makeCellElimination(idx, valuesToEliminate))
      }
    }
  }

  return eliminations
}

/**
 * Naked Subsets: Find n cells in a unit that together contain exactly n candidates
 */
const findNakedSubsetInUnit = (
  grid: SudokuGrid,
  unitIndices: readonly number[],
  size: 2 | 3 | 4,
  technique: NakedTechnique,
): TechniqueMove | null => {
  const candidateCells: CellData[] = []

  for (const idx of unitIndices) {
    if (grid.getCell(idx) === 0) {
      const candidates = getCandidatesArray(grid.getCandidates(idx))
      if (candidates.length > 0 && candidates.length <= size) {
        candidateCells.push({ index: idx, candidates })
      }
    }
  }

  if (candidateCells.length < size) return null

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
      return {
        technique,
        cellIndex: makeCellIndex(indices[0]),
        value: makeCellValue(values[0]),
        eliminations,
      }
    }
  }

  return null
}

/**
 * Hidden Subsets: Find n values that appear in only n cells within a unit
 */
const findHiddenSubsetInUnit = (
  grid: SudokuGrid,
  unitIndices: readonly number[],
  size: 2 | 3 | 4,
  technique: HiddenTechnique,
): TechniqueMove | null => {
  const emptyCells: CellData[] = []

  for (const idx of unitIndices) {
    if (grid.getCell(idx) === 0) {
      const candidates = getCandidatesArray(grid.getCandidates(idx))
      if (candidates.length > 0) {
        emptyCells.push({ index: idx, candidates })
      }
    }
  }

  if (emptyCells.length <= size) return null

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

  if (valueCells.size < size) return null

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
      const eliminations: CellElimination[] = []

      for (const idx of indices) {
        const cellCandidates = getCandidatesArray(grid.getCandidates(idx))
        const valuesToEliminate = cellCandidates.filter((c) => !combo.includes(c))

        if (valuesToEliminate.length > 0) {
          eliminations.push(makeCellElimination(idx, valuesToEliminate))
        }
      }

      const firstIndex = indices[0]
      const firstValue = combo[0]

      if (eliminations.length > 0 && firstIndex !== undefined && firstValue !== undefined) {
        return {
          technique,
          cellIndex: makeCellIndex(firstIndex),
          value: makeCellValue(firstValue),
          eliminations,
        }
      }
    }
  }

  return null
}

/**
 * Search for subset in all units
 */
const findSubsetInAllUnits = (
  grid: SudokuGrid,
  size: 2 | 3 | 4,
  type: "naked" | "hidden",
): TechniqueMove | null => {
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
    if (technique === undefined) return null

    for (let row = 0; row < GRID_SIZE; row++) {
      const result = findNakedSubsetInUnit(grid, getRowIndices(row * GRID_SIZE), size, technique)
      if (result !== null) return result
    }

    for (let col = 0; col < GRID_SIZE; col++) {
      const result = findNakedSubsetInUnit(grid, getColIndices(col), size, technique)
      if (result !== null) return result
    }

    for (let blockRow = 0; blockRow < BLOCK_SIZE; blockRow++) {
      for (let blockCol = 0; blockCol < BLOCK_SIZE; blockCol++) {
        const result = findNakedSubsetInUnit(
          grid,
          getBlockIndices(blockRow * BLOCK_AREA + blockCol * BLOCK_SIZE),
          size,
          technique,
        )
        if (result !== null) return result
      }
    }
    return null
  }
  const technique = hiddenTechniques[size]
  if (technique === undefined) return null

  for (let row = 0; row < GRID_SIZE; row++) {
    const result = findHiddenSubsetInUnit(grid, getRowIndices(row * GRID_SIZE), size, technique)
    if (result !== null) return result
  }

  for (let col = 0; col < GRID_SIZE; col++) {
    const result = findHiddenSubsetInUnit(grid, getColIndices(col), size, technique)
    if (result !== null) return result
  }

  for (let blockRow = 0; blockRow < BLOCK_SIZE; blockRow++) {
    for (let blockCol = 0; blockCol < BLOCK_SIZE; blockCol++) {
      const result = findHiddenSubsetInUnit(
        grid,
        getBlockIndices(blockRow * BLOCK_AREA + blockCol * BLOCK_SIZE),
        size,
        technique,
      )
      if (result !== null) return result
    }
  }

  return null
}
export const findNakedPair = (grid: SudokuGrid): TechniqueMove | null =>
  findSubsetInAllUnits(grid, 2, "naked")
export const findNakedTriple = (grid: SudokuGrid): TechniqueMove | null =>
  findSubsetInAllUnits(grid, 3, "naked")
export const findNakedQuad = (grid: SudokuGrid): TechniqueMove | null =>
  findSubsetInAllUnits(grid, 4, "naked")
export const findHiddenPair = (grid: SudokuGrid): TechniqueMove | null =>
  findSubsetInAllUnits(grid, 2, "hidden")
export const findHiddenTriple = (grid: SudokuGrid): TechniqueMove | null =>
  findSubsetInAllUnits(grid, 3, "hidden")
export const findHiddenQuad = (grid: SudokuGrid): TechniqueMove | null =>
  findSubsetInAllUnits(grid, 4, "hidden")
