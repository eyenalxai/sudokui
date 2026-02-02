import { Effect, Schema } from "effect"

import { SudokuGrid } from "./grid/class.ts"
import { TechniqueMove } from "./technique.ts"
import { findLockedCandidates, findPointingCandidates } from "./techniques/intersections.ts"
import { findFullHouse, findNakedSingle, findHiddenSingle } from "./techniques/singles.ts"
import {
  findHiddenPair,
  findHiddenQuad,
  findHiddenTriple,
  findNakedPair,
  findNakedQuad,
  findNakedTriple,
} from "./techniques/subsets.ts"

export class NoMoveFoundError extends Schema.TaggedError<NoMoveFoundError>()("NoMoveFoundError", {
  message: Schema.String,
}) {}

export class InvalidGridError extends Schema.TaggedError<InvalidGridError>()("InvalidGridError", {
  message: Schema.String,
}) {}

type TechniqueFinder = (grid: SudokuGrid) => TechniqueMove | null

interface TechniqueInfo {
  readonly name: string
  readonly find: TechniqueFinder
}

const TECHNIQUES: ReadonlyArray<TechniqueInfo> = [
  { name: "FullHouse", find: findFullHouse },
  { name: "NakedSingle", find: findNakedSingle },
  { name: "HiddenSingle", find: findHiddenSingle },
  { name: "PointingCandidates", find: findPointingCandidates },
  { name: "LockedCandidates", find: findLockedCandidates },
  { name: "NakedPair", find: findNakedPair },
  { name: "HiddenPair", find: findHiddenPair },
  { name: "NakedTriple", find: findNakedTriple },
  { name: "HiddenTriple", find: findHiddenTriple },
  { name: "NakedQuad", find: findNakedQuad },
  { name: "HiddenQuad", find: findHiddenQuad },
]

const checkGridValid = (grid: SudokuGrid): Effect.Effect<void, InvalidGridError> => {
  if (!grid.isValid()) {
    return Effect.fail(new InvalidGridError({ message: "Grid is in invalid state" }))
  }
  return Effect.void
}

const findNextMoveImpl = (grid: SudokuGrid): Effect.Effect<TechniqueMove, NoMoveFoundError> =>
  Effect.gen(function* () {
    for (const technique of TECHNIQUES) {
      const findTechnique = technique.find
      const move = findTechnique(grid)
      if (move !== null) {
        yield* Effect.logDebug(`Found ${move.technique} move`)
        return move
      }
      yield* Effect.logDebug(`${technique.name}: no move found`)
    }

    return yield* Effect.fail(new NoMoveFoundError({ message: "No logical move found" }))
  })

const findAllMovesImpl = (grid: SudokuGrid): Effect.Effect<ReadonlyArray<TechniqueMove>> => {
  const moves: TechniqueMove[] = []

  for (const technique of TECHNIQUES) {
    const findTechnique = technique.find
    const move = findTechnique(grid)
    if (move !== null) {
      moves.push(move)
    }
  }

  return Effect.succeed(moves)
}

const PLACEMENT_TECHNIQUES = new Set(["FULL_HOUSE", "NAKED_SINGLE", "HIDDEN_SINGLE"])

const applyMoveImpl = (
  grid: SudokuGrid,
  move: TechniqueMove,
): Effect.Effect<SudokuGrid, InvalidGridError> => {
  const newGrid = grid.clone()

  // Only set the cell for placement techniques (singles)
  // Elimination-only techniques just remove candidates
  if (PLACEMENT_TECHNIQUES.has(move.technique)) {
    const success = newGrid.setCell(move.cellIndex, move.value)
    if (!success) {
      return Effect.fail(
        new InvalidGridError({
          message: `Failed to set cell ${move.cellIndex} to ${move.value}`,
        }),
      )
    }
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
