import type { House, InternalBoard, StrategyResult } from "../types"
import type { StrategyHelpers } from "./strategy-helpers"

type EliminationStrategyContext = {
  getBoard: () => InternalBoard
  groupOfHouses: Array<Array<House>>
  boardSize: number
  helpers: StrategyHelpers
}

export function createEliminationStrategies({
  getBoard,
  groupOfHouses,
  boardSize,
  helpers,
}: EliminationStrategyContext) {
  const { getRemainingNumbers, housesWithCell, applyCandidateRemovals } = helpers

  function collectPointingCandidates(house: House, digit: number, houseType: number) {
    const board = getBoard()
    let sameAltHouse = true
    let sameAltTwoHouse = true
    let houseId = -1
    let houseTwoId = -1
    const cellsWithCandidate: number[] = []

    for (let cellIndex = 0; cellIndex < house.length; cellIndex++) {
      const cell = house[cellIndex]
      if (cell === undefined) continue
      const boardCell = board[cell]
      if (boardCell === undefined) continue
      if (!boardCell.candidates.includes(digit)) continue

      const cellHouses = housesWithCell(cell)
      const newHouseId = houseType === 2 ? cellHouses[0] : cellHouses[2]
      const newHouseTwoId = houseType === 2 ? cellHouses[1] : cellHouses[2]
      if (newHouseId === undefined || newHouseTwoId === undefined) continue

      if (cellsWithCandidate.length > 0) {
        if (newHouseId !== houseId) {
          sameAltHouse = false
        }
        if (newHouseTwoId !== houseTwoId) {
          sameAltTwoHouse = false
        }
        if (!sameAltHouse && !sameAltTwoHouse) {
          return null
        }
      }

      houseId = newHouseId
      houseTwoId = newHouseTwoId
      cellsWithCandidate.push(cell)
    }

    return { cellsWithCandidate, sameAltHouse, sameAltTwoHouse }
  }

  function pointingEliminationStrategy(): StrategyResult {
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
          const pointingInfo = collectPointingCandidates(house, digit, houseType)
          if (!pointingInfo) continue

          const { cellsWithCandidate, sameAltHouse, sameAltTwoHouse } = pointingInfo
          if ((!sameAltHouse && !sameAltTwoHouse) || cellsWithCandidate.length === 0) continue

          const altHouseType = houseType === 2 ? (sameAltHouse ? 0 : 1) : 2
          const firstCandidateCell = cellsWithCandidate[0]
          if (firstCandidateCell === undefined) continue
          const altHouseIndex = housesWithCell(firstCandidateCell)[altHouseType]
          if (altHouseIndex === undefined) continue
          const altHouseGroup = groupOfHouses[altHouseType]
          if (altHouseGroup === undefined) continue
          const altHouse = altHouseGroup[altHouseIndex]

          if (!altHouse) continue

          const cellsWithCandidateSet = new Set(cellsWithCandidate)
          const cellsAffected = altHouse.filter((cell) => !cellsWithCandidateSet.has(cell))
          const cellsUpdated = applyCandidateRemovals(cellsAffected, [digit])
          if (cellsUpdated.length > 0) {
            return { kind: "updates", updates: cellsUpdated }
          }
        }
      }
    }

    return { kind: "none" }
  }

  return { pointingEliminationStrategy }
}
