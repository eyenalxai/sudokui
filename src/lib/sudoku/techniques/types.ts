import { Schema } from "effect"

// =============================================================================
// Solving Techniques (matching Hodoku)
// =============================================================================

export const Technique = Schema.Literal(
  // Singles
  "FULL_HOUSE",
  "NAKED_SINGLE",
  "HIDDEN_SINGLE",

  // Intersections
  "LOCKED_PAIR",
  "LOCKED_TRIPLE",
  "LOCKED_CANDIDATES",

  // Subsets
  "NAKED_PAIR",
  "NAKED_TRIPLE",
  "NAKED_QUADRUPLE",
  "HIDDEN_PAIR",
  "HIDDEN_TRIPLE",
  "HIDDEN_QUADRUPLE",

  // Basic Fish
  "X_WING",
  "SWORDFISH",
  "JELLYFISH",
  "SQUIRMBAG",
  "WHALE",
  "LEVIATHAN",

  // Finned Fish
  "FINNED_X_WING",
  "FINNED_SWORDFISH",
  "FINNED_JELLYFISH",
  "FINNED_SQUIRMBAG",
  "FINNED_WHALE",
  "FINNED_LEVIATHAN",
  "SASHIMI_X_WING",
  "SASHIMI_SWORDFISH",
  "SASHIMI_JELLYFISH",
  "SASHIMI_SQUIRMBAG",
  "SASHIMI_WHALE",
  "SASHIMI_LEVIATHAN",

  // Franken/Mutant Fish
  "FRANKEN_X_WING",
  "FRANKEN_SWORDFISH",
  "FRANKEN_JELLYFISH",
  "FRANKEN_SQUIRMBAG",
  "FRANKEN_WHALE",
  "FRANKEN_LEVIATHAN",
  "MUTANT_X_WING",
  "MUTANT_SWORDFISH",
  "MUTANT_JELLYFISH",
  "MUTANT_SQUIRMBAG",
  "MUTANT_WHALE",
  "MUTANT_LEVIATHAN",
  "FINNED_FRANKEN_X_WING",
  "FINNED_FRANKEN_SWORDFISH",
  "FINNED_FRANKEN_JELLYFISH",
  "FINNED_FRANKEN_SQUIRMBAG",
  "FINNED_FRANKEN_WHALE",
  "FINNED_FRANKEN_LEVIATHAN",
  "FINNED_MUTANT_X_WING",
  "FINNED_MUTANT_SWORDFISH",
  "FINNED_MUTANT_JELLYFISH",
  "FINNED_MUTANT_SQUIRMBAG",
  "FINNED_MUTANT_WHALE",
  "FINNED_MUTANT_LEVIATHAN",

  // Single Digit Patterns
  "SKYSCRAPER",
  "TWO_STRING_KITE",
  "EMPTY_RECTANGLE",

  // Wings
  "XY_WING",
  "XYZ_WING",
  "W_WING",

  // Chains
  "X_CHAIN",
  "XY_CHAIN",
  "REMOTE_PAIR",
  "NICE_LOOP",
  "CONTINUOUS_NICE_LOOP",
  "DISCONTINUOUS_NICE_LOOP",
  "AIC",

  // Colors
  "SIMPLE_COLORS",
  "MULTI_COLORS",

  // Uniqueness
  "UNIQUENESS_1",
  "UNIQUENESS_2",
  "UNIQUENESS_3",
  "UNIQUENESS_4",
  "UNIQUENESS_5",
  "UNIQUENESS_6",
  "BUG_PLUS_1",
  "HIDDEN_RECTANGLE",

  // ALS
  "ALS_XZ",
  "ALS_XY_WING",
  "ALS_XY_CHAIN",
  "DEATH_BLOSSOM",

  // Advanced
  "SUE_DE_COQ",
  "TEMPLATE_SET",
  "TEMPLATE_DEL",

  // Last Resort
  "FORCING_CHAIN",
  "FORCING_NET",
  "BRUTE_FORCE",
)

export type Technique = typeof Technique.Type
