export type { CellIndex, CellValue, Candidates } from "./puzzle.ts"
export type { SolutionStep, SolutionResult } from "./puzzle.ts"
export type { Puzzle, GenerateOptions } from "./puzzle.ts"
export type { DifficultyLevel } from "./difficulty.ts"
export type { Technique } from "./techniques.ts"

export { SudokuGrid, CANDIDATE_MASKS, ALL_CANDIDATES } from "./grid.ts"
export {
  getPeers,
  getRowIndices,
  getColIndices,
  getBlockIndices,
  indexToRow,
  indexToCol,
  indexToBlock,
  rowColToIndex,
  parsePuzzle,
  gridToString,
  countCandidates,
  getSingleCandidate,
  getCandidatesArray,
} from "./grid.ts"

export { SolutionFinder } from "./solver.ts"
export { DifficultyScorer } from "./scorer.ts"
export { PuzzleGenerator } from "./generator.ts"

export { DifficultyLevel as DifficultyLevelSchema, DIFFICULTY_THRESHOLDS } from "./difficulty.ts"
export {
  Technique as TechniqueSchema,
  TECHNIQUE_SCORES,
  TECHNIQUE_DIFFICULTY,
} from "./techniques.ts"

export { InvalidPuzzleError, GenerationError, SolveError } from "./puzzle.ts"
