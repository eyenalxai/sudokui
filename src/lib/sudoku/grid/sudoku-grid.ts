import { Effect, Schema } from "effect"

import {
  CellIndex,
  CellValue,
  CellConflictError,
  InvalidCellIndexError,
  InvalidCellValueError,
  NoCandidatesRemainingError,
} from "../puzzle.ts"

import { getCandidateMask } from "./candidates.ts"
import { ALL_CANDIDATES, GRID_SIZE, TOTAL_CELLS } from "./constants.ts"
import { getPeers } from "./helpers.ts"
import { parsePuzzle, gridToString } from "./parsing.ts"

const isCellIndex = Schema.is(CellIndex)
const isCellValue = Schema.is(CellValue)

export interface Cell {
  value: number
  candidates: number
  fixed: boolean
}

const getCellIndexOrFail = (index: number): Effect.Effect<CellIndex, InvalidCellIndexError> =>
  Effect.gen(function* () {
    if (!isCellIndex(index)) {
      return yield* Effect.fail(
        new InvalidCellIndexError({
          index,
          message: `Invalid cell index: ${index}`,
        }),
      )
    }
    return index
  })

export class SudokuGrid {
  cells: Cell[]

  constructor() {
    this.cells = Array.from({ length: TOTAL_CELLS }, () => ({
      value: 0,
      candidates: ALL_CANDIDATES,
      fixed: false,
    }))
  }

  getSnapshot(): { cells: Cell[] } {
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
    const { cells } = this.getSnapshot()
    return Effect.gen(function* () {
      const cellIndex = yield* getCellIndexOrFail(index)

      if (value < 0 || value > GRID_SIZE || !isCellValue(value)) {
        return yield* Effect.fail(
          new InvalidCellValueError({
            cellIndex,
            value,
            message: `Invalid cell value: ${value}`,
          }),
        )
      }

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

      if (conflictingIndex !== null && value !== 0) {
        return yield* Effect.fail(
          new CellConflictError({
            cellIndex,
            value,
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
  ): Effect.Effect<void, InvalidCellIndexError | NoCandidatesRemainingError> {
    const { cells } = this.getSnapshot()
    return Effect.gen(function* () {
      const cellIndex = yield* getCellIndexOrFail(index)
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

  toValues(): number[] {
    return this.cells.map((cell) => cell.value)
  }

  toString(): string {
    return gridToString(this.toValues())
  }
}
