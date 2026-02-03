import { Effect } from "effect"

import { TOTAL_CELLS } from "../../grid/constants.ts"
import { SudokuGrid } from "../../grid/sudoku-grid.ts"
import { isComplete } from "../../grid/validation.ts"
import { InvalidGridError, TechniqueDetector } from "../../technique-detector.ts"

export interface PuzzleData {
  puzzle: string
  solution: string
}

export interface SolveResult {
  isSolved: boolean
  isCorrect: boolean
  techniquesUsed: string[]
  steps: number
  timeMs: number
}

export const loadPuzzlesFromCSV = async (filePath: string): Promise<PuzzleData[]> => {
  const file = Bun.file(filePath)
  const content = await file.text()
  const lines = content.trim().split("\n")

  // Skip header line
  const dataLines = lines.slice(1)

  const puzzles: PuzzleData[] = []

  for (const line of dataLines) {
    const parts = line.split(",")
    if (parts.length >= 5) {
      const puzzle = parts[0]
      const solution = parts[4]
      if (
        puzzle !== undefined &&
        solution !== undefined &&
        puzzle.length === TOTAL_CELLS &&
        solution.length === TOTAL_CELLS
      ) {
        puzzles.push({ puzzle, solution })
      }
    }
  }

  return puzzles
}

export const solvePuzzle = (
  puzzle: string,
  expectedSolution: string,
): Effect.Effect<SolveResult, InvalidGridError, TechniqueDetector> => {
  return Effect.gen(function* () {
    const startTime = performance.now()
    const detector = yield* TechniqueDetector
    let grid = yield* SudokuGrid.fromString(puzzle).pipe(Effect.orDie)

    const techniquesUsed = new Set<string>()
    let steps = 0

    while (true) {
      const move = yield* detector.findNextMove(grid).pipe(
        Effect.matchEffect({
          onSuccess: (m) => Effect.succeed(m),
          onFailure: () => Effect.succeed(null),
        }),
      )

      if (move === null) {
        break
      }

      techniquesUsed.add(move.technique)
      steps++

      const newGrid = yield* detector.applyMove(grid, move)
      grid = newGrid
    }

    const endTime = performance.now()
    const isSolved = isComplete(grid)
    const actualSolution = grid.toString()

    return {
      isSolved,
      isCorrect: actualSolution === expectedSolution,
      techniquesUsed: Array.from(techniquesUsed),
      steps,
      timeMs: endTime - startTime,
    }
  })
}

export const aggregateResults = (
  results: SolveResult[],
): {
  solved: number
  failed: number
  totalSteps: number
  totalTime: number
  allTechniques: Set<string>
} => {
  let solved = 0
  let failed = 0
  let totalSteps = 0
  let totalTime = 0
  const allTechniques = new Set<string>()

  for (const result of results) {
    totalSteps += result.steps
    totalTime += result.timeMs

    for (const t of result.techniquesUsed) {
      allTechniques.add(t)
    }

    if (result.isSolved && result.isCorrect) {
      solved++
    } else {
      failed++
    }
  }

  return { solved, failed, totalSteps, totalTime, allTechniques }
}

export const printResults = (
  difficulty: string,
  totalPuzzles: number,
  results: ReturnType<typeof aggregateResults>,
): void => {
  console.log(`\n${difficulty} Logical Solver Results:`)
  console.log(`  Total puzzles: ${totalPuzzles}`)
  console.log(`  Solved: ${results.solved}`)
  console.log(`  Failed: ${results.failed}`)
  console.log(`  Success rate: ${((results.solved / totalPuzzles) * 100).toFixed(1)}%`)
  console.log(`  Average time: ${(results.totalTime / totalPuzzles).toFixed(2)}ms`)
  console.log(`  Average steps: ${(results.totalSteps / totalPuzzles).toFixed(1)}`)
  console.log(`  Techniques used: ${Array.from(results.allTechniques).join(", ")}`)
}
