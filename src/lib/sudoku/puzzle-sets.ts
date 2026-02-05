export interface Puzzle {
  grid: string
  solution: string
}

export interface PuzzleSet {
  difficulty: string
  puzzles: Array<Puzzle>
}

import easyData from "../../data/puzzles/easy.json"
import hardData from "../../data/puzzles/hard.json"
import moderateData from "../../data/puzzles/moderate.json"
import moderatelyEasyData from "../../data/puzzles/moderately-easy.json"
import moderatelyHardData from "../../data/puzzles/moderately-hard.json"
import veryEasyData from "../../data/puzzles/very-easy.json"
import viciousData from "../../data/puzzles/vicious.json"

export const veryEasy: PuzzleSet = veryEasyData
export const easy: PuzzleSet = easyData
export const moderatelyEasy: PuzzleSet = moderatelyEasyData
export const moderate: PuzzleSet = moderateData
export const moderatelyHard: PuzzleSet = moderatelyHardData
export const hard: PuzzleSet = hardData
export const vicious: PuzzleSet = viciousData

export const allDifficulties = [
  veryEasy,
  easy,
  moderatelyEasy,
  moderate,
  moderatelyHard,
  hard,
  vicious,
] as const

const difficultyLevels = [
  "Very Easy",
  "Easy",
  "Moderately Easy",
  "Moderate",
  "Moderately Hard",
  "Hard",
  "Vicious",
] as const

export type DifficultyLevel = (typeof difficultyLevels)[number]

export function getPuzzlesByDifficulty(difficulty: DifficultyLevel): PuzzleSet | undefined {
  return allDifficulties.find((d) => d.difficulty === difficulty)
}

export function getRandomPuzzle(difficulty: DifficultyLevel): Puzzle | undefined {
  const set = getPuzzlesByDifficulty(difficulty)
  if (set === undefined || set.puzzles.length === 0) return undefined
  const randomIndex = Math.floor(Math.random() * set.puzzles.length)
  return set.puzzles[randomIndex]
}

export function getAllDifficulties(): Array<DifficultyLevel> {
  return difficultyLevels.filter((d): d is DifficultyLevel =>
    allDifficulties.some((set) => set.difficulty === d),
  )
}
