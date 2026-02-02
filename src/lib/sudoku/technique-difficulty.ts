import { DifficultyLevel } from "./difficulty.ts"
import { Technique } from "./technique.ts"

export const TECHNIQUE_DIFFICULTY: Record<Technique, DifficultyLevel> = {
  FULL_HOUSE: "EASY",
  NAKED_SINGLE: "EASY",
  HIDDEN_SINGLE: "EASY",
  LOCKED_PAIR: "MEDIUM",
  LOCKED_TRIPLE: "MEDIUM",
  LOCKED_CANDIDATES: "MEDIUM",
  NAKED_PAIR: "MEDIUM",
  NAKED_TRIPLE: "MEDIUM",
  HIDDEN_PAIR: "MEDIUM",
  HIDDEN_TRIPLE: "MEDIUM",
  NAKED_QUADRUPLE: "HARD",
  HIDDEN_QUADRUPLE: "HARD",
}
