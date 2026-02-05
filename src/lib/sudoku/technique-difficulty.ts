import { DifficultyLevel } from "./difficulty.ts"
import { Technique } from "./puzzle.ts"

export const TECHNIQUE_DIFFICULTY: Record<Technique, DifficultyLevel> = {
  // Level 1: Singles only
  FULL_HOUSE: "EASY",
  NAKED_SINGLE: "EASY",
  HIDDEN_SINGLE: "EASY",

  // Level 2: Basic intersections
  LOCKED_CANDIDATES: "MEDIUM",
  LOCKED_PAIR: "MEDIUM",
  LOCKED_TRIPLE: "MEDIUM",

  // Level 3: Subsets - pairs and triples
  NAKED_PAIR: "HARD",
  HIDDEN_PAIR: "HARD",
  NAKED_TRIPLE: "HARD",
  HIDDEN_TRIPLE: "HARD",

  // Level 4: Quads + simple fish patterns
  NAKED_QUADRUPLE: "EXPERT",
  HIDDEN_QUADRUPLE: "EXPERT",
  SKYSCRAPER: "EXPERT",
  TWO_STRING_KITE: "EXPERT",

  // Level 5: Advanced fish
  X_WING: "EXTREME",
  TURBOT_FISH: "EXTREME",

  // Level 6: Complex patterns
  SWORDFISH: "DIABOLICAL",
}
