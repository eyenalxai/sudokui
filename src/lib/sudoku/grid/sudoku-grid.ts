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

      cell.value = value
      cell.fixed = fixed
      if (value === 0) {
        return
      }

      const peers = getPeers(cellIndex)
      for (const peer of peers) {
        const peerCell = cells[peer]
        if (peerCell !== undefined && peerCell.value === value) {
          const peerIndex = yield* getCellIndexOrFail(peer)
          return yield* Effect.fail(
            new CellConflictError({
              cellIndex,
              value,
              conflictingIndex: peerIndex,
              message: `Cell conflict at ${cellIndex} with peer ${peerIndex}`,
            }),
          )
        }
      }

      cell.candidates = getCandidateMask(value)
      for (const peer of peers) {
        const peerCell = cells[peer]
        if (peerCell === undefined) {
          return yield* Effect.fail(
            new InvalidCellIndexError({
              index: peer,
              message: `Invalid cell index: ${peer}`,
            }),
          )
        }
        if (peerCell.value === 0) {
          peerCell.candidates &= ~getCandidateMask(value)
          if (peerCell.candidates === 0) {
            const peerIndex = yield* getCellIndexOrFail(peer)
            return yield* Effect.fail(
              new NoCandidatesRemainingError({
                cellIndex: peerIndex,
                message: `No candidates remaining for cell ${peerIndex}`,
              }),
            )
          }
        }
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
