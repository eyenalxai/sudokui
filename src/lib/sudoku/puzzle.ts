import { Schema } from "effect"

import { DifficultyLevel } from "./difficulty.ts"
import { ALL_CANDIDATES, GRID_SIZE, TOTAL_CELLS } from "./grid/constants.ts"

export const Technique = Schema.Literal(
  "FULL_HOUSE",
  "NAKED_SINGLE",
  "HIDDEN_SINGLE",
  "LOCKED_PAIR",
  "LOCKED_TRIPLE",
  "LOCKED_CANDIDATES",
  "NAKED_PAIR",
  "NAKED_TRIPLE",
  "NAKED_QUADRUPLE",
  "HIDDEN_PAIR",
  "HIDDEN_TRIPLE",
  "HIDDEN_QUADRUPLE",
  "SKYSCRAPER",
  "X_WING",
  "SWORDFISH",
  "TWO_STRING_KITE",
)

export type Technique = typeof Technique.Type

export const CellIndex = Schema.Number.pipe(
  Schema.int(),
  Schema.between(0, TOTAL_CELLS - 1),
  Schema.brand("CellIndex"),
)
export type CellIndex = typeof CellIndex.Type

export const CellValue = Schema.Number.pipe(
  Schema.int(),
  Schema.between(0, GRID_SIZE),
  Schema.brand("CellValue"),
)
export type CellValue = typeof CellValue.Type

export const Candidates = Schema.Number.pipe(
  Schema.int(),
  Schema.between(0, ALL_CANDIDATES),
  Schema.brand("Candidates"),
)
export type Candidates = typeof Candidates.Type

export class InvalidCellIndexError extends Schema.TaggedError<InvalidCellIndexError>()(
  "InvalidCellIndexError",
  {
    index: Schema.Number,
    message: Schema.String,
  },
) {}

export class InvalidCellValueError extends Schema.TaggedError<InvalidCellValueError>()(
  "InvalidCellValueError",
  {
    cellIndex: CellIndex,
    value: Schema.Number,
    message: Schema.String,
  },
) {}

export class CellConflictError extends Schema.TaggedError<CellConflictError>()(
  "CellConflictError",
  {
    cellIndex: CellIndex,
    value: CellValue,
    conflictingIndex: CellIndex,
    message: Schema.String,
  },
) {}

export class NoCandidatesRemainingError extends Schema.TaggedError<NoCandidatesRemainingError>()(
  "NoCandidatesRemainingError",
  {
    cellIndex: CellIndex,
    message: Schema.String,
  },
) {}

export class InvalidPuzzleError extends Schema.TaggedError<InvalidPuzzleError>()(
  "InvalidPuzzleError",
  {
    message: Schema.String,
    cause: Schema.optional(Schema.String),
  },
) {}

export class GenerationError extends Schema.TaggedError<GenerationError>()("GenerationError", {
  message: Schema.String,
  difficulty: Schema.optional(DifficultyLevel),
}) {}

export class SolveError extends Schema.TaggedError<SolveError>()("SolveError", {
  message: Schema.String,
}) {}

export const SolutionStep = Schema.Struct({
  technique: Technique,
  cell: CellIndex,
  value: CellValue,
  candidates: Schema.optional(Candidates),
  description: Schema.optional(Schema.String),
})
export type SolutionStep = typeof SolutionStep.Type

export const SolutionResult = Schema.Struct({
  solved: Schema.Boolean,
  solutionCount: Schema.Number,
  steps: Schema.Array(SolutionStep),
  finalGrid: Schema.optional(Schema.String),
})
export type SolutionResult = typeof SolutionResult.Type

export const Puzzle = Schema.Struct({
  grid: Schema.String,
  solution: Schema.String,
  difficulty: DifficultyLevel,
  score: Schema.Number,
  clues: Schema.Number,
  techniques: Schema.Array(Technique),
})
export type Puzzle = typeof Puzzle.Type

export const GenerateOptions = Schema.Struct({
  difficulty: Schema.optionalWith(DifficultyLevel, { default: () => "MEDIUM" }),
  symmetric: Schema.optionalWith(Schema.Boolean, { default: () => false }),
  minClues: Schema.optionalWith(Schema.Number, { default: () => 17 }),
  maxAttempts: Schema.optionalWith(Schema.Number, { default: () => 10000 }),
})
export type GenerateOptions = typeof GenerateOptions.Type
