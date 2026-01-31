import type { CellValue, EliminationUpdate, House } from "../types"
import type { StrategyHelpers } from "./strategy-helpers"

type NakedStrategyContext = {
  groupOfHouses: Array<Array<House>>
  boardSize: number
  helpers: StrategyHelpers
}

type CombineInfo = {
  cell: number
  candidates: Array<CellValue>
}

function buildCandidateSet(
  initial: Array<CellValue>,
  combineInfo: Array<CombineInfo>,
): Set<CellValue> {
  const tempSet = new Set(initial)
  for (let a = 0; a < combineInfo.length; a++) {
    const candidates = combineInfo[a]!.candidates
    for (let b = 0; b < candidates.length; b++) {
      tempSet.add(candidates[b]!)
    }
  }
  return tempSet
}

function collectCombineInfoCells(combineInfo: Array<CombineInfo>): number[] {
  const cells: number[] = []
  for (let x = 0; x < combineInfo.length; x++) {
    cells.push(combineInfo[x]!.cell)
  }
  return cells
}

function collectCombineInfoCandidates(combineInfo: Array<CombineInfo>): Array<CellValue> {
  const combined: Array<CellValue> = []
  for (let x = 0; x < combineInfo.length; x++) {
    const cands = combineInfo[x]!.candidates
    for (let c = 0; c < cands.length; c++) {
      const cand = cands[c]!
      if (cand !== null) {
        combined.push(cand)
      }
    }
  }
  return combined
}

export function createNakedStrategies({ groupOfHouses, boardSize, helpers }: NakedStrategyContext) {
  const { getRemainingNumbers, getRemainingCandidates, removeCandidatesFromMultipleCells } = helpers

  function nakedCandidatesStrategy(number: number): EliminationUpdate[] | false {
    let combineInfo: Array<CombineInfo> = []
    let minIndexes = [-1]

    const groupOfHousesLength = groupOfHouses.length

    for (let i = 0; i < groupOfHousesLength; i++) {
      for (let j = 0; j < boardSize; j++) {
        const house = groupOfHouses[i]![j]!

        if (getRemainingNumbers(house).length <= number) {
          continue
        }

        combineInfo = []
        minIndexes = [-1]

        const result = checkCombinedCandidates(house, 0)

        if (result !== false) {
          return result
        }
      }
    }

    return false

    function checkCombinedCandidates(
      house: House,
      startIndex: number,
    ): EliminationUpdate[] | false {
      for (
        let i = Math.max(startIndex, minIndexes[startIndex]!);
        i < boardSize - number + startIndex;
        i++
      ) {
        minIndexes[startIndex] = i + 1
        minIndexes[startIndex + 1] = i + 1

        const cell = house[i]!
        const cellCandidates = getRemainingCandidates(cell)

        if (cellCandidates.length === 0 || cellCandidates.length > number) {
          continue
        }

        if (combineInfo.length > 0) {
          const tempSet = buildCandidateSet(cellCandidates, combineInfo)
          if (tempSet.size > number) {
            continue
          }
        }

        combineInfo.push({ cell: cell, candidates: cellCandidates })

        if (startIndex < number - 1) {
          const result = checkCombinedCandidates(house, startIndex + 1)

          if (result !== false) {
            return result
          }
        }

        if (combineInfo.length === number) {
          const cellsWithCandidates = collectCombineInfoCells(combineInfo)
          const combinedCandidates = collectCombineInfoCandidates(combineInfo)

          const cellsEffected = house.filter(
            (cellIndex) => !cellsWithCandidates.includes(cellIndex),
          )

          const cellsUpdated = removeCandidatesFromMultipleCells(cellsEffected, combinedCandidates)

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
  }

  function nakedPairStrategy() {
    return nakedCandidatesStrategy(2)
  }

  function nakedTripletStrategy() {
    return nakedCandidatesStrategy(3)
  }

  function nakedQuadrupleStrategy() {
    return nakedCandidatesStrategy(4)
  }

  return {
    nakedPairStrategy,
    nakedTripletStrategy,
    nakedQuadrupleStrategy,
  }
}
