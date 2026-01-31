import type { CellValue, EliminationUpdate, House, InternalBoard } from "../types"

export type StrategyHelpersContext = {
  getBoard: () => InternalBoard
  boardSize: number
  candidates: number[]
}

export function createStrategyHelpers({ getBoard, boardSize, candidates }: StrategyHelpersContext) {
  const applyCandidateRemovals = (
    cells: Array<number>,
    candidatesToRemove: Array<CellValue>,
  ): EliminationUpdate[] => {
    const cellsUpdated: EliminationUpdate[] = []
    const board = getBoard()

    for (let i = 0; i < cells.length; i++) {
      const cellIndex = cells[i]
      if (cellIndex === undefined) continue
      const cell = board[cellIndex]
      if (cell === undefined) continue
      const cellCandidates = cell.candidates

      for (let j = 0; j < candidatesToRemove.length; j++) {
        const candidate = candidatesToRemove[j]
        //-1 because candidate '1' is at index 0 etc.
        if (
          candidate !== null &&
          candidate !== undefined &&
          cellCandidates[candidate - 1] !== null
        ) {
          cellCandidates[candidate - 1] = null //NOTE: also deletes them from board variable
          cellsUpdated.push({
            index: cellIndex,
            eliminatedCandidate: candidate,
          }) //will push same cell multiple times
        }
      }
    }
    return cellsUpdated
  }

  const housesWithCell = (cellIndex: number) => {
    const boxSideSize = Math.sqrt(boardSize)
    const groupOfHouses = []
    const horizontalRow = Math.floor(cellIndex / boardSize)
    groupOfHouses.push(horizontalRow)
    const verticalRow = Math.floor(cellIndex % boardSize)
    groupOfHouses.push(verticalRow)
    const box =
      Math.floor(horizontalRow / boxSideSize) * boxSideSize + Math.floor(verticalRow / boxSideSize)
    groupOfHouses.push(box)

    return groupOfHouses
  }

  const getUsedNumbers = (house: House) => {
    const board = getBoard()
    const usedNumbers: number[] = []
    for (let i = 0; i < house.length; i++) {
      const cellIndex = house[i]
      if (cellIndex === undefined) continue
      const cell = board[cellIndex]
      if (cell === undefined) continue
      if (cell.value !== null) {
        usedNumbers.push(cell.value)
      }
    }
    return usedNumbers
  }

  const getRemainingNumbers = (house: House): Array<number> => {
    const usedNumbers = getUsedNumbers(house)
    return candidates.filter((candidate) => !usedNumbers.includes(candidate))
  }

  const getRemainingCandidates = (cellIndex: number): Array<CellValue> => {
    const board = getBoard()
    const cell = board[cellIndex]
    if (cell === undefined) return []
    return cell.candidates.filter((candidate) => candidate !== null)
  }

  const getPossibleCellsForCandidate = (candidate: number, house: House) => {
    const board = getBoard()
    return house.filter((cellIndex) => {
      const cell = board[cellIndex]
      return cell !== undefined && cell.candidates.includes(candidate)
    })
  }

  return {
    applyCandidateRemovals,
    housesWithCell,
    getRemainingNumbers,
    getUsedNumbers,
    getRemainingCandidates,
    getPossibleCellsForCandidate,
  }
}

export type StrategyHelpers = ReturnType<typeof createStrategyHelpers>
