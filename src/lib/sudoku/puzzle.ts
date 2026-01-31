import { Schema } from "effect"

import { DifficultyLevel } from "./difficulty.ts"
import { Technique } from "./techniques.ts"

export const CellIndex = Schema.Number.pipe(
  Schema.int(),
  Schema.between(0, 80),
  Schema.brand("CellIndex"),
)
export type CellIndex = typeof CellIndex.Type

export const CellValue = Schema.Number.pipe(
  Schema.int(),
  Schema.between(0, 9),
  Schema.brand("CellValue"),
)
export type CellValue = typeof CellValue.Type

export const Candidates = Schema.Number.pipe(
  Schema.int(),
  Schema.between(0, 511),
  Schema.brand("Candidates"),
)
export type Candidates = typeof Candidates.Type

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
  technique: Schema.String,
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
