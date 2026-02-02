import { Effect, Option, ParseResult, Schema } from "effect"

import { SudokuGrid } from "./grid/sudoku-grid.ts"
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

type TechniqueFinder = (
  grid: SudokuGrid,
) => Effect.Effect<Option.Option<TechniqueMove>, ParseResult.ParseError>

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

const runTechnique = (findTechnique: TechniqueFinder, grid: SudokuGrid) =>
  findTechnique(grid).pipe(
    Effect.catchTag("ParseError", (error) =>
      Effect.fail(
        new InvalidGridError({
          message:
            typeof error === "object" && error !== null && "message" in error
              ? String(error.message)
              : "Failed to decode technique move",
        }),
      ),
    ),
  )

const findNextMoveImpl = (
  grid: SudokuGrid,
): Effect.Effect<TechniqueMove, NoMoveFoundError | InvalidGridError> =>
  Effect.gen(function* () {
    for (const technique of TECHNIQUES) {
      const findTechnique = technique.find
      const move = yield* runTechnique(findTechnique, grid)
      if (Option.isSome(move)) {
        return move.value
      }
    }

    return yield* Effect.fail(new NoMoveFoundError({ message: "No logical move found" }))
  })

const findAllMovesImpl = (
  grid: SudokuGrid,
): Effect.Effect<ReadonlyArray<TechniqueMove>, InvalidGridError> =>
  Effect.gen(function* () {
    const moves: TechniqueMove[] = []

    for (const technique of TECHNIQUES) {
      const findTechnique = technique.find
      const move = yield* runTechnique(findTechnique, grid)
      Option.match(move, {
        onNone: () => {},
        onSome: (foundMove) => {
          moves.push(foundMove)
        },
      })
    }

    return moves
  })

const PLACEMENT_TECHNIQUES = new Set(["FULL_HOUSE", "NAKED_SINGLE", "HIDDEN_SINGLE"])

const applyMoveImpl = (
  grid: SudokuGrid,
  move: TechniqueMove,
): Effect.Effect<SudokuGrid, InvalidGridError> => {
  const newGrid = grid.clone()

  return Effect.gen(function* () {
    // Only set the cell for placement techniques (singles)
    // Elimination-only techniques just remove candidates
    if (PLACEMENT_TECHNIQUES.has(move.technique)) {
      yield* newGrid.setCell(move.cellIndex, move.value).pipe(
        Effect.catchTags({
          CellConflictError: (error) =>
            Effect.fail(new InvalidGridError({ message: error.message })),
          InvalidCellIndexError: (error) =>
            Effect.fail(new InvalidGridError({ message: error.message })),
          InvalidCellValueError: (error) =>
            Effect.fail(new InvalidGridError({ message: error.message })),
          NoCandidatesRemainingError: (error) =>
            Effect.fail(new InvalidGridError({ message: error.message })),
        }),
      )
    }

    for (const elimination of move.eliminations) {
      for (const value of elimination.values) {
        yield* newGrid.removeCandidate(elimination.index, value).pipe(
          Effect.catchTags({
            InvalidCellIndexError: (error) =>
              Effect.fail(new InvalidGridError({ message: error.message })),
            NoCandidatesRemainingError: (error) =>
              Effect.fail(new InvalidGridError({ message: error.message })),
          }),
        )
      }
    }

    return newGrid
  })
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
