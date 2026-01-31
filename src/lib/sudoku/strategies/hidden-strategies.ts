import type { EliminationUpdate, House } from "../types"
import type { StrategyHelpers } from "./strategy-helpers"

type HiddenStrategyContext = {
  groupOfHouses: Array<Array<House>>
  boardSize: number
  helpers: StrategyHelpers
}

function countUniqueCells(
  possibleCells: Array<number>,
  combineInfo: Array<{ candidate: number; cells: Array<number> }>,
): number {
  const tempSet = new Set(possibleCells)
  for (let a = 0; a < combineInfo.length; a++) {
    const info = combineInfo[a]
    if (info === undefined) continue
    const cells = info.cells
    for (let b = 0; b < cells.length; b++) {
      const cell = cells[b]
      if (cell === undefined) continue
      tempSet.add(cell)
    }
  }
  return tempSet.size
}

export function createHiddenStrategies({
  groupOfHouses,
  boardSize,
  helpers,
}: HiddenStrategyContext) {
  const { getRemainingNumbers, getPossibleCellsForCandidate, applyCandidateRemovals } = helpers

  function hiddenLockedCandidates(number: number) {
    let combineInfo: Array<{
      candidate: number
      cells: Array<number>
    }> = []
    let minIndexes = [-1]
    function checkLockedCandidates(house: House, startIndex: number): EliminationUpdate[] | false {
      const minIndex = minIndexes[startIndex]
      if (minIndex === undefined) return false
      for (let i = Math.max(startIndex, minIndex); i <= boardSize - number + startIndex; i++) {
        minIndexes[startIndex] = i + 1
        minIndexes[startIndex + 1] = i + 1

        const candidate = i + 1

        const possibleCells = getPossibleCellsForCandidate(candidate, house)

        if (possibleCells.length === 0 || possibleCells.length > number) continue

        if (combineInfo.length > 0) {
          const uniqueCellCount = countUniqueCells(possibleCells, combineInfo)
          if (uniqueCellCount > number) {
            continue //combined candidates spread over > n cells, won't work
          }
        }

        combineInfo.push({ candidate: candidate, cells: possibleCells })

        if (startIndex < number - 1) {
          const r = checkLockedCandidates(house, startIndex + 1)
          if (r !== false) return r
        }

        if (combineInfo.length === number) {
          const combinedCandidates = [] //not unique now...
          let cellsWithCandidates: number[] = [] //not unique either..
          for (let x = 0; x < combineInfo.length; x++) {
            const info = combineInfo[x]
            if (info === undefined) continue
            combinedCandidates.push(info.candidate)
            cellsWithCandidates = cellsWithCandidates.concat(info.cells)
          }

          const combinedCandidatesSet = new Set(combinedCandidates)
          const candidatesToRemove = []
          for (let c = 0; c < boardSize; c++) {
            if (!combinedCandidatesSet.has(c + 1)) candidatesToRemove.push(c + 1)
          }

          const cellsUpdated = applyCandidateRemovals(cellsWithCandidates, candidatesToRemove)

          if (cellsUpdated.length > 0) {
            return cellsUpdated
          }
        }
      }
      if (startIndex > 0 && combineInfo.length > startIndex - 1) {
        combineInfo.pop()
      }
      return false
    }
    const groupOfHousesLength = groupOfHouses.length
    for (let i = 0; i < groupOfHousesLength; i++) {
      for (let j = 0; j < boardSize; j++) {
        const houseGroup = groupOfHouses[i]
        if (houseGroup === undefined) continue
        const house = houseGroup[j]
        if (house === undefined) continue
        if (getRemainingNumbers(house).length <= number) continue
        combineInfo = []
        minIndexes = [-1]

        const result = checkLockedCandidates(house, 0)
        if (result !== false) return result
      }
    }
    return false //pattern not found
  }

  function hiddenPairStrategy(): EliminationUpdate[] | false {
    return hiddenLockedCandidates(2)
  }

  function hiddenTripletStrategy(): EliminationUpdate[] | false {
    return hiddenLockedCandidates(3)
  }

  function hiddenQuadrupleStrategy(): EliminationUpdate[] | false {
    return hiddenLockedCandidates(4)
  }

  return {
    hiddenPairStrategy,
    hiddenTripletStrategy,
    hiddenQuadrupleStrategy,
  }
}
