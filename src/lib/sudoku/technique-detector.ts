import { Effect, Option, ParseResult, Schema } from "effect"

import { SudokuGrid } from "./grid/sudoku-grid.ts"
import { isValid } from "./grid/validation.ts"
import { TechniqueMove } from "./technique.ts"
import { findSkyscraper } from "./techniques/fish/skyscraper.ts"
import { findTwoStringKite } from "./techniques/fish/two-string-kite.ts"
import { findXWing } from "./techniques/fish/xwing.ts"
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
  { name: "Skyscraper", find: findSkyscraper },
  { name: "XWing", find: findXWing },
  { name: "TwoStringKite", find: findTwoStringKite },
]

const checkGridValid = (grid: SudokuGrid): Effect.Effect<void, InvalidGridError> => {
  if (!isValid(grid)) {
    return Effect.fail(new InvalidGridError({ message: "Grid is in invalid state" }))
  }
  return Effect.void
}

const runTechnique = (findTechnique: TechniqueFinder, grid: SudokuGrid) =>
  findTechnique(grid).pipe(
    Effect.catchTag("ParseError", (error) =>
      ParseResult.TreeFormatter.formatError(error).pipe(
        Effect.flatMap((message) => Effect.fail(new InvalidGridError({ message }))),
      ),
    ),
  )

const findNextMoveImpl = Effect.fn("TechniqueDetector.findNextMoveImpl")(function* (
  grid: SudokuGrid,
) {
  for (const technique of TECHNIQUES) {
    const findTechnique = technique.find
    const move = yield* runTechnique(findTechnique, grid)
    if (Option.isSome(move)) {
      return move.value
    }
  }

  return yield* Effect.fail(new NoMoveFoundError({ message: "No logical move found" }))
})

const findAllMovesImpl = Effect.fn("TechniqueDetector.findAllMovesImpl")(function* (
  grid: SudokuGrid,
) {
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

const applyMoveImpl = Effect.fn("TechniqueDetector.applyMoveImpl")(function* (
  grid: SudokuGrid,
  move: TechniqueMove,
) {
  const newGrid = grid.clone()

  // Only set the cell for placement techniques (singles)
  // Elimination-only techniques just remove candidates
  if (PLACEMENT_TECHNIQUES.has(move.technique)) {
    yield* newGrid.setCell(move.cellIndex, move.value)
  }

  for (const elimination of move.eliminations) {
    for (const value of elimination.values) {
      yield* newGrid.removeCandidate(elimination.index, value)
    }
  }

  return newGrid
})

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
