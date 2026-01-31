import {
  DIFFICULTY_EASY,
  DIFFICULTY_EXPERT,
  DIFFICULTY_HARD,
  DIFFICULTY_MASTER,
  DIFFICULTY_MEDIUM,
} from "./constants";
import type { Board, Difficulty } from "./types";
import { createSudokuInstance } from "./sudoku-service";
import { isUniqueSolution } from "./sudoku-solver";
import {
  EASY_SUDOKU_BOARD_FOR_TEST,
  EXPERT_SUDOKU_BOARD_FOR_TEST,
  HARD_SUDOKU_BOARD_FOR_TEST,
  MASTER_SUDOKU_BOARD_FOR_TEST,
  MEDIUM_SUDOKU_BOARD_FOR_TEST,
} from "./test-constants";
import { describe, it, expect } from "bun:test";

describe("sudoku-core", () => {
  describe("solve method", () => {
    const items = [
      [DIFFICULTY_EASY, EASY_SUDOKU_BOARD_FOR_TEST],
      [DIFFICULTY_MEDIUM, MEDIUM_SUDOKU_BOARD_FOR_TEST],
      [DIFFICULTY_HARD, HARD_SUDOKU_BOARD_FOR_TEST],
      [DIFFICULTY_EXPERT, EXPERT_SUDOKU_BOARD_FOR_TEST],
      [DIFFICULTY_MASTER, MASTER_SUDOKU_BOARD_FOR_TEST],
    ] as [Difficulty, Board][];

    items.forEach(([difficulty, sudokuBoard]) => {
      it(`should solve the ${difficulty} board`, () => {
        //Arrange
        const emptyCellsLength = sudokuBoard.filter((cell) => !cell).length;
        const solvingSteps: { strategy: string; type: string; updates: { index: number; filledValue?: number; eliminatedCandidate?: number }[] }[] = [];

        //Act
        const { solveAll } = createSudokuInstance({
          initBoard: sudokuBoard.slice() as Board,
          onUpdate: (solvingStep) => solvingSteps.push(solvingStep),
        });

        const solvedBoard = solveAll();

        // Assert
        const filledCellsLength =
          solvingSteps.reduce(
            (acc, curr) =>
              curr.type === "value" ? curr.updates.length + acc : acc,
            0,
          ) || 0;
        expect(filledCellsLength).toBe(emptyCellsLength);
        expect(solvedBoard).toMatchSnapshot();
        expect(solvingSteps).toMatchSnapshot();
      });
    });
  });

  describe("hint method", () => {
    const items = [
      [DIFFICULTY_EASY, EASY_SUDOKU_BOARD_FOR_TEST],
      [DIFFICULTY_MEDIUM, MEDIUM_SUDOKU_BOARD_FOR_TEST],
      [DIFFICULTY_HARD, HARD_SUDOKU_BOARD_FOR_TEST],
      [DIFFICULTY_EXPERT, EXPERT_SUDOKU_BOARD_FOR_TEST],
      [DIFFICULTY_MASTER, MASTER_SUDOKU_BOARD_FOR_TEST],
    ] as [Difficulty, Board][];

    items.forEach(([difficulty, sudokuBoard]) => {
      it(`should give a hint for the ${difficulty} board`, () => {
        //Arrange
        const solvingSteps: { strategy: string; type: string; updates: { index: number; filledValue?: number; eliminatedCandidate?: number }[] }[] = [];
        const { solveStep } = createSudokuInstance({
          initBoard: sudokuBoard.slice() as Board,
          onUpdate: (solvingStep) => solvingSteps.push(solvingStep),
        });

        //Act
        const solvedBoard = solveStep();

        // Assert
        const filledCellsLength =
          solvingSteps.reduce(
            (acc, curr) =>
              curr.type === "value" ? curr.updates.length + acc : acc,
            0,
          ) || 0;
        expect(filledCellsLength).toBe(1);
        expect(solvedBoard).toMatchSnapshot();
        expect(solvingSteps).toMatchSnapshot();
      });
    });
  });

  describe("analyze method", () => {
    it("should invalidate the wrong board", () => {
      //Arrange
      const sudokuBoard = [1];
      const { analyzeBoard } = createSudokuInstance({
        initBoard: sudokuBoard as Board,
      });

      //Act
      const { difficulty, hasSolution } = analyzeBoard();

      // Assert
      expect(difficulty).toBe(undefined);
      expect(hasSolution).toBe(false);
    });

    it("should validate the easy board", () => {
      //Arrange
      const sudokuBoard = [...EASY_SUDOKU_BOARD_FOR_TEST] as Board;
      const { analyzeBoard } = createSudokuInstance({
        initBoard: sudokuBoard,
      });

      //Act
      const { difficulty } = analyzeBoard();

      // Assert
      expect(difficulty).toBe("easy");
      expect(isUniqueSolution(sudokuBoard)).toBe(true);
    });

    it("should validate the medium board", () => {
      //Arrange
      const sudokuBoard = [...MEDIUM_SUDOKU_BOARD_FOR_TEST] as Board;
      const { analyzeBoard } = createSudokuInstance({
        initBoard: sudokuBoard,
      });

      //Act
      const { difficulty } = analyzeBoard();

      // Assert
      expect(difficulty).toBe("medium");
      expect(isUniqueSolution(sudokuBoard)).toBe(true);
    });

    it("should validate the hard board", () => {
      //Arrange
      const sudokuBoard = [...HARD_SUDOKU_BOARD_FOR_TEST] as Board;
      const { analyzeBoard } = createSudokuInstance({
        initBoard: sudokuBoard,
      });

      //Act
      const { difficulty } = analyzeBoard();

      // Assert
      expect(difficulty).toBe("hard");
      expect(isUniqueSolution(sudokuBoard)).toBe(true);
    });

    it("should validate the expert board", () => {
      //Arrange
      const sudokuBoard = [...EXPERT_SUDOKU_BOARD_FOR_TEST] as Board;
      const { analyzeBoard } = createSudokuInstance({
        initBoard: sudokuBoard,
      });

      //Act
      const { difficulty } = analyzeBoard();

      // Assert
      expect(difficulty).toBe("expert");
      expect(isUniqueSolution(sudokuBoard)).toBe(true);
    });

    it("should validate the master board", () => {
      //Arrange
      const sudokuBoard = [...MASTER_SUDOKU_BOARD_FOR_TEST] as Board;
      const { analyzeBoard } = createSudokuInstance({
        initBoard: sudokuBoard,
      });

      //Act
      const { difficulty } = analyzeBoard();

      // Assert
      expect(difficulty).toBe("master");
      expect(isUniqueSolution(sudokuBoard)).toBe(true);
    });
  });
});
