import type { Board, InternalBoard, Strategy, Options, StrategyResult } from "./types"

import { createBoardGenerator } from "./board-generation"
import { DIFFICULTY_MEDIUM, BOARD_SIZE, CANDIDATES, NULL_CANDIDATE_LIST } from "./constants"
import { createEliminationStrategies } from "./strategies/elimination-strategies"
import { createHiddenStrategies } from "./strategies/hidden-strategies"
import { createNakedStrategies } from "./strategies/naked-strategies"
import { createStrategyHelpers } from "./strategies/strategy-helpers"
import { createValueStrategies } from "./strategies/value-strategies"
import { createSudokuOperations } from "./sudoku-operations"
import { isUniqueSolution } from "./sudoku-solver"
import {
  addValueToCellIndex,
  calculateBoardDifficulty,
  cloneBoard,
  generateHouseIndexList,
  getRandomCandidateOfCell,
  getRemovalCountBasedOnDifficulty,
  isBoardFinished,
  isEasyEnough,
  isHardEnough,
} from "./utils"

const GROUP_OF_HOUSES = generateHouseIndexList(BOARD_SIZE)

function filterAndMapStrategies(strategies: Array<Strategy>, usedStrategies: Array<number>) {
  return strategies
    .map((strategy, i) =>
      usedStrategies[i] === undefined ? null : { title: strategy.title, freq: usedStrategies[i] },
    )
    .filter(Boolean)
}
export function createSudokuInstance(options: Options = {}) {
  const { onError, onUpdate, onFinish, initBoard, difficulty = DIFFICULTY_MEDIUM } = options

  let board: InternalBoard = []
  let usedStrategies: Array<number> = []

  const resetCandidates = () => {
    board = Array.from({ length: BOARD_SIZE * BOARD_SIZE }, () => null).map((_, index) => {
      const cell = board[index]
      if (cell === undefined) {
        return {
          value: null,
          candidates: CANDIDATES.slice(),
          invalidCandidates: undefined,
        }
      }
      return {
        value: cell.value,
        candidates: cell.value === null ? CANDIDATES.slice() : cell.candidates,
        invalidCandidates: cell.invalidCandidates,
      }
    })
  }
  let strategies: Array<Strategy> = []

  const initializeBoard = () => {
    const alreadyEnhanced = board[0] !== null && typeof board[0] === "object"

    if (!alreadyEnhanced) {
      board = Array.from({ length: BOARD_SIZE * BOARD_SIZE }, (_, index) => {
        const value = initBoard?.[index] ?? null
        const candidates = value === null ? [...CANDIDATES] : [...NULL_CANDIDATE_LIST]

        return { value, candidates }
      })
    }
  }

  const getBoardCells = () => board
  const setBoardCells = (nextBoard: InternalBoard) => {
    board = nextBoard
  }
  const strategyHelpers = createStrategyHelpers({
    getBoard: getBoardCells,
    boardSize: BOARD_SIZE,
    candidates: CANDIDATES,
  })

  const valueStrategies = createValueStrategies({
    getBoard: getBoardCells,
    getUsedStrategies: () => usedStrategies,
    getStrategies: () => strategies,
    groupOfHouses: GROUP_OF_HOUSES,
    boardSize: BOARD_SIZE,
    addValueToCellIndex,
    calculateBoardDifficulty,
    onError,
    onFinish,
    isBoardFinished,
    helpers: strategyHelpers,
  })

  const eliminationStrategies = createEliminationStrategies({
    getBoard: getBoardCells,
    groupOfHouses: GROUP_OF_HOUSES,
    boardSize: BOARD_SIZE,
    helpers: strategyHelpers,
  })
  const nakedStrategies = createNakedStrategies({
    groupOfHouses: GROUP_OF_HOUSES,
    boardSize: BOARD_SIZE,
    helpers: strategyHelpers,
  })
  const hiddenStrategies = createHiddenStrategies({
    groupOfHouses: GROUP_OF_HOUSES,
    boardSize: BOARD_SIZE,
    helpers: strategyHelpers,
  })
  const {
    openSinglesStrategy,
    updateCandidatesBasedOnCellsValue,
    visualEliminationStrategy,
    singleCandidateStrategy,
  } = valueStrategies
  const { pointingEliminationStrategy } = eliminationStrategies
  const { nakedPairStrategy, nakedTripletStrategy, nakedQuadrupleStrategy } = nakedStrategies
  const { hiddenPairStrategy, hiddenTripletStrategy, hiddenQuadrupleStrategy } = hiddenStrategies
  strategies = [
    {
      postFn: updateCandidatesBasedOnCellsValue,
      title: "Open Singles Strategy",
      fn: openSinglesStrategy,
      score: 0.1,
      type: "value",
    },
    {
      postFn: updateCandidatesBasedOnCellsValue,
      title: "Visual Elimination Strategy",
      fn: visualEliminationStrategy,
      score: 9,
      type: "value",
    },
    {
      postFn: updateCandidatesBasedOnCellsValue,
      title: "Single Candidate Strategy",
      fn: singleCandidateStrategy,
      score: 8,
      type: "value",
    },
    {
      title: "Naked Pair Strategy",
      fn: nakedPairStrategy,
      score: 50,
      type: "elimination",
    },
    {
      title: "Pointing Elimination Strategy",
      fn: pointingEliminationStrategy,
      score: 80,
      type: "elimination",
    },
    {
      title: "Hidden Pair Strategy",
      fn: hiddenPairStrategy,
      score: 90,
      type: "elimination",
    },
    {
      title: "Naked Triplet Strategy",
      fn: nakedTripletStrategy,
      score: 100,
      type: "elimination",
    },
    {
      title: "Hidden Triplet Strategy",
      fn: hiddenTripletStrategy,
      score: 140,
      type: "elimination",
    },
    {
      title: "Naked Quadruple Strategy",
      fn: nakedQuadrupleStrategy,
      score: 150,
      type: "elimination",
    },
    {
      title: "Hidden Quadruple Strategy",
      fn: hiddenQuadrupleStrategy,
      score: 280,
      type: "elimination",
    },
  ]

  const convertInitialBoardToSerializedBoard = (_board: Board): InternalBoard => {
    return Array.from({ length: BOARD_SIZE * BOARD_SIZE }, () => null).map((_, i) => {
      const value = _board[i] ?? null
      const candidates = value === null ? [...CANDIDATES] : [...NULL_CANDIDATE_LIST]

      return { value, candidates }
    })
  }

  const applySolvingStrategies = ({
    strategyIndex = 0,
    analyzeMode = false,
  }: {
    strategyIndex?: number
    analyzeMode?: boolean
  } = {}): false | "elimination" | "value" => {
    if (isBoardFinished(board)) {
      if (!analyzeMode) {
        onFinish?.(calculateBoardDifficulty(usedStrategies, strategies))
      }
      return false
    }
    const strategy = strategies[strategyIndex]
    if (strategy === undefined) {
      onError?.({ message: "No More Strategies To Solve The Board" })
      return false
    }
    const result: StrategyResult = strategy.fn()

    strategy.postFn?.()

    if (result.kind === "none") {
      if (strategies.length > strategyIndex + 1) {
        return applySolvingStrategies({
          strategyIndex: strategyIndex + 1,
          analyzeMode,
        })
      }
      onError?.({ message: "No More Strategies To Solve The Board" })
      return false
    }
    if (result.kind === "error") {
      return false
    }

    if (!analyzeMode) {
      onUpdate?.({
        strategy: strategy.title,
        updates: result.updates,
        type: strategy.type,
      })
    }

    usedStrategies[strategyIndex] ??= 0

    usedStrategies[strategyIndex] += 1
    return strategy.type
  }

  const { analyzeBoard, solveStep, solveAll, getBoard } = createSudokuOperations({
    getBoardCells,
    setBoardCells,
    getUsedStrategies: () => usedStrategies,
    setUsedStrategies: (next) => {
      usedStrategies = next
    },
    getStrategies: () => strategies,
    applySolvingStrategies,
    isBoardFinished,
    filterAndMapStrategies,
    calculateBoardDifficulty,
    cloneBoard,
    convertInitialBoardToSerializedBoard,
    updateCandidatesBasedOnCellsValue,
  })

  const { generateBoard } = createBoardGenerator({
    getBoardCells,
    setBoardCells,
    getBoardValues: () => board.map((cell) => cell.value),
    boardSize: BOARD_SIZE,
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
  })

  if (initBoard) {
    board = convertInitialBoardToSerializedBoard(initBoard)
    updateCandidatesBasedOnCellsValue()
    analyzeBoard()
  } else {
    initializeBoard()
    generateBoard()
  }

  return {
    solveAll,
    solveStep,
    analyzeBoard,
    getBoard,
    generateBoard,
  }
}
