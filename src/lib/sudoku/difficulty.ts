import { Schema } from "effect"

// =============================================================================
// Difficulty Levels (matching Hodoku)
// =============================================================================

export const DifficultyLevel = Schema.Literal(
  "INCOMPLETE",
  "EASY",
  "MEDIUM",
  "HARD",
  "UNFAIR",
  "EXTREME",
)
export type DifficultyLevel = typeof DifficultyLevel.Type

// Hodoku score thresholds
export const DIFFICULTY_THRESHOLDS: Record<DifficultyLevel, number> = {
  INCOMPLETE: 0,
  EASY: 800,
  MEDIUM: 1000,
  HARD: 1600,
  UNFAIR: 1800,
  EXTREME: Number.MAX_SAFE_INTEGER,
}
