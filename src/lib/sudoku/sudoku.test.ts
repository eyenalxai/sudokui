import { describe, it, expect } from "bun:test"

import {
  DIFFICULTY_EASY,
  DIFFICULTY_EXPERT,
  DIFFICULTY_HARD,
  DIFFICULTY_MASTER,
  DIFFICULTY_MEDIUM,
} from "./constants"
import { createSudokuInstance } from "./sudoku-service"
import { isUniqueSolution } from "./sudoku-solver"
import { EASY_SUDOKU_BOARD_FOR_TEST } from "./test-boards-easy"
import {
  EXPERT_SUDOKU_BOARD_FOR_TEST,
  HARD_SUDOKU_BOARD_FOR_TEST,
  MASTER_SUDOKU_BOARD_FOR_TEST,
} from "./test-boards-hard"
import { MEDIUM_SUDOKU_BOARD_FOR_TEST } from "./test-boards-medium"

describe("sudoku-core", () => {
  describe("solve method", () => {
    const items = [
      { difficulty: DIFFICULTY_EASY, board: EASY_SUDOKU_BOARD_FOR_TEST },
      { difficulty: DIFFICULTY_MEDIUM, board: MEDIUM_SUDOKU_BOARD_FOR_TEST },
      { difficulty: DIFFICULTY_HARD, board: HARD_SUDOKU_BOARD_FOR_TEST },
      { difficulty: DIFFICULTY_EXPERT, board: EXPERT_SUDOKU_BOARD_FOR_TEST },
      { difficulty: DIFFICULTY_MASTER, board: MASTER_SUDOKU_BOARD_FOR_TEST },
    ]

    for (const { difficulty, board: sudokuBoard } of items) {
      it(`should solve the ${difficulty} board`, () => {
        const emptyCellsLength = sudokuBoard.filter((cell) => cell === null).length
        const solvingSteps: {
          strategy: string
          type: string
          updates: { index: number; filledValue?: number; eliminatedCandidate?: number }[]
        }[] = []

        const { solveAll } = createSudokuInstance({
          initBoard: sudokuBoard.slice(),
          onUpdate: (solvingStep) => solvingSteps.push(solvingStep),
        })

        const solvedBoard = solveAll()

        const filledCellsLength =
          solvingSteps.reduce(
            (acc, curr) => (curr.type === "value" ? curr.updates.length + acc : acc),
            0,
          ) || 0
        expect(filledCellsLength).toBe(emptyCellsLength)
        expect(solvedBoard).toMatchSnapshot()
        expect(solvingSteps).toMatchSnapshot()
      })
    }
  })

  describe("hint method", () => {
    const items = [
      { difficulty: DIFFICULTY_EASY, board: EASY_SUDOKU_BOARD_FOR_TEST },
      { difficulty: DIFFICULTY_MEDIUM, board: MEDIUM_SUDOKU_BOARD_FOR_TEST },
      { difficulty: DIFFICULTY_HARD, board: HARD_SUDOKU_BOARD_FOR_TEST },
      { difficulty: DIFFICULTY_EXPERT, board: EXPERT_SUDOKU_BOARD_FOR_TEST },
      { difficulty: DIFFICULTY_MASTER, board: MASTER_SUDOKU_BOARD_FOR_TEST },
    ]

    for (const { difficulty, board: sudokuBoard } of items) {
      it(`should give a hint for the ${difficulty} board`, () => {
        const solvingSteps: {
          strategy: string
          type: string
          updates: { index: number; filledValue?: number; eliminatedCandidate?: number }[]
        }[] = []
        const { solveStep } = createSudokuInstance({
          initBoard: sudokuBoard.slice(),
          onUpdate: (solvingStep) => solvingSteps.push(solvingStep),
        })

        const solvedBoard = solveStep()

        const filledCellsLength =
          solvingSteps.reduce(
            (acc, curr) => (curr.type === "value" ? curr.updates.length + acc : acc),
            0,
          ) || 0
        expect(filledCellsLength).toBe(1)
        expect(solvedBoard).toMatchSnapshot()
        expect(solvingSteps).toMatchSnapshot()
      })
    }
  })

  describe("analyze method", () => {
    it("should invalidate the wrong board", () => {
      const sudokuBoard = [1]
      const { analyzeBoard } = createSudokuInstance({
        initBoard: sudokuBoard,
      })

      const { difficulty, hasSolution } = analyzeBoard()

      expect(difficulty).toBe(undefined)
      expect(hasSolution).toBe(false)
    })

    it("should validate the easy board", () => {
      const sudokuBoard = [...EASY_SUDOKU_BOARD_FOR_TEST]
      const { analyzeBoard } = createSudokuInstance({
        initBoard: sudokuBoard,
      })

      const { difficulty } = analyzeBoard()

      expect(difficulty).toBe("easy")
      expect(isUniqueSolution(sudokuBoard)).toBe(true)
    })

    it("should validate the medium board", () => {
      const sudokuBoard = [...MEDIUM_SUDOKU_BOARD_FOR_TEST]
      const { analyzeBoard } = createSudokuInstance({
        initBoard: sudokuBoard,
      })

      const { difficulty } = analyzeBoard()

      expect(difficulty).toBe("medium")
      expect(isUniqueSolution(sudokuBoard)).toBe(true)
    })

    it("should validate the hard board", () => {
      const sudokuBoard = [...HARD_SUDOKU_BOARD_FOR_TEST]
      const { analyzeBoard } = createSudokuInstance({
        initBoard: sudokuBoard,
      })

      const { difficulty } = analyzeBoard()

      expect(difficulty).toBe("hard")
      expect(isUniqueSolution(sudokuBoard)).toBe(true)
    })

    it("should validate the expert board", () => {
      const sudokuBoard = [...EXPERT_SUDOKU_BOARD_FOR_TEST]
      const { analyzeBoard } = createSudokuInstance({
        initBoard: sudokuBoard,
      })

      const { difficulty } = analyzeBoard()

      expect(difficulty).toBe("expert")
      expect(isUniqueSolution(sudokuBoard)).toBe(true)
    })

    it("should validate the master board", () => {
      const sudokuBoard = [...MASTER_SUDOKU_BOARD_FOR_TEST]
      const { analyzeBoard } = createSudokuInstance({
        initBoard: sudokuBoard,
      })

      const { difficulty } = analyzeBoard()

      expect(difficulty).toBe("master")
      expect(isUniqueSolution(sudokuBoard)).toBe(true)
    })
  })
})
