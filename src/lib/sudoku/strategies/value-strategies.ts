import type { CellValue, Difficulty, InternalBoard, Strategy, ValueUpdate, House } from "../types"
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
  contains: (candidates: Array<CellValue>, digit: number) => boolean
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
  contains,
  helpers,
}: ValueStrategyContext) {
  const { getRemainingNumbers, getUsedNumbers } = helpers

  function findSingleEmptyCellInHouse(house: House) {
    const board = getBoard()
    const emptyCells = []

    for (let k = 0; k < boardSize; k++) {
      const boardIndex = house[k]
      if (board[boardIndex!]!.value === null) {
        emptyCells.push({ house: house, cellIndex: boardIndex! })
        if (emptyCells.length > 1) {
          break
        }
      }
    }

    // If only one empty cell found
    return emptyCells.length === 1 ? emptyCells[0] : null
  }

  function fillSingleEmptyCell(emptyCell: {
    house: number[]
    cellIndex: number
  }): ValueUpdate[] | -1 {
    const board = getBoard()
    const value = getRemainingNumbers(emptyCell.house)

    if (value.length > 1) {
      onError?.({ message: "Board Incorrect" })
      return -1
    }

    addValueToCellIndex(board, emptyCell.cellIndex, value[0]!) //does not update UI
    return [{ index: emptyCell.cellIndex, filledValue: value[0]! }]
  }

  function openSinglesStrategy(): ValueUpdate[] | false {
    const board = getBoard()

    for (let i = 0; i < groupOfHouses.length; i++) {
      for (let j = 0; j < boardSize; j++) {
        const singleEmptyCell = findSingleEmptyCellInHouse(groupOfHouses[i]![j]!)

        if (singleEmptyCell) {
          const result = fillSingleEmptyCell(singleEmptyCell)
          if (result === -1) {
            return false
          }
          return result
        }

        if (isBoardFinished(board)) {
          onFinish?.(calculateBoardDifficulty(getUsedStrategies(), getStrategies()))
          return false
        }
      }
    }
    return false
  }

  function updateCandidatesBasedOnCellsValue(): false {
    const board = getBoard()
    const groupOfHousesLength = groupOfHouses.length

    for (let houseType = 0; houseType < groupOfHousesLength; houseType++) {
      for (let houseIndex = 0; houseIndex < boardSize; houseIndex++) {
        const house = groupOfHouses[houseType]![houseIndex]!
        const candidatesToRemove = getUsedNumbers(house)

        for (let cellIndex = 0; cellIndex < boardSize; cellIndex++) {
          const cell = board[house[cellIndex]!]
          cell!.candidates = cell!.candidates.filter(
            (candidate) => !candidatesToRemove.includes(candidate),
          )
        }
      }
    }

    return false
  }

  function findSingleCandidateCellForDigit(house: House, digit: number): number | null {
    const board = getBoard()
    let match: number | null = null
    for (let cellIndex = 0; cellIndex < boardSize; cellIndex++) {
      const cell = house[cellIndex]!
      const boardCell = board[cell]
      if (!contains(boardCell!.candidates, digit)) continue
      if (match !== null) {
        return null
      }
      match = cell
    }
    return match
  }

  function singleCandidateStrategy(): ValueUpdate[] | false {
    const board = getBoard()
    const groupOfHousesLength = groupOfHouses.length

    for (let houseType = 0; houseType < groupOfHousesLength; houseType++) {
      for (let houseIndex = 0; houseIndex < boardSize; houseIndex++) {
        const house = groupOfHouses[houseType]![houseIndex]!
        const digits = getRemainingNumbers(house)

        for (let digitIndex = 0; digitIndex < digits.length; digitIndex++) {
          const digit = digits[digitIndex]!
          const cellIndex = findSingleCandidateCellForDigit(house, digit)
          if (cellIndex !== null) {
            addValueToCellIndex(board, cellIndex, digit)

            return [{ index: cellIndex, filledValue: digit }] // one step at a time
          }
        }
      }
    }

    return false
  }

  function visualEliminationStrategy(): ValueUpdate[] | false {
    const board = getBoard()
    for (let cellIndex = 0; cellIndex < board.length; cellIndex++) {
      const cell = board[cellIndex]
      const candidates = cell!.candidates

      const possibleCandidates: CellValue[] = []
      for (let candidateIndex = 0; candidateIndex < candidates.length; candidateIndex++) {
        const candidateValue = candidates[candidateIndex]!
        if (candidateValue !== null) {
          possibleCandidates.push(candidateValue)
        }

        if (possibleCandidates.length > 1) {
          break // can't find answer here
        }
      }

      if (possibleCandidates.length === 1) {
        const digit = possibleCandidates[0]!

        addValueToCellIndex(board, cellIndex, digit)

        return [{ index: cellIndex, filledValue: digit }] // one step at a time
      }
    }

    return false
  }

  return {
    openSinglesStrategy,
    updateCandidatesBasedOnCellsValue,
    singleCandidateStrategy,
    visualEliminationStrategy,
  }
}
