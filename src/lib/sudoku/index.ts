import { createSudokuInstance } from "./sudoku-service";
import { isUniqueSolution } from "./sudoku-solver";
import type {
  AnalyzeData,
  Board,
  Difficulty,
  SolvingStep,
  SolvingResult,
  Cell,
  CellValue,
  House,
  Houses,
  InternalBoard,
  Options,
  Strategy,
  StrategyFn,
  Update,
} from "./types";

export type {
  AnalyzeData,
  Board,
  Difficulty,
  SolvingStep,
  SolvingResult,
  Cell,
  CellValue,
  House,
  Houses,
  InternalBoard,
  Options,
  Strategy,
  StrategyFn,
  Update,
};

export function analyze(board: Board): AnalyzeData {
  const { analyzeBoard } = createSudokuInstance({
    initBoard: board.slice(),
  });
  return { ...analyzeBoard(), hasUniqueSolution: isUniqueSolution(board) };
}

export function generate(difficulty: Difficulty): Board {
  const { getBoard } = createSudokuInstance({ difficulty });
  if (!analyze(getBoard()).hasUniqueSolution) {
    return generate(difficulty);
  }
  return getBoard();
}

export function solve(board: Board): SolvingResult {
  const solvingSteps: SolvingStep[] = [];

  const { solveAll } = createSudokuInstance({
    initBoard: board.slice(),
    onUpdate: (solvingStep) => solvingSteps.push(solvingStep),
  });

  const analysis = analyze(board);

  if (!analysis.hasSolution) {
    return { solved: false, error: "No solution for provided board!" };
  }

  const solvedBoard = solveAll();

  if (!analysis.hasUniqueSolution) {
    return {
      solved: true,
      board: solvedBoard,
      steps: solvingSteps,
      analysis,
      error: "No unique solution for provided board!",
    };
  }

  return { solved: true, board: solvedBoard, steps: solvingSteps, analysis };
}

export function hint(board: Board): SolvingResult {
  const solvingSteps: SolvingStep[] = [];
  const { solveStep } = createSudokuInstance({
    initBoard: board.slice(),
    onUpdate: (solvingStep) => solvingSteps.push(solvingStep),
  });
  const analysis = analyze(board);

  if (!analysis.hasSolution) {
    return { solved: false, error: "No solution for provided board!" };
  }
  const solvedBoard = solveStep();

  if (!solvedBoard) {
    return { solved: false, error: "No solution for provided board!" };
  }

  if (!analysis.hasUniqueSolution) {
    return {
      solved: true,
      board: solvedBoard,
      steps: solvingSteps,
      analysis,
      error: "No unique solution for provided board!",
    };
  }

  return { solved: true, board: solvedBoard, steps: solvingSteps, analysis };
}

export { createSudokuInstance, isUniqueSolution };
export * from "./constants";
export * from "./types";
