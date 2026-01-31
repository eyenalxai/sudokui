import { Effect } from "effect"

import { countCandidates, getSingleCandidate } from "./candidates.ts"
import { ALL_CANDIDATES, CANDIDATE_MASKS } from "./constants.ts"
import { getPeers } from "./helpers.ts"
import { parsePuzzle, gridToString } from "./parsing.ts"

// Helper to safely get candidate mask with bounds checking
const getCandidateMask = (value: number): number => {
  if (value >= 1 && value <= 9) {
    const mask = CANDIDATE_MASKS[value]
    if (mask === undefined) {
      return 0
    }
    return mask
  }
  return 0
}

// Cell interface
export interface Cell {
  value: number // 0 = empty, 1-9 = filled
  candidates: number // bitmask of possible values
  fixed: boolean // true if given in puzzle
}

// SudokuGrid Class
export class SudokuGrid {
  cells: Cell[]

  constructor() {
    this.cells = Array.from({ length: 81 }, () => ({
      value: 0,
      candidates: ALL_CANDIDATES,
      fixed: false,
    }))
  }

  // Helper to safely get cell (we know index is always valid 0-80)
  private getCellData(index: number): Cell {
    const cell = this.cells[index]
    if (cell === undefined) {
      throw new Error(`Invalid cell index: ${index}`)
    }
    return cell
  }

  // Create from values array
  static fromValues(values: readonly number[]): SudokuGrid {
    const grid = new SudokuGrid()
    for (let i = 0; i < 81; i++) {
      const value = values[i]
      if (value !== undefined && value !== 0) {
        grid.setCell(i, value, true)
      }
    }
    return grid
  }

  // Create from puzzle string
  static fromString = Effect.fn("SudokuGrid.fromString")(function* (puzzle: string) {
    const values = yield* parsePuzzle(puzzle)
    const grid = new SudokuGrid()
    for (let i = 0; i < 81; i++) {
      const value = values[i]
      if (value !== undefined && value !== 0) {
        grid.setCell(i, value, true)
      }
    }
    return grid
  })

  // Clone the grid
  clone(): SudokuGrid {
    const newGrid = new SudokuGrid()
    for (let i = 0; i < 81; i++) {
      newGrid.cells[i] = { ...this.getCellData(i) }
    }
    return newGrid
  }

  // Get cell value
  getCell(index: number): number {
    return this.getCellData(index).value
  }

  // Get cell candidates
  getCandidates(index: number): number {
    return this.getCellData(index).candidates
  }

  // Check if cell is fixed (given)
  isFixed(index: number): boolean {
    return this.getCellData(index).fixed
  }

  // Set cell value
  setCell(index: number, value: number, fixed = false): boolean {
    if (value < 0 || value > 9) return false

    // Check if valid (no conflicts)
    if (value !== 0) {
      const peers = getPeers(index)
      for (const peer of peers) {
        if (this.getCellData(peer).value === value) {
          return false // Conflict
        }
      }
    }

    const cell = this.getCellData(index)
    cell.value = value
    cell.fixed = fixed

    if (value !== 0) {
      cell.candidates = getCandidateMask(value)
      // Remove this value from peers' candidates
      const peers = getPeers(index)
      for (const peer of peers) {
        const peerCell = this.getCellData(peer)
        if (peerCell.value === 0) {
          peerCell.candidates &= ~getCandidateMask(value)
          if (peerCell.candidates === 0) {
            return false // No candidates left = invalid
          }
        }
      }
    }

    return true
  }

  // Remove candidate from cell
  removeCandidate(index: number, value: number): boolean {
    const cell = this.getCellData(index)
    if (cell.value !== 0) return true // Already set

    cell.candidates &= ~getCandidateMask(value)

    if (cell.candidates === 0) {
      return false // No candidates left = invalid
    }

    return true
  }

  // Check if puzzle is complete
  isComplete(): boolean {
    return this.cells.every((cell) => cell.value !== 0)
  }

  // Count empty cells
  countEmpty(): number {
    return this.cells.filter((cell) => cell.value === 0).length
  }

  // Count givens (fixed cells)
  countGivens(): number {
    return this.cells.filter((cell) => cell.fixed).length
  }

  // Find cell with fewest candidates (for solving)
  findMinCandidatesCell(): { index: number; count: number } | null {
    let minIndex = -1
    let minCount = 10

    for (let i = 0; i < 81; i++) {
      const cell = this.getCellData(i)
      if (cell.value === 0) {
        const count = countCandidates(cell.candidates)
        if (count < minCount) {
          minCount = count
          minIndex = i
          if (count === 1) break // Can't get better than 1
        }
      }
    }

    if (minIndex === -1) return null
    return { index: minIndex, count: minCount }
  }

  // Get all indices with naked singles (only one candidate)
  findNakedSingles(): number[] {
    const singles: number[] = []
    for (let i = 0; i < 81; i++) {
      const cell = this.getCellData(i)
      if (cell.value === 0 && countCandidates(cell.candidates) === 1) {
        singles.push(i)
      }
    }
    return singles
  }

  // Set all naked singles (cascade)
  setNakedSingles(): boolean {
    let changed = true
    while (changed) {
      changed = false
      const singles = this.findNakedSingles()
      for (const index of singles) {
        const cell = this.getCellData(index)
        const value = getSingleCandidate(cell.candidates)
        if (value !== null) {
          if (!this.setCell(index, value)) {
            return false // Invalid
          }
          changed = true
        }
      }
    }
    return true
  }

  // Convert to values array
  toValues(): number[] {
    return this.cells.map((cell) => cell.value)
  }

  // Convert to puzzle string
  toString(): string {
    return gridToString(this.toValues())
  }

  // Validate (check for conflicts)
  isValid(): boolean {
    for (let i = 0; i < 81; i++) {
      const cell = this.getCellData(i)
      if (cell.value !== 0) {
        const peers = getPeers(i)
        for (const peer of peers) {
          if (this.getCellData(peer).value === cell.value) {
            return false // Conflict
          }
        }
      }
      // Also check that empty cells have candidates
      if (cell.value === 0 && cell.candidates === 0) {
        return false // No candidates
      }
    }
    return true
  }
}
