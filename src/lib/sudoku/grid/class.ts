import { Effect } from "effect"

import { countCandidates, getSingleCandidate } from "./candidates.ts"
import { ALL_CANDIDATES, CANDIDATE_MASKS, GRID_SIZE, TOTAL_CELLS } from "./constants.ts"
import { getPeers } from "./helpers.ts"
import { parsePuzzle, gridToString } from "./parsing.ts"

const getCandidateMask = (value: number): number => {
  if (value >= 1 && value <= GRID_SIZE) {
    const mask = CANDIDATE_MASKS[value]
    if (mask === undefined) {
      return 0
    }
    return mask
  }
  return 0
}

export interface Cell {
  value: number
  candidates: number
  fixed: boolean
}

export class SudokuGrid {
  cells: Cell[]

  constructor() {
    this.cells = Array.from({ length: TOTAL_CELLS }, () => ({
      value: 0,
      candidates: ALL_CANDIDATES,
      fixed: false,
    }))
  }

  private getCellData(index: number): Cell {
    const cell = this.cells[index]
    if (cell === undefined) {
      throw new Error(`Invalid cell index: ${index}`)
    }
    return cell
  }

  static fromValues(values: readonly number[]): SudokuGrid {
    const grid = new SudokuGrid()
    for (let i = 0; i < TOTAL_CELLS; i++) {
      const value = values[i]
      if (value !== undefined && value !== 0) {
        grid.setCell(i, value, true)
      }
    }
    return grid
  }

  static fromString = Effect.fn("SudokuGrid.fromString")(function* (puzzle: string) {
    const values = yield* parsePuzzle(puzzle)
    const grid = new SudokuGrid()
    for (let i = 0; i < TOTAL_CELLS; i++) {
      const value = values[i]
      if (value !== undefined && value !== 0) {
        grid.setCell(i, value, true)
      }
    }
    return grid
  })

  clone(): SudokuGrid {
    const newGrid = new SudokuGrid()
    for (let i = 0; i < TOTAL_CELLS; i++) {
      newGrid.cells[i] = { ...this.getCellData(i) }
    }
    return newGrid
  }

  getCell(index: number): number {
    return this.getCellData(index).value
  }

  getCandidates(index: number): number {
    return this.getCellData(index).candidates
  }

  isFixed(index: number): boolean {
    return this.getCellData(index).fixed
  }

  setCell(index: number, value: number, fixed = false): boolean {
    if (value < 0 || value > GRID_SIZE) return false

    const cell = this.getCellData(index)
    cell.value = value
    cell.fixed = fixed
    if (value === 0) {
      return true
    }

    const peers = getPeers(index)
    for (const peer of peers) {
      if (this.getCellData(peer).value === value) {
        return false
      }
    }

    cell.candidates = getCandidateMask(value)
    for (const peer of peers) {
      const peerCell = this.getCellData(peer)
      if (peerCell.value === 0) {
        peerCell.candidates &= ~getCandidateMask(value)
        if (peerCell.candidates === 0) {
          return false
        }
      }
    }

    return true
  }

  removeCandidate(index: number, value: number): boolean {
    const cell = this.getCellData(index)
    if (cell.value !== 0) return true

    cell.candidates &= ~getCandidateMask(value)

    if (cell.candidates === 0) {
      return false
    }

    return true
  }

  isComplete(): boolean {
    return this.cells.every((cell) => cell.value !== 0)
  }

  countEmpty(): number {
    return this.cells.filter((cell) => cell.value === 0).length
  }

  countGivens(): number {
    return this.cells.filter((cell) => cell.fixed).length
  }

  findMinCandidatesCell(): { index: number; count: number } | null {
    let minIndex = -1
    let minCount = 10

    for (let i = 0; i < TOTAL_CELLS; i++) {
      const cell = this.getCellData(i)
      if (cell.value === 0) {
        const count = countCandidates(cell.candidates)
        if (count < minCount) {
          minCount = count
          minIndex = i
          if (count === 1) break
        }
      }
    }

    if (minIndex === -1) return null
    return { index: minIndex, count: minCount }
  }

  findNakedSingles(): number[] {
    const singles: number[] = []
    for (let i = 0; i < TOTAL_CELLS; i++) {
      const cell = this.getCellData(i)
      if (cell.value === 0 && countCandidates(cell.candidates) === 1) {
        singles.push(i)
      }
    }
    return singles
  }

  setNakedSingles(): boolean {
    let changed = true
    let iterations = 0
    const maxIterations = TOTAL_CELLS
    while (changed && iterations < maxIterations) {
      changed = false
      iterations++
      const singles = this.findNakedSingles()
      for (const index of singles) {
        const cell = this.getCellData(index)
        const value = getSingleCandidate(cell.candidates)
        if (value !== null) {
          if (!this.setCell(index, value)) {
            return false
          }
          changed = true
        }
      }
    }
    return true
  }

  toValues(): number[] {
    return this.cells.map((cell) => cell.value)
  }

  toString(): string {
    return gridToString(this.toValues())
  }

  isValid(): boolean {
    for (let i = 0; i < TOTAL_CELLS; i++) {
      const cell = this.getCellData(i)
      if (cell.value !== 0) {
        const peers = getPeers(i)
        for (const peer of peers) {
          if (this.getCellData(peer).value === cell.value) {
            return false
          }
        }
      }
      if (cell.value === 0 && cell.candidates === 0) {
        return false
      }
    }
    return true
  }
}
