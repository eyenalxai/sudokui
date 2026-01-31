import {
  DIFFICULTY_EASY,
  DIFFICULTY_HARD,
  DIFFICULTY_MEDIUM,
  DIFFICULTY_EXPERT,
  SOLVE_MODE_STEP,
  SOLVE_MODE_ALL,
  DIFFICULTY_MASTER,
} from "./constants"

export type Difficulty =
  | typeof DIFFICULTY_EASY
  | typeof DIFFICULTY_MEDIUM
  | typeof DIFFICULTY_HARD
  | typeof DIFFICULTY_EXPERT
  | typeof DIFFICULTY_MASTER

export type Board = Array<number | null>
export type CellValue = number | null

export type Cell = {
  value: CellValue
  candidates: Array<CellValue>
  invalidCandidates?: Array<CellValue>
}

export type InternalBoard = Array<Cell>

export type EliminationUpdate = {
  index: number
  eliminatedCandidate: number
}

export type ValueUpdate = {
  index: number
  filledValue: number
}

export type Update = EliminationUpdate | ValueUpdate

export type StrategyResult = ValueUpdate[] | EliminationUpdate[] | false | -1

export type StrategyFn = () => StrategyResult

export interface Strategy {
  title: string
  score: number
  fn: StrategyFn
  postFn?: () => void
  prevFn?: () => void
  type: "value" | "elimination"
}

export interface SolvingStep {
  strategy: string
  updates: Array<Update>
  type: "value" | "elimination"
}

export interface SolvingResult {
  solved: boolean
  board?: Board
  steps?: SolvingStep[]
  analysis?: AnalyzeData
  error?: string
}

export interface Options {
  onError?: (args: { message: string }) => void
  onFinish?: (args: { difficulty: Difficulty; score: number }) => void
  onUpdate?: ({ strategy, updates, type }: SolvingStep) => void
  initBoard?: Board
  difficulty?: Difficulty
}

export type House = Array<number>
export type Houses = Array<House>

export type AnalyzeData = {
  hasSolution: boolean
  hasUniqueSolution?: boolean
  usedStrategies?: ({
    title: string
    freq: number
  } | null)[]
  difficulty?: Difficulty
  score?: number
}

export type SolveType = typeof SOLVE_MODE_STEP | typeof SOLVE_MODE_ALL
