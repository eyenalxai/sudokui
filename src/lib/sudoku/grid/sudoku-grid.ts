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
    const isCellIndex = Schema.is(CellIndex)
    const isCellValue = Schema.is(CellValue)
    return Effect.gen(function* () {
      if (index < 0 || index >= TOTAL_CELLS) {
        return yield* Effect.fail(
          new InvalidCellIndexError({
            index,
            message: `Invalid cell index: ${index}`,
          }),
        )
      }
      if (!isCellIndex(index)) {
        return yield* Effect.fail(
          new InvalidCellIndexError({
            index,
            message: `Invalid cell index: ${index}`,
          }),
        )
      }
      if (value < 0 || value > GRID_SIZE || !isCellValue(value)) {
        return yield* Effect.fail(
          new InvalidCellValueError({
            cellIndex: index,
            value,
            message: `Invalid cell value: ${value}`,
          }),
        )
      }

      const cell = cells[index]
      if (cell === undefined) {
        return yield* Effect.fail(
          new InvalidCellIndexError({
            index,
            message: `Invalid cell index: ${index}`,
          }),
        )
      }

      cell.value = value
      cell.fixed = fixed
      if (value === 0) {
        return
      }

      const peers = getPeers(index)
      for (const peer of peers) {
        const peerCell = cells[peer]
        if (peerCell !== undefined && peerCell.value === value) {
          if (!isCellIndex(peer)) {
            return yield* Effect.fail(
              new InvalidCellIndexError({
                index: peer,
                message: `Invalid cell index: ${peer}`,
              }),
            )
          }
          return yield* Effect.fail(
            new CellConflictError({
              cellIndex: index,
              value,
              conflictingIndex: peer,
              message: `Cell conflict at ${index} with peer ${peer}`,
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
            if (!isCellIndex(peer)) {
              return yield* Effect.fail(
                new InvalidCellIndexError({
                  index: peer,
                  message: `Invalid cell index: ${peer}`,
                }),
              )
            }
            return yield* Effect.fail(
              new NoCandidatesRemainingError({
                cellIndex: peer,
                message: `No candidates remaining for cell ${peer}`,
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
    const isCellIndex = Schema.is(CellIndex)
    return Effect.gen(function* () {
      if (index < 0 || index >= TOTAL_CELLS) {
        return yield* Effect.fail(
          new InvalidCellIndexError({
            index,
            message: `Invalid cell index: ${index}`,
          }),
        )
      }

      if (!isCellIndex(index)) {
        return yield* Effect.fail(
          new InvalidCellIndexError({
            index,
            message: `Invalid cell index: ${index}`,
          }),
        )
      }

      const cell = cells[index]
      if (cell === undefined) {
        return yield* Effect.fail(
          new InvalidCellIndexError({
            index,
            message: `Invalid cell index: ${index}`,
          }),
        )
      }
      if (cell.value !== 0) return

      cell.candidates &= ~getCandidateMask(value)
      if (cell.candidates === 0) {
        return yield* Effect.fail(
          new NoCandidatesRemainingError({
            cellIndex: index,
            message: `No candidates remaining for cell ${index}`,
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
