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
  const setBoardCellWithRandomCandidate = (cellIndex: number) => {
    updateCandidatesBasedOnCellsValue()
    const board = getBoardCells()
    const invalids = board[cellIndex]!.invalidCandidates ?? []
    const candidates = board[cellIndex]!.candidates.filter(
      (candidate): candidate is number => candidate !== null && !invalids.includes(candidate),
    )
    if (candidates.length === 0) {
      return false
    }
    const value = getRandomCandidateOfCell(candidates)
    addValueToCellIndex(board, cellIndex, value!)
    return true
  }

  const invalidPreviousCandidateAndStartOver = (cellIndex: number) => {
    const board = getBoardCells()
    const previousIndex = cellIndex - 1
    board[previousIndex]!.invalidCandidates = board[previousIndex]!.invalidCandidates ?? []

    const prevValue = board[previousIndex]!.value
    if (prevValue !== null) {
      board[previousIndex]!.invalidCandidates?.push(prevValue)
    }

    addValueToCellIndex(board, previousIndex, null)
    resetCandidates()
    board[cellIndex]!.invalidCandidates = []
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
      const cellIndex = cells.splice(randIndex, 1)[0]!
      const cellValue = board[cellIndex]!.value
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

    while (isBoardTooEasy()) {
      restoreBoardAnswer()
    }

    updateCandidatesBasedOnCellsValue()
    return getBoardValues()
  }

  return {
    generateBoard,
  }
}
