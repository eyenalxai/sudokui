import type { CellIndex } from "../puzzle.ts"
import { Effect } from "effect"

import {
  CellConflictError,
  InvalidCellIndexError,
  InvalidCellValueError,
  NoCandidatesRemainingError,
} from "../puzzle.ts"

import { getCandidateMask } from "./candidates.ts"
import { ALL_CANDIDATES, TOTAL_CELLS } from "./constants.ts"
import { getCellIndexOrFail, validateCandidateValue, validateCellValue } from "./grid-validation.ts"
import { getPeers } from "./helpers.ts"
import { parsePuzzle, gridToString } from "./parsing.ts"

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

  getCellsRef(): { cells: Cell[] } {
    return { cells: this.cells }
  }

  getCellData(index: number): Effect.Effect<Cell, InvalidCellIndexError> {
    const cell = this.cells[index]
    if (cell === undefined) {
      return Effect.fail(
        new InvalidCellIndexError({
          index,
          message: `Invalid cell index: ${index}`,
        }),
      )
    }
    return Effect.succeed(cell)
  }

  static fromValues = Effect.fn("SudokuGrid.fromValues")(function* (values: readonly number[]) {
    const grid = new SudokuGrid()
    for (let i = 0; i < TOTAL_CELLS; i++) {
      const value = values[i]
      if (value !== undefined && value !== 0) {
        yield* grid.setCell(i, value, true)
      }
    }
    return grid
  })

  static fromString = Effect.fn("SudokuGrid.fromString")(function* (puzzle: string) {
    const values = yield* parsePuzzle(puzzle)
    const grid = new SudokuGrid()
    for (let i = 0; i < TOTAL_CELLS; i++) {
      const value = values[i]
      if (value !== undefined && value !== 0) {
        yield* grid.setCell(i, value, true)
      }
    }
    return grid
  })

  clone(): SudokuGrid {
    const newGrid = new SudokuGrid()
    for (let i = 0; i < TOTAL_CELLS; i++) {
      const cell = this.cells[i]
      if (cell !== undefined) {
        newGrid.cells[i] = { ...cell }
      }
    }
    return newGrid
  }

  getCell(index: number): number {
    const cell = this.cells[index]
    if (cell === undefined) {
      return 0
    }
    return cell.value
  }

  getCandidates(index: number): number {
    const cell = this.cells[index]
    if (cell === undefined) {
      return 0
    }
    return cell.candidates
  }

  isFixed(index: number): boolean {
    const cell = this.cells[index]
    if (cell === undefined) {
      return false
    }
    return cell.fixed
  }

  setCell(
    index: number,
    value: number,
    fixed = false,
  ): Effect.Effect<
    void,
    InvalidCellIndexError | InvalidCellValueError | CellConflictError | NoCandidatesRemainingError
  > {
    const { cells } = this.getCellsRef()
    return Effect.gen(function* () {
      const cellIndex = yield* getCellIndexOrFail(index)

      const cellValue = yield* validateCellValue(cellIndex, value)

      const cell = cells[cellIndex]
      if (cell === undefined) {
        return yield* Effect.fail(
          new InvalidCellIndexError({
            index: cellIndex,
            message: `Invalid cell index: ${cellIndex}`,
          }),
        )
      }

      const peers = getPeers(cellIndex)
      let conflictingIndex: CellIndex | null = null
      if (value !== 0) {
        for (const peer of peers) {
          const peerCell = cells[peer]
          if (peerCell !== undefined && peerCell.value === value) {
            conflictingIndex = yield* getCellIndexOrFail(peer)
            break
          }
        }
      }

      cell.value = value
      cell.fixed = fixed

      for (let i = 0; i < TOTAL_CELLS; i++) {
        const currentCell = cells[i]
        if (currentCell === undefined) {
          return yield* Effect.fail(
            new InvalidCellIndexError({
              index: i,
              message: `Invalid cell index: ${i}`,
            }),
          )
        }

        if (currentCell.value === 0) {
          let candidates = ALL_CANDIDATES
          const currentPeers = getPeers(i)
          for (const peer of currentPeers) {
            const peerCell = cells[peer]
            if (peerCell !== undefined && peerCell.value !== 0) {
              candidates &= ~getCandidateMask(peerCell.value)
            }
          }
          currentCell.candidates = candidates
          if (candidates === 0) {
            const candidateIndex = yield* getCellIndexOrFail(i)
            return yield* Effect.fail(
              new NoCandidatesRemainingError({
                cellIndex: candidateIndex,
                message: `No candidates remaining for cell ${candidateIndex}`,
              }),
            )
          }
        } else {
          currentCell.candidates = getCandidateMask(currentCell.value)
        }
      }

      if (conflictingIndex !== null && cellValue !== 0) {
        return yield* Effect.fail(
          new CellConflictError({
            cellIndex,
            value: cellValue,
            conflictingIndex,
            message: `Cell conflict at ${cellIndex} with peer ${conflictingIndex}`,
          }),
        )
      }
    })
  }

  removeCandidate(
    index: number,
    value: number,
  ): Effect.Effect<
    void,
    InvalidCellIndexError | InvalidCellValueError | NoCandidatesRemainingError
  > {
    const { cells } = this.getCellsRef()
    return Effect.gen(function* () {
      const cellIndex = yield* getCellIndexOrFail(index)
      yield* validateCandidateValue(cellIndex, value)
      const cell = cells[cellIndex]
      if (cell === undefined) {
        return yield* Effect.fail(
          new InvalidCellIndexError({
            index: cellIndex,
            message: `Invalid cell index: ${cellIndex}`,
          }),
        )
      }
      if (cell.value !== 0) return

      // Manual pencil marks: do not enforce peer constraints here.
      cell.candidates &= ~getCandidateMask(value)
      if (cell.candidates === 0) {
        return yield* Effect.fail(
          new NoCandidatesRemainingError({
            cellIndex,
            message: `No candidates remaining for cell ${cellIndex}`,
          }),
        )
      }
    })
  }

  addCandidate(
    index: number,
    value: number,
  ): Effect.Effect<void, InvalidCellIndexError | InvalidCellValueError> {
    const { cells } = this.getCellsRef()
    return Effect.gen(function* () {
      const cellIndex = yield* getCellIndexOrFail(index)
      yield* validateCandidateValue(cellIndex, value)
      const cell = cells[cellIndex]
      if (cell === undefined) {
        return yield* Effect.fail(
          new InvalidCellIndexError({
            index: cellIndex,
            message: `Invalid cell index: ${cellIndex}`,
          }),
        )
      }
      if (cell.value !== 0) return

      // Manual pencil marks: do not enforce peer constraints here.
      cell.candidates |= getCandidateMask(value)
    })
  }

  toValues(): number[] {
    return this.cells.map((cell) => cell.value)
  }

  toString(): string {
    return gridToString(this.toValues())
  }
}
