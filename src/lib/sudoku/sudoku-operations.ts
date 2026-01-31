import type {
  AnalyzeData,
  Board,
  Difficulty,
  InternalBoard,
  Strategy,
  StrategyResult,
} from "./types"

type OperationsContext = {
  getBoardCells: () => InternalBoard
  setBoardCells: (board: InternalBoard) => void
  getUsedStrategies: () => Array<number>
  setUsedStrategies: (strategies: Array<number>) => void
  getStrategies: () => Array<Strategy>
  applySolvingStrategies: (args?: {
    strategyIndex?: number
    analyzeMode?: boolean
  }) => false | "elimination" | "value"
  isBoardFinished: (board: InternalBoard) => boolean
  filterAndMapStrategies: (
    strategies: Array<Strategy>,
    usedStrategies: Array<number>,
  ) => ({ title: string; freq: number } | null)[]
  calculateBoardDifficulty: (
    usedStrategies: Array<number>,
    strategies: Array<Strategy>,
  ) => { difficulty: Difficulty; score: number }
  cloneBoard: (board: InternalBoard) => InternalBoard
  convertInitialBoardToSerializedBoard: (board: Board) => InternalBoard
  updateCandidatesBasedOnCellsValue: () => StrategyResult
}

export function createSudokuOperations({
  getBoardCells,
  setBoardCells,
  getUsedStrategies,
  setUsedStrategies,
  getStrategies,
  applySolvingStrategies,
  isBoardFinished,
  filterAndMapStrategies,
  calculateBoardDifficulty,
  cloneBoard,
  convertInitialBoardToSerializedBoard,
  updateCandidatesBasedOnCellsValue,
}: OperationsContext) {
  const MAX_ITERATIONS = 30

  const getBoard = (): Board => getBoardCells().map((cell) => cell.value)

  const solveStep = ({
    analyzeMode = false,
    iterationCount = 0,
  }: {
    analyzeMode?: boolean
    iterationCount?: number
  } = {}): Board | false => {
    if (iterationCount >= MAX_ITERATIONS) {
      return false
    }

    const initialBoard = getBoard().slice()
    const result = applySolvingStrategies({ analyzeMode })
    if (result === false) {
      return false
    }
    const stepSolvedBoard = getBoard().slice()

    const boardNotChanged =
      initialBoard.filter(Boolean).length === stepSolvedBoard.filter(Boolean).length
    if (!isBoardFinished(getBoardCells()) && boardNotChanged) {
      return solveStep({ analyzeMode, iterationCount: iterationCount + 1 })
    }
    setBoardCells(convertInitialBoardToSerializedBoard(stepSolvedBoard))
    updateCandidatesBasedOnCellsValue()
    return getBoard()
  }

  const solveAll = (): Board => {
    let Continue: false | "value" | "elimination" = "value"
    while (Continue !== false) {
      Continue = applySolvingStrategies({
        strategyIndex: Continue === "elimination" ? 1 : 0,
      })
    }
    return getBoard()
  }

  function analyzeBoard() {
    const usedStrategiesClone = getUsedStrategies().slice()
    const boardClone = cloneBoard(getBoardCells())

    let Continue: false | "value" | "elimination" = "value"
    let data: AnalyzeData = { hasSolution: false, usedStrategies: [] }
    try {
      while (Continue !== false) {
        Continue = applySolvingStrategies({
          strategyIndex: Continue === "elimination" ? 1 : 0,
          analyzeMode: true,
        })
      }
      data = {
        hasSolution: isBoardFinished(getBoardCells()),
        usedStrategies: filterAndMapStrategies(getStrategies(), getUsedStrategies()),
      }

      if (data.hasSolution) {
        const boardDiff = calculateBoardDifficulty(getUsedStrategies(), getStrategies())
        data.difficulty = boardDiff.difficulty
        data.score = boardDiff.score
      }
    } finally {
      setUsedStrategies(usedStrategiesClone.slice())
      setBoardCells(boardClone)
    }
    return data
  }

  return { analyzeBoard, solveStep, solveAll, getBoard }
}
