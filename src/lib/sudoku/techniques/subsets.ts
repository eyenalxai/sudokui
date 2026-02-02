import { Effect } from "effect"

import { SudokuGrid } from "../grid/sudoku-grid.ts"

import { findSubsetInAllUnits } from "./subsets/search.ts"

export const findNakedPair = Effect.fn("TechniqueFinder.findNakedPair")(function* (
  grid: SudokuGrid,
) {
  return yield* findSubsetInAllUnits(grid, 2, "naked")
})

export const findNakedTriple = Effect.fn("TechniqueFinder.findNakedTriple")(function* (
  grid: SudokuGrid,
) {
  return yield* findSubsetInAllUnits(grid, 3, "naked")
})

export const findNakedQuad = Effect.fn("TechniqueFinder.findNakedQuad")(function* (
  grid: SudokuGrid,
) {
  return yield* findSubsetInAllUnits(grid, 4, "naked")
})

export const findHiddenPair = Effect.fn("TechniqueFinder.findHiddenPair")(function* (
  grid: SudokuGrid,
) {
  return yield* findSubsetInAllUnits(grid, 2, "hidden")
})

export const findHiddenTriple = Effect.fn("TechniqueFinder.findHiddenTriple")(function* (
  grid: SudokuGrid,
) {
  return yield* findSubsetInAllUnits(grid, 3, "hidden")
})

export const findHiddenQuad = Effect.fn("TechniqueFinder.findHiddenQuad")(function* (
  grid: SudokuGrid,
) {
  return yield* findSubsetInAllUnits(grid, 4, "hidden")
})
