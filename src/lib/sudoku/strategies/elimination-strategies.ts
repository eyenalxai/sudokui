import type { CellValue, EliminationUpdate, House, InternalBoard } from "../types"
import type { StrategyHelpers } from "./strategy-helpers"

type EliminationStrategyContext = {
  getBoard: () => InternalBoard
  groupOfHouses: Array<Array<House>>
  boardSize: number
  contains: (candidates: Array<CellValue>, digit: number) => boolean
  helpers: StrategyHelpers
}

export function createEliminationStrategies({
  getBoard,
  groupOfHouses,
  boardSize,
  contains,
  helpers,
}: EliminationStrategyContext) {
  const { getRemainingNumbers, housesWithCell, removeCandidatesFromMultipleCells } = helpers

  function collectPointingCandidates(house: House, digit: number, houseType: number) {
    const board = getBoard()
    let sameAltHouse = true
    let sameAltTwoHouse = true
    let houseId = -1
    let houseTwoId = -1
    const cellsWithCandidate: number[] = []

    for (let cellIndex = 0; cellIndex < house.length; cellIndex++) {
      const cell = house[cellIndex]!
      if (!contains(board[cell]!.candidates, digit)) continue

      const cellHouses = housesWithCell(cell)
      const newHouseId = houseType === 2 ? cellHouses[0]! : cellHouses[2]!
      const newHouseTwoId = houseType === 2 ? cellHouses[1]! : cellHouses[2]!

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

  function pointingEliminationStrategy(): EliminationUpdate[] | false {
    const groupOfHousesLength = groupOfHouses.length

    for (let houseType = 0; houseType < groupOfHousesLength; houseType++) {
      for (let houseIndex = 0; houseIndex < boardSize; houseIndex++) {
        const house = groupOfHouses[houseType]![houseIndex]!
        const digits = getRemainingNumbers(house)

        for (let digitIndex = 0; digitIndex < digits.length; digitIndex++) {
          const digit = digits[digitIndex]!
          const pointingInfo = collectPointingCandidates(house, digit, houseType)
          if (!pointingInfo) continue

          const { cellsWithCandidate, sameAltHouse, sameAltTwoHouse } = pointingInfo
          if ((!sameAltHouse && !sameAltTwoHouse) || cellsWithCandidate.length === 0) continue

          const altHouseType = houseType === 2 ? (sameAltHouse ? 0 : 1) : 2
          const altHouseIndex = housesWithCell(cellsWithCandidate[0]!)[altHouseType]!
          const altHouse = groupOfHouses[altHouseType]![altHouseIndex]

          if (!altHouse) continue

          const cellsEffected = altHouse.filter((cell) => !cellsWithCandidate.includes(cell))
          const cellsUpdated = removeCandidatesFromMultipleCells(cellsEffected, [digit])
          if (cellsUpdated.length > 0) {
            return cellsUpdated
          }
        }
      }
    }

    return false
  }

  return { pointingEliminationStrategy }
}
