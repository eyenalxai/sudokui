import type { CellValue, Difficulty, Houses, InternalBoard, Strategy } from "./types"

import {
  BOARD_SIZE,
  DIFFICULTY_EASY,
  DIFFICULTY_EXPERT,
  DIFFICULTY_HARD,
  DIFFICULTY_MASTER,
  DIFFICULTY_MEDIUM,
  NULL_CANDIDATE_LIST,
} from "./constants"

export const uniqueArray = (array: Array<number>): Array<number> => {
  const temp: Record<number, unknown> = {}
  for (let i = 0; i < array.length; i++) {
    const value = array[i]
    if (value === undefined) continue
    temp[value] = true
  }
  const record: number[] = []
  for (const k in temp) record.push(Number(k))
  return record
}

/* generateHouseIndexList
 * -----------------------------------------------------------------*/
export const generateHouseIndexList = (boardSize: number): Houses[] => {
  const groupOfHouses: Houses[] = [[], [], []]
  const boxSideSize = Math.sqrt(boardSize)
  for (let i = 0; i < boardSize; i++) {
    const horizontalRow = [] //horizontal row
    const verticalRow = [] //vertical row
    const box = []
    for (let j = 0; j < boardSize; j++) {
      horizontalRow.push(boardSize * i + j)
      verticalRow.push(boardSize * j + i)

      if (j < boxSideSize) {
        for (let k = 0; k < boxSideSize; k++) {
          const a = Math.floor(i / boxSideSize) * boardSize * boxSideSize
          const b = (i % boxSideSize) * boxSideSize
          const boxStartIndex = a + b //0 3 6 27 30 33 54 57 60

          box.push(boxStartIndex + boardSize * j + k)
        }
      }
    }
    const horizontalGroup = groupOfHouses[0]
    const verticalGroup = groupOfHouses[1]
    const boxGroup = groupOfHouses[2]
    if (horizontalGroup) horizontalGroup.push(horizontalRow)
    if (verticalGroup) verticalGroup.push(verticalRow)
    if (boxGroup) boxGroup.push(box)
  }
  return groupOfHouses
}

export const isBoardFinished = (board: InternalBoard): boolean => {
  return board.every((cell) => cell !== undefined && cell.value !== null)
}

export const isEasyEnough = (difficulty: Difficulty, currentDifficulty: Difficulty): boolean => {
  switch (currentDifficulty) {
    case DIFFICULTY_EASY:
      return true
    case DIFFICULTY_MEDIUM:
      return difficulty !== DIFFICULTY_EASY
    case DIFFICULTY_HARD:
      return difficulty !== DIFFICULTY_EASY && difficulty !== DIFFICULTY_MEDIUM
    case DIFFICULTY_EXPERT:
      return (
        difficulty !== DIFFICULTY_EASY &&
        difficulty !== DIFFICULTY_MEDIUM &&
        difficulty !== DIFFICULTY_HARD
      )
    case DIFFICULTY_MASTER:
      return (
        difficulty !== DIFFICULTY_EASY &&
        difficulty !== DIFFICULTY_MEDIUM &&
        difficulty !== DIFFICULTY_HARD &&
        difficulty !== DIFFICULTY_EXPERT
      )
  }
}

export const isHardEnough = (difficulty: Difficulty, currentDifficulty: Difficulty): boolean => {
  switch (difficulty) {
    case DIFFICULTY_EASY:
      return true
    case DIFFICULTY_MEDIUM:
      return currentDifficulty !== DIFFICULTY_EASY
    case DIFFICULTY_HARD:
      return currentDifficulty !== DIFFICULTY_EASY && currentDifficulty !== DIFFICULTY_MEDIUM
    case DIFFICULTY_EXPERT:
      return (
        currentDifficulty !== DIFFICULTY_EASY &&
        currentDifficulty !== DIFFICULTY_MEDIUM &&
        currentDifficulty !== DIFFICULTY_HARD
      )
    case DIFFICULTY_MASTER:
      return (
        currentDifficulty !== DIFFICULTY_EASY &&
        currentDifficulty !== DIFFICULTY_MEDIUM &&
        currentDifficulty !== DIFFICULTY_HARD &&
        currentDifficulty !== DIFFICULTY_EXPERT
      )
  }
}

export const getRemovalCountBasedOnDifficulty = (difficulty: Difficulty) => {
  switch (difficulty) {
    case DIFFICULTY_EASY:
      return BOARD_SIZE * BOARD_SIZE - 38
    case DIFFICULTY_MEDIUM:
      return BOARD_SIZE * BOARD_SIZE - 30
    case DIFFICULTY_HARD:
      return BOARD_SIZE * BOARD_SIZE - 20
    case DIFFICULTY_EXPERT:
    case DIFFICULTY_MASTER:
      return BOARD_SIZE * BOARD_SIZE - 17
    default:
      return BOARD_SIZE * BOARD_SIZE - 17
  }
}

/* addValueToCellIndex - does not update UI
          -----------------------------------------------------------------*/
export const addValueToCellIndex = (board: InternalBoard, cellIndex: number, value: CellValue) => {
  const cell = board[cellIndex]
  if (cell === undefined) return
  cell.value = value
  if (value !== null) {
    cell.candidates = NULL_CANDIDATE_LIST.slice()
  }
}

export const getRandomCandidateOfCell = (candidates: Array<CellValue>) => {
  const randomIndex = Math.floor(Math.random() * candidates.length)
  return candidates[randomIndex]
}

/* calculateBoardDifficulty
 * --------------
 *  TYPE: solely based on strategies required to solve board (i.e. single count per strategy)
 *  SCORE: distinguish between boards of same difficulty.. based on point system. Needs work.
 * -----------------------------------------------------------------*/
export const calculateBoardDifficulty = (
  usedStrategies: Array<number>,
  strategies: Array<Strategy>,
): { difficulty: Difficulty; score: number } => {
  const validUsedStrategies = usedStrategies.filter(Boolean)
  const totalScore = usedStrategies.reduce((accumulatedScore, frequency, i) => {
    if (!frequency) return accumulatedScore
    const strategy = strategies[i]
    if (strategy === undefined) return accumulatedScore
    return accumulatedScore + frequency * strategy.score
  }, 0)
  let difficulty: Difficulty =
    validUsedStrategies.length < 3
      ? DIFFICULTY_EASY
      : validUsedStrategies.length < 4
        ? DIFFICULTY_MEDIUM
        : DIFFICULTY_HARD

  if (totalScore > 750) difficulty = DIFFICULTY_EXPERT
  if (totalScore > 2200) difficulty = DIFFICULTY_MASTER

  return {
    difficulty,
    score: totalScore,
  }
}

/* cloneBoard
 * --------------
 *  Deep clones an InternalBoard using JSON serialize/parse
 *  Matches sudoku-core behavior for consistent solving steps
 * -----------------------------------------------------------------*/
export const cloneBoard = (board: InternalBoard): InternalBoard => {
  return board.map((cell) => ({
    value: cell.value,
    candidates: cell.candidates.slice(),
    ...(cell.invalidCandidates ? { invalidCandidates: cell.invalidCandidates.slice() } : {}),
  }))
}
