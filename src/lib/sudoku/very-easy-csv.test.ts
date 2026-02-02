import { describe, it, expect } from "bun:test"

import { Effect } from "effect"

import { SudokuGrid } from "./grid/class.ts"
import { InvalidGridError, TechniqueDetector } from "./technique-detector.ts"

interface PuzzleData {
  puzzle: string
  solution: string
}

const loadPuzzlesFromCSV = async (filePath: string): Promise<PuzzleData[]> => {
  const file = Bun.file(filePath)
  const content = await file.text()
  const lines = content.trim().split("\n")

  // Skip header line
  const dataLines = lines.slice(1)

  const puzzles: PuzzleData[] = []

  for (const line of dataLines) {
    const parts = line.split(",")
    if (parts.length >= 8) {
      const puzzle = parts[0]
      const solution = parts[7]
      if (
        puzzle !== undefined &&
        solution !== undefined &&
        puzzle.length === 81 &&
        solution.length === 81
      ) {
        puzzles.push({ puzzle, solution })
      }
    }
  }

  return puzzles
}

interface SolveResult {
  isSolved: boolean
  isCorrect: boolean
  techniquesUsed: string[]
  steps: number
  timeMs: number
}

const solvePuzzle = (
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
    const isSolved = grid.isComplete()
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

describe("Very Easy Logical Solver - CSV", () => {
  it("should solve all puzzles from CSV using logical techniques", async () => {
    const puzzles = await loadPuzzlesFromCSV("./src/lib/sudoku/data/very-easy.csv")

    expect(puzzles.length).toBeGreaterThan(0)

    const results: SolveResult[] = []
    for (let i = 0; i < puzzles.length; i++) {
      const puzzleData = puzzles[i]
      if (puzzleData === undefined) continue
      const result = Effect.runSync(
        solvePuzzle(puzzleData.puzzle, puzzleData.solution).pipe(
          Effect.provide(TechniqueDetector.Default),
        ),
      )
      results.push(result)
    }

    let solved = 0
    let failed = 0
    let totalSteps = 0
    let totalTime = 0
    const allTechniques = new Set<string>()

    for (let i = 0; i < results.length; i++) {
      const result = results[i]
      if (result === undefined) continue

      totalSteps += result.steps
      totalTime += result.timeMs

      for (const t of result.techniquesUsed) {
        allTechniques.add(t)
      }

      if (result.isSolved && result.isCorrect) {
        solved++
      } else {
        failed++
        console.log(
          `  Puzzle ${i + 1} failed: solved=${result.isSolved}, correct=${result.isCorrect}`,
        )
      }
    }

    console.log(`\nVery Easy Logical Solver Results:`)
    console.log(`  Total puzzles: ${puzzles.length}`)
    console.log(`  Solved: ${solved}`)
    console.log(`  Failed: ${failed}`)
    console.log(`  Success rate: ${((solved / puzzles.length) * 100).toFixed(1)}%`)
    console.log(`  Average time: ${(totalTime / puzzles.length).toFixed(2)}ms`)
    console.log(`  Average steps: ${(totalSteps / puzzles.length).toFixed(1)}`)
    console.log(`  Techniques used: ${Array.from(allTechniques).join(", ")}`)

    expect(failed).toBe(0)
    expect(solved).toBe(puzzles.length)
  })
})
