import type { AnalyzeData, Board, CellValue, Difficulty, InternalBoard } from "./types"

type BoardGenerationContext = {
  getBoardCells: () => InternalBoard
  setBoardCells: (board: InternalBoard) => void
  getBoardValues: () => Board
  boardSize: number
  difficulty: Difficulty
  updateCandidatesBasedOnCellsValue: () => boolean
  resetCandidates: () => void
  addValueToCellIndex: (board: InternalBoard, cellIndex: number, value: CellValue) => void
  getRandomCandidateOfCell: (candidates: Array<CellValue>) => CellValue | undefined
  cloneBoard: (board: InternalBoard) => InternalBoard
  analyzeBoard: () => AnalyzeData
  isUniqueSolution: (board: Board) => boolean
  getRemovalCountBasedOnDifficulty: (difficulty: Difficulty) => number
  isEasyEnough: (difficulty: Difficulty, boardDifficulty: Difficulty) => boolean
  isHardEnough: (difficulty: Difficulty, boardDifficulty: Difficulty) => boolean
}

export function createBoardGenerator({
  getBoardCells,
  setBoardCells,
  getBoardValues,
  boardSize,
  difficulty,
  updateCandidatesBasedOnCellsValue,
  resetCandidates,
  addValueToCellIndex,
  getRandomCandidateOfCell,
  cloneBoard,
  analyzeBoard,
  isUniqueSolution,
  getRemovalCountBasedOnDifficulty,
  isEasyEnough,
  isHardEnough,
}: BoardGenerationContext) {
  const MAX_GENERATE_ATTEMPTS = 50
  const setBoardCellWithRandomCandidate = (cellIndex: number) => {
    updateCandidatesBasedOnCellsValue()
    const board = getBoardCells()
    const cell = board[cellIndex]
    if (cell === undefined) {
      return false
    }
    const invalids = cell.invalidCandidates ?? []
    const candidates = cell.candidates.filter(
      (candidate): candidate is number => candidate !== null && !invalids.includes(candidate),
    )
    if (candidates.length === 0) {
      return false
    }
    const value = getRandomCandidateOfCell(candidates)
    if (value === undefined) {
      return false
    }
    addValueToCellIndex(board, cellIndex, value)
    return true
  }

  const invalidPreviousCandidateAndStartOver = (cellIndex: number) => {
    const board = getBoardCells()
    const previousIndex = cellIndex - 1
    const previousCell = board[previousIndex]
    if (previousCell === undefined) {
      return
    }
    previousCell.invalidCandidates = previousCell.invalidCandidates ?? []

    const prevValue = previousCell.value
    if (prevValue !== null) {
      previousCell.invalidCandidates?.push(prevValue)
    }

    addValueToCellIndex(board, previousIndex, null)
    resetCandidates()
    const currentCell = board[cellIndex]
    if (currentCell === undefined) {
      return
    }
    currentCell.invalidCandidates = []
    generateBoardAnswerRecursively(previousIndex)
  }

  const generateBoardAnswerRecursively = (cellIndex: number) => {
    if (cellIndex + 1 > boardSize * boardSize) {
      const board = getBoardCells()
      for (const cell of board) {
        cell.invalidCandidates = []
      }
      return true
    }
    if (setBoardCellWithRandomCandidate(cellIndex)) {
      generateBoardAnswerRecursively(cellIndex + 1)
    } else {
      invalidPreviousCandidateAndStartOver(cellIndex)
    }
  }

  function isValidAndEasyEnough(analysis: AnalyzeData, difficultyLevel: Difficulty): boolean {
    return (
      analysis.hasSolution &&
      analysis.difficulty !== undefined &&
      isEasyEnough(difficultyLevel, analysis.difficulty)
    )
  }

  // Function to prepare the game board
  const prepareGameBoard = () => {
    const board = getBoardCells()
    const cells = Array.from({ length: boardSize * boardSize }, (_, i) => i)
    let removalCount = getRemovalCountBasedOnDifficulty(difficulty)
    while (removalCount > 0 && cells.length > 0) {
      const randIndex = Math.floor(Math.random() * cells.length)
      const cellIndex = cells.splice(randIndex, 1)[0]
      if (cellIndex === undefined) continue
      const cell = board[cellIndex]
      if (cell === undefined) continue
      const cellValue = cell.value
      // Remove value from this cell
      addValueToCellIndex(board, cellIndex, null)
      // Reset candidates, only in model.
      resetCandidates()
      const boardAnalysis = analyzeBoard()
      if (isValidAndEasyEnough(boardAnalysis, difficulty) && isUniqueSolution(getBoardValues())) {
        removalCount--
      } else {
        // Reset - don't dig this cell
        addValueToCellIndex(board, cellIndex, cellValue)
      }
    }
  }

  function generateBoard(): Board {
    generateBoardAnswerRecursively(0)

    const slicedBoard = cloneBoard(getBoardCells())

    function isBoardTooEasy() {
      prepareGameBoard()
      const data = analyzeBoard()
      if (data.hasSolution && data.difficulty) {
        return !isHardEnough(difficulty, data.difficulty)
      }
      return true
    }

    function restoreBoardAnswer() {
      setBoardCells(slicedBoard)
    }

    for (let attempt = 0; attempt < MAX_GENERATE_ATTEMPTS; attempt++) {
      if (!isBoardTooEasy()) {
        break
      }
      restoreBoardAnswer()
    }

    updateCandidatesBasedOnCellsValue()
    return getBoardValues()
  }

  return {
    generateBoard,
  }
}
