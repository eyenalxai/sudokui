import type { CellValue, EliminationUpdate, House, InternalBoard } from "../types"

export type StrategyHelpersContext = {
  getBoard: () => InternalBoard
  boardSize: number
  candidates: number[]
}

export function createStrategyHelpers({ getBoard, boardSize, candidates }: StrategyHelpersContext) {
  const removeCandidatesFromMultipleCells = (
    cells: Array<number>,
    candidatesToRemove: Array<CellValue>,
  ): EliminationUpdate[] => {
    const cellsUpdated: EliminationUpdate[] = []
    const board = getBoard()

    for (let i = 0; i < cells.length; i++) {
      const cellCandidates = board[cells[i]!]!.candidates

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
            index: cells[i]!,
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
    //horizontal row
    const horizontalRow = Math.floor(cellIndex / boardSize)
    groupOfHouses.push(horizontalRow)
    //vertical row
    const verticalRow = Math.floor(cellIndex % boardSize)
    groupOfHouses.push(verticalRow)
    //box
    const box =
      Math.floor(horizontalRow / boxSideSize) * boxSideSize + Math.floor(verticalRow / boxSideSize)
    groupOfHouses.push(box)

    return groupOfHouses
  }

  const getUsedNumbers = (house: House) => {
    const board = getBoard()
    // filter out cells that have values
    return house.map((cellIndex) => board[cellIndex]!.value).filter(Boolean)
  }

  const getRemainingNumbers = (house: House): Array<number> => {
    const usedNumbers = getUsedNumbers(house)
    return candidates.filter((candidate) => !usedNumbers.includes(candidate))
  }

  const getRemainingCandidates = (cellIndex: number): Array<CellValue> => {
    const board = getBoard()
    return board[cellIndex]!.candidates.filter((candidate) => candidate !== null)
  }

  const getPossibleCellsForCandidate = (candidate: number, house: House) => {
    const board = getBoard()
    return house.filter((cellIndex) => board[cellIndex]!.candidates.includes(candidate))
  }

  return {
    removeCandidatesFromMultipleCells,
    housesWithCell,
    getRemainingNumbers,
    getUsedNumbers,
    getRemainingCandidates,
    getPossibleCellsForCandidate,
  }
}

export type StrategyHelpers = ReturnType<typeof createStrategyHelpers>
