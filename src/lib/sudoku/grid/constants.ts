// Grid Constants

export const GRID_SIZE = 81
export const ROW_SIZE = 9
export const COL_SIZE = 9
export const BLOCK_SIZE = 3

// Candidate masks for values 1-9
export const CANDIDATE_MASKS = [
  0b000000000, // 0 - not valid
  0b000000001, // 1
  0b000000010, // 2
  0b000000100, // 3
  0b000001000, // 4
  0b000010000, // 5
  0b000100000, // 6
  0b001000000, // 7
  0b010000000, // 8
  0b100000000, // 9
] as const

export const ALL_CANDIDATES = 0b111111111
