import { Effect } from "effect"
import { InvalidPuzzleError } from "./puzzle.ts"

// =============================================================================
// Grid Constants
// =============================================================================

export const GRID_SIZE = 81
export const ROW_SIZE = 9
export const COL_SIZE = 9
export const BLOCK_SIZE = 3

// Candidate masks for values 1-9
export const CANDIDATE_MASKS = [
  0b000000000, // 0 - not valid
  0b000000001, // 1
  0b000000010, // 2
  0b000000100, // 3
  0b000001000, // 4
  0b000010000, // 5
  0b000100000, // 6
  0b001000000, // 7
  0b010000000, // 8
  0b100000000, // 9
] as const

export const ALL_CANDIDATES = 0b111111111

// =============================================================================
// Index Helpers
// =============================================================================

export const indexToRow = (index: number): number => Math.floor(index / 9)
export const indexToCol = (index: number): number => index % 9
export const indexToBlock = (index: number): number => 
  Math.floor(index / 27) * 3 + Math.floor((index % 9) / 3)

export const rowColToIndex = (row: number, col: number): number => row * 9 + col

// Get all indices in the same row
export const getRowIndices = (index: number): readonly number[] => {
  const row = indexToRow(index)
  return Array.from({ length: 9 }, (_, i) => row * 9 + i)
}

// Get all indices in the same column
export const getColIndices = (index: number): readonly number[] => {
  const col = indexToCol(index)
  return Array.from({ length: 9 }, (_, i) => i * 9 + col)
}

// Get all indices in the same 3x3 block
export const getBlockIndices = (index: number): readonly number[] => {
  const blockRow = Math.floor(index / 27)
  const blockCol = Math.floor((index % 9) / 3)
  const startIndex = blockRow * 27 + blockCol * 3
  return [
    startIndex, startIndex + 1, startIndex + 2,
    startIndex + 9, startIndex + 10, startIndex + 11,
    startIndex + 18, startIndex + 19, startIndex + 20,
  ]
}

// Get all peers (same row, col, or block) - excluding self
export const getPeers = (index: number): readonly number[] => {
  const peers = new Set<number>()
  
  // Row
  for (let i = 0; i < 9; i++) {
    const idx = indexToRow(index) * 9 + i
    if (idx !== index) peers.add(idx)
  }
  
  // Col
  for (let i = 0; i < 9; i++) {
    const idx = i * 9 + indexToCol(index)
    if (idx !== index) peers.add(idx)
  }
  
  // Block
  const blockIndices = getBlockIndices(index)
  for (const idx of blockIndices) {
    if (idx !== index) peers.add(idx)
  }
  
  return Array.from(peers)
}

// =============================================================================
// Grid Parsing
// =============================================================================

export const parsePuzzle = (puzzle: string): Effect.Effect<number[], InvalidPuzzleError> => {
  if (puzzle.length !== 81) {
    return Effect.fail(new InvalidPuzzleError({ 
      message: `Invalid puzzle length: ${puzzle.length}, expected 81` 
    }))
  }
  
  const grid: number[] = []
  for (let i = 0; i < 81; i++) {
    const char = puzzle[i]
    if (char === '.' || char === '0') {
      grid.push(0)
    } else {
      const value = parseInt(char, 10)
      if (isNaN(value) || value < 1 || value > 9) {
        return Effect.fail(new InvalidPuzzleError({ 
          message: `Invalid character at position ${i}: ${char}` 
        }))
      }
      grid.push(value)
    }
  }
  
  return Effect.succeed(grid)
}

export const gridToString = (grid: readonly number[]): string => {
  return grid.map(v => v === 0 ? '.' : v.toString()).join('')
}

// =============================================================================
// Candidate Helpers
// =============================================================================

export const countCandidates = (candidates: number): number => {
  let count = 0
  let mask = candidates
  while (mask) {
    count += mask & 1
    mask >>= 1
  }
  return count
}

export const getSingleCandidate = (candidates: number): number | null => {
  if (countCandidates(candidates) === 1) {
    for (let i = 1; i <= 9; i++) {
      if (candidates & CANDIDATE_MASKS[i]) {
        return i
      }
    }
  }
  return null
}

// Get array of candidate values from bitmask
export const getCandidatesArray = (candidates: number): number[] => {
  const result: number[] = []
  for (let i = 1; i <= 9; i++) {
    if (candidates & CANDIDATE_MASKS[i]) {
      result.push(i)
    }
  }
  return result
}

// =============================================================================
// SudokuGrid Class
// =============================================================================

export interface Cell {
  value: number // 0 = empty, 1-9 = filled
  candidates: number // bitmask of possible values
  fixed: boolean // true if given in puzzle
}

export class SudokuGrid {
  cells: Cell[]
  
  constructor() {
    this.cells = Array.from({ length: 81 }, () => ({
      value: 0,
      candidates: ALL_CANDIDATES,
      fixed: false,
    }))
  }
  
  // Create from values array
  static fromValues(values: readonly number[]): SudokuGrid {
    const grid = new SudokuGrid()
    for (let i = 0; i < 81; i++) {
      if (values[i] !== 0) {
        grid.setCell(i, values[i], true)
      }
    }
    return grid
  }
  
  // Create from puzzle string
  static fromString(puzzle: string): Effect.Effect<SudokuGrid, InvalidPuzzleError> {
    return Effect.map(parsePuzzle(puzzle), values => {
      const grid = new SudokuGrid()
      for (let i = 0; i < 81; i++) {
        if (values[i] !== 0) {
          grid.setCell(i, values[i], true)
        }
      }
      return grid
    })
  }
  
  // Clone the grid
  clone(): SudokuGrid {
    const newGrid = new SudokuGrid()
    for (let i = 0; i < 81; i++) {
      newGrid.cells[i] = {
        value: this.cells[i].value,
        candidates: this.cells[i].candidates,
        fixed: this.cells[i].fixed,
      }
    }
    return newGrid
  }
  
  // Get cell value
  getCell(index: number): number {
    return this.cells[index].value
  }
  
  // Get cell candidates
  getCandidates(index: number): number {
    return this.cells[index].candidates
  }
  
  // Check if cell is fixed (given)
  isFixed(index: number): boolean {
    return this.cells[index].fixed
  }
  
  // Set cell value
  setCell(index: number, value: number, fixed = false): boolean {
    if (value < 0 || value > 9) return false
    
    // Check if valid (no conflicts)
    if (value !== 0) {
      const peers = getPeers(index)
      for (const peer of peers) {
        if (this.cells[peer].value === value) {
          return false // Conflict
        }
      }
    }
    
    this.cells[index].value = value
    this.cells[index].fixed = fixed
    
    if (value !== 0) {
      this.cells[index].candidates = CANDIDATE_MASKS[value]
      // Remove this value from peers' candidates
      const peers = getPeers(index)
      for (const peer of peers) {
        if (this.cells[peer].value === 0) {
          this.cells[peer].candidates &= ~CANDIDATE_MASKS[value]
          if (this.cells[peer].candidates === 0) {
            return false // No candidates left = invalid
          }
        }
      }
    }
    
    return true
  }
  
  // Remove candidate from cell
  removeCandidate(index: number, value: number): boolean {
    if (this.cells[index].value !== 0) return true // Already set
    
    this.cells[index].candidates &= ~CANDIDATE_MASKS[value]
    
    if (this.cells[index].candidates === 0) {
      return false // No candidates left = invalid
    }
    
    return true
  }
  
  // Check if puzzle is complete
  isComplete(): boolean {
    return this.cells.every(cell => cell.value !== 0)
  }
  
  // Count empty cells
  countEmpty(): number {
    return this.cells.filter(cell => cell.value === 0).length
  }
  
  // Count givens (fixed cells)
  countGivens(): number {
    return this.cells.filter(cell => cell.fixed).length
  }
  
  // Find cell with fewest candidates (for solving)
  findMinCandidatesCell(): { index: number; count: number } | null {
    let minIndex = -1
    let minCount = 10
    
    for (let i = 0; i < 81; i++) {
      if (this.cells[i].value === 0) {
        const count = countCandidates(this.cells[i].candidates)
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
      if (this.cells[i].value === 0 && countCandidates(this.cells[i].candidates) === 1) {
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
        const value = getSingleCandidate(this.cells[index].candidates)
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
    return this.cells.map(cell => cell.value)
  }
  
  // Convert to puzzle string
  toString(): string {
    return gridToString(this.toValues())
  }
  
  // Validate (check for conflicts)
  isValid(): boolean {
    for (let i = 0; i < 81; i++) {
      if (this.cells[i].value !== 0) {
        const peers = getPeers(i)
        for (const peer of peers) {
          if (this.cells[peer].value === this.cells[i].value) {
            return false // Conflict
          }
        }
      }
      // Also check that empty cells have candidates
      if (this.cells[i].value === 0 && this.cells[i].candidates === 0) {
        return false // No candidates
      }
    }
    return true
  }
}
