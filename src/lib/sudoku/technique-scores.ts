import { Technique } from "./puzzle.ts"

// HoDoKu-style base scores
export const TECHNIQUE_SCORES: Record<Technique, number> = {
  // Singles (EASY)
  FULL_HOUSE: 4,
  NAKED_SINGLE: 4,
  HIDDEN_SINGLE: 14,

  // Intersections (MEDIUM)
  LOCKED_PAIR: 40,
  LOCKED_TRIPLE: 60,
  LOCKED_CANDIDATES: 50,

  // Subsets (HARD in our system, but keep scores)
  NAKED_PAIR: 60,
  NAKED_TRIPLE: 80,
  NAKED_QUADRUPLE: 120,
  HIDDEN_PAIR: 70,
  HIDDEN_TRIPLE: 100,
  HIDDEN_QUADRUPLE: 150,

  // Fish/Single Digit Patterns (HoDoKu scores)
  SKYSCRAPER: 130, // was 200
  TWO_STRING_KITE: 150, // was 190
  TURBOT_FISH: 120, // was 195
  X_WING: 140, // was 180
  SWORDFISH: 150, // was 250
}
