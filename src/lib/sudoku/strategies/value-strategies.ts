import type {
  CellValue,
  Difficulty,
  InternalBoard,
  Strategy,
  StrategyResult,
  House,
} from "../types"
import type { StrategyHelpers } from "./strategy-helpers"

type ValueStrategyContext = {
  getBoard: () => InternalBoard
  getUsedStrategies: () => Array<number>
  getStrategies: () => Array<Strategy>
  groupOfHouses: Array<Array<House>>
  boardSize: number
  addValueToCellIndex: (board: InternalBoard, cellIndex: number, value: CellValue) => void
  calculateBoardDifficulty: (
    usedStrategies: Array<number>,
    strategies: Array<Strategy>,
  ) => { difficulty: Difficulty; score: number }
  onError?: (args: { message: string }) => void
  onFinish?: (args: { difficulty: Difficulty; score: number }) => void
  isBoardFinished: (board: InternalBoard) => boolean
  helpers: StrategyHelpers
}

export function createValueStrategies({
  getBoard,
  getUsedStrategies,
  getStrategies,
  groupOfHouses,
  boardSize,
  addValueToCellIndex,
  calculateBoardDifficulty,
  onError,
  onFinish,
  isBoardFinished,
  helpers,
}: ValueStrategyContext) {
  const { getRemainingNumbers, getUsedNumbers } = helpers

  function findSingleEmptyCellInHouse(house: House) {
    const board = getBoard()
    const emptyCells = []

    for (let k = 0; k < boardSize; k++) {
      const boardIndex = house[k]
      if (boardIndex === undefined) continue
      const cell = board[boardIndex]
      if (cell === undefined) continue
      if (cell.value === null) {
        emptyCells.push({ house: house, cellIndex: boardIndex })
        if (emptyCells.length > 1) {
          break
        }
      }
    }

    return emptyCells.length === 1 ? emptyCells[0] : null
  }

  function fillSingleEmptyCell(emptyCell: { house: number[]; cellIndex: number }): StrategyResult {
    const board = getBoard()
    const value = getRemainingNumbers(emptyCell.house)

    if (value.length > 1) {
      onError?.({ message: "Board Incorrect" })
      return { kind: "error" }
    }

    const filledValue = value[0]
    if (filledValue === undefined) {
      onError?.({ message: "Board Incorrect" })
      return { kind: "error" }
    }
    addValueToCellIndex(board, emptyCell.cellIndex, filledValue) //does not update UI
    return { kind: "updates", updates: [{ index: emptyCell.cellIndex, filledValue }] }
  }

  function openSinglesStrategy(): StrategyResult {
    const board = getBoard()

    for (let i = 0; i < groupOfHouses.length; i++) {
      for (let j = 0; j < boardSize; j++) {
        const houseGroup = groupOfHouses[i]
        if (houseGroup === undefined) continue
        const house = houseGroup[j]
        if (house === undefined) continue
        const singleEmptyCell = findSingleEmptyCellInHouse(house)

        if (singleEmptyCell) {
          const result = fillSingleEmptyCell(singleEmptyCell)
          return result
        }

        if (isBoardFinished(board)) {
          onFinish?.(calculateBoardDifficulty(getUsedStrategies(), getStrategies()))
          return { kind: "none" }
        }
      }
    }
    return { kind: "none" }
  }

  function updateCandidatesBasedOnCellsValue(): StrategyResult {
    const board = getBoard()
    const groupOfHousesLength = groupOfHouses.length

    for (let houseType = 0; houseType < groupOfHousesLength; houseType++) {
      for (let houseIndex = 0; houseIndex < boardSize; houseIndex++) {
        const houseGroup = groupOfHouses[houseType]
        if (houseGroup === undefined) continue
        const house = houseGroup[houseIndex]
        if (house === undefined) continue
        const candidatesToRemove = getUsedNumbers(house)

        for (let cellIndex = 0; cellIndex < boardSize; cellIndex++) {
          const houseCellIndex = house[cellIndex]
          if (houseCellIndex === undefined) continue
          const cell = board[houseCellIndex]
          if (cell === undefined) continue
          cell.candidates = cell.candidates.filter(
            (candidate) => candidate === null || !candidatesToRemove.includes(candidate),
          )
        }
      }
    }

    return { kind: "none" }
  }

  function findSingleCandidateCellForDigit(house: House, digit: number): number | null {
    const board = getBoard()
    let match: number | null = null
    for (let cellIndex = 0; cellIndex < boardSize; cellIndex++) {
      const cell = house[cellIndex]
      if (cell === undefined) continue
      const boardCell = board[cell]
      if (boardCell === undefined) continue
      if (!boardCell.candidates.includes(digit)) continue
      if (match !== null) {
        return null
      }
      match = cell
    }
    return match
  }

  function singleCandidateStrategy(): StrategyResult {
    const board = getBoard()
    const groupOfHousesLength = groupOfHouses.length

    for (let houseType = 0; houseType < groupOfHousesLength; houseType++) {
      for (let houseIndex = 0; houseIndex < boardSize; houseIndex++) {
        const houseGroup = groupOfHouses[houseType]
        if (houseGroup === undefined) continue
        const house = houseGroup[houseIndex]
        if (house === undefined) continue
        const digits = getRemainingNumbers(house)

        for (let digitIndex = 0; digitIndex < digits.length; digitIndex++) {
          const digit = digits[digitIndex]
          if (digit === undefined) continue
          const cellIndex = findSingleCandidateCellForDigit(house, digit)
          if (cellIndex !== null) {
            addValueToCellIndex(board, cellIndex, digit)

            return { kind: "updates", updates: [{ index: cellIndex, filledValue: digit }] }
          }
        }
      }
    }

    return { kind: "none" }
  }

  function visualEliminationStrategy(): StrategyResult {
    const board = getBoard()
    for (let cellIndex = 0; cellIndex < board.length; cellIndex++) {
      const cell = board[cellIndex]
      if (cell === undefined) continue
      const candidates = cell.candidates

      const possibleCandidates: number[] = []
      for (let candidateIndex = 0; candidateIndex < candidates.length; candidateIndex++) {
        const candidateValue = candidates[candidateIndex]
        if (candidateValue === undefined) continue
        if (candidateValue !== null) {
          possibleCandidates.push(candidateValue)
        }

        if (possibleCandidates.length > 1) {
          break
        }
      }

      if (possibleCandidates.length === 1) {
        const digit = possibleCandidates[0]
        if (digit === undefined) continue

        addValueToCellIndex(board, cellIndex, digit)

        return { kind: "updates", updates: [{ index: cellIndex, filledValue: digit }] }
      }
    }

    return { kind: "none" }
  }

  return {
    openSinglesStrategy,
    updateCandidatesBasedOnCellsValue,
    singleCandidateStrategy,
    visualEliminationStrategy,
  }
}
