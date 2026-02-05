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

const ALL_TECHNIQUES: Technique[] = [
  "FULL_HOUSE",
  "NAKED_SINGLE",
  "HIDDEN_SINGLE",
  "LOCKED_CANDIDATES",
  "LOCKED_PAIR",
  "LOCKED_TRIPLE",
  "NAKED_PAIR",
  "HIDDEN_PAIR",
  "NAKED_TRIPLE",
  "HIDDEN_TRIPLE",
  "NAKED_QUADRUPLE",
  "HIDDEN_QUADRUPLE",
  "SKYSCRAPER",
  "TWO_STRING_KITE",
  "X_WING",
  "TURBOT_FISH",
  "SWORDFISH",
]

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

export const getTechniquesAtDifficulty = (difficulty: DifficultyLevel): Technique[] =>
  ALL_TECHNIQUES.filter((tech) => TECHNIQUE_DIFFICULTY[tech] === difficulty)

export const getTechniquesUpToDifficulty = (maxDifficulty: DifficultyLevel): Technique[] => {
  const maxIndex = getDifficultyIndex(maxDifficulty)
  return ALL_TECHNIQUES.filter((tech) => getDifficultyIndex(TECHNIQUE_DIFFICULTY[tech]) <= maxIndex)
}

export const validateTechniquesForDifficulty = (
  techniques: readonly Technique[],
  targetDifficulty: DifficultyLevel,
): { valid: boolean; hasTargetTechnique: boolean; hasHigherTechnique: boolean } => {
  // For INCOMPLETE, any puzzle is valid
  if (targetDifficulty === "INCOMPLETE") {
    return { valid: true, hasTargetTechnique: true, hasHigherTechnique: false }
  }

  // Check if puzzle uses ONLY allowed techniques (up to target difficulty)
  const allowedTechniques = getTechniquesUpToDifficulty(targetDifficulty)
  const hasHigherTechnique = techniques.some((t) => !allowedTechniques.includes(t))

  // For EASY: Can only use EASY techniques (no higher techniques needed)
  if (targetDifficulty === "EASY") {
    return {
      valid: !hasHigherTechnique,
      hasTargetTechnique: true, // EASY puzzles don't need a specific technique
      hasHigherTechnique,
    }
  }

  // For MEDIUM and higher: Must use at least one technique from target level
  const targetTechniques = getTechniquesAtDifficulty(targetDifficulty)
  const hasTargetTechnique = techniques.some((t) => targetTechniques.includes(t))

  return {
    valid: hasTargetTechnique && !hasHigherTechnique,
    hasTargetTechnique,
    hasHigherTechnique,
  }
}
