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

// HoDoKu-style max scores for each difficulty level
export const DIFFICULTY_MAX_SCORES: Record<DifficultyLevel, number> = {
  INCOMPLETE: 0,
  EASY: 800,
  MEDIUM: 1000,
  HARD: 1600,
  EXPERT: 1800, // HoDoKu calls this "UNFAIR"
  EXTREME: Number.MAX_SAFE_INTEGER,
  DIABOLICAL: Number.MAX_SAFE_INTEGER,
}

const DIFFICULTY_ORDER: DifficultyLevel[] = [
  "INCOMPLETE",
  "EASY",
  "MEDIUM",
  "HARD",
  "EXPERT",
  "EXTREME",
  "DIABOLICAL",
]

export const getDifficultyIndex = (difficulty: DifficultyLevel): number =>
  DIFFICULTY_ORDER.indexOf(difficulty)

export const isDifficultyGreaterThan = (
  difficulty1: DifficultyLevel,
  difficulty2: DifficultyLevel,
): boolean => getDifficultyIndex(difficulty1) > getDifficultyIndex(difficulty2)
