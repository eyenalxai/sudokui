import { Schema } from "effect"

export const DifficultyLevel = Schema.Literal(
  "INCOMPLETE",
  "EASY",
  "MEDIUM",
  "HARD",
  "EXPERT",
  "EXTREME",
  "DIABOLICAL",
)
export type DifficultyLevel = typeof DifficultyLevel.Type

export const DIFFICULTY_THRESHOLDS: Record<DifficultyLevel, number> = {
  INCOMPLETE: 0,
  EASY: 50,
  MEDIUM: 200,
  HARD: 500,
  EXPERT: 1000,
  EXTREME: 1500,
  DIABOLICAL: Number.MAX_SAFE_INTEGER,
}
