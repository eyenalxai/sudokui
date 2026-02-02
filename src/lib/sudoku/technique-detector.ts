import { Effect, Schema } from "effect"

import { SudokuGrid } from "./grid/class.ts"
import { TechniqueMove } from "./technique.ts"
import { findLockedCandidates, findPointingCandidates } from "./techniques/intersections.ts"
import { findFullHouse, findNakedSingle, findHiddenSingle } from "./techniques/singles.ts"

export class NoMoveFoundError extends Schema.TaggedError<NoMoveFoundError>()("NoMoveFoundError", {
  message: Schema.String,
}) {}

export class InvalidGridError extends Schema.TaggedError<InvalidGridError>()("InvalidGridError", {
  message: Schema.String,
}) {}

const ALL_TECHNIQUES = [
  findFullHouse,
  findNakedSingle,
  findHiddenSingle,
  findPointingCandidates,
  findLockedCandidates,
]

const checkGridValid = (grid: SudokuGrid): Effect.Effect<void, InvalidGridError> => {
  if (!grid.isValid()) {
    return Effect.fail(new InvalidGridError({ message: "Grid is in invalid state" }))
  }
  return Effect.void
}

const findNextMoveImpl = (grid: SudokuGrid): Effect.Effect<TechniqueMove, NoMoveFoundError> => {
  for (const findTechnique of ALL_TECHNIQUES) {
    const move = findTechnique(grid)
    if (move !== null) {
      return Effect.succeed(move)
    }
  }

  return Effect.fail(new NoMoveFoundError({ message: "No logical move found" }))
}

const findAllMovesImpl = (grid: SudokuGrid): Effect.Effect<ReadonlyArray<TechniqueMove>> => {
  const moves: TechniqueMove[] = []

  for (const findTechnique of ALL_TECHNIQUES) {
    const move = findTechnique(grid)
    if (move !== null) {
      moves.push(move)
    }
  }

  return Effect.succeed(moves)
}

const applyMoveImpl = (
  grid: SudokuGrid,
  move: TechniqueMove,
): Effect.Effect<SudokuGrid, InvalidGridError> => {
  const newGrid = grid.clone()

  const success = newGrid.setCell(move.cellIndex, move.value)
  if (!success) {
    return Effect.fail(
      new InvalidGridError({
        message: `Failed to set cell ${move.cellIndex} to ${move.value}`,
      }),
    )
  }

  for (const elimination of move.eliminations) {
    for (const value of elimination.values) {
      const elimSuccess = newGrid.removeCandidate(elimination.index, value)
      if (!elimSuccess) {
        return Effect.fail(
          new InvalidGridError({
            message: `Failed to remove candidate ${value} from cell ${elimination.index}`,
          }),
        )
      }
    }
  }

  return Effect.succeed(newGrid)
}

export class TechniqueDetector extends Effect.Service<TechniqueDetector>()("TechniqueDetector", {
  accessors: true,
  succeed: {
    findNextMove: Effect.fn("TechniqueDetector.findNextMove")(function* (grid: SudokuGrid) {
      yield* checkGridValid(grid)
      return yield* findNextMoveImpl(grid)
    }),

    findAllMoves: Effect.fn("TechniqueDetector.findAllMoves")(function* (grid: SudokuGrid) {
      yield* checkGridValid(grid)
      return yield* findAllMovesImpl(grid)
    }),

    applyMove: Effect.fn("TechniqueDetector.applyMove")(function* (
      grid: SudokuGrid,
      move: TechniqueMove,
    ) {
      return yield* applyMoveImpl(grid, move)
    }),
  },
}) {}
