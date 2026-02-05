import { Effect, Option } from "effect"

import { getPeers } from "../../grid/helpers.ts"
import { SudokuGrid } from "../../grid/sudoku-grid.ts"

import {
  findStrongLinks,
  getMask,
  makeCellElimination,
  makeCellIndex,
  makeCellValue,
  type RawElimination,
  type StrongLink,
} from "./helpers.ts"

// Inline implementation is faster than getPeers(cell1).includes(cell2)
const areWeaklyLinked = (cell1: number, cell2: number): boolean => {
  const row1 = Math.floor(cell1 / 9)
  const col1 = cell1 % 9
  const row2 = Math.floor(cell2 / 9)
  const col2 = cell2 % 9

  if (row1 === row2) return true
  if (col1 === col2) return true

  const box1 = Math.floor(row1 / 3) * 3 + Math.floor(col1 / 3)
  const box2 = Math.floor(row2 / 3) * 3 + Math.floor(col2 / 3)
  if (box1 === box2) return true

  return false
}

const getOtherEnd = (link: StrongLink, cell: number): number => {
  return link.cell1 === cell ? link.cell2 : link.cell1
}

const findTurbotFishEliminations = Effect.fn("TurbotFish.findEliminations")(function* (
  grid: SudokuGrid,
  end1: number,
  end2: number,
  digit: number,
  mask: number,
) {
  const peers1 = new Set(getPeers(end1))
  const peers2 = new Set(getPeers(end2))

  const eliminations: RawElimination[] = []
  for (const peer of peers1) {
    if (peers2.has(peer) && grid.getCell(peer) === 0 && (grid.getCandidates(peer) & mask) !== 0) {
      eliminations.push({ index: peer, values: [digit] })
    }
  }

  if (eliminations.length > 0) {
    return Option.some({
      technique: "TURBOT_FISH" as const,
      cellIndex: yield* makeCellIndex(end1),
      value: yield* makeCellValue(digit),
      eliminations: yield* Effect.forEach(eliminations, makeCellElimination),
    })
  }

  return Option.none()
})

const findTurbotFishForDigit = Effect.fn("TurbotFish.findForDigit")(function* (
  grid: SudokuGrid,
  digit: number,
) {
  const strongLinks = findStrongLinks(grid, digit)
  if (strongLinks.length < 2) return Option.none()

  const mask = getMask(digit)

  // Build a map from cell to its strong links
  const cellToLinks = new Map<number, StrongLink[]>()
  for (const link of strongLinks) {
    const links1 = cellToLinks.get(link.cell1) ?? []
    links1.push(link)
    cellToLinks.set(link.cell1, links1)

    const links2 = cellToLinks.get(link.cell2) ?? []
    links2.push(link)
    cellToLinks.set(link.cell2, links2)
  }

  // For each strong link as starting point (Link 1: A = B)
  for (const link1 of strongLinks) {
    const a = link1.cell1
    const b = link1.cell2

    // From B, find a weak link to C (C must have the digit and be weakly linked to B)
    // C must be different from A
    for (const c of cellToLinks.keys()) {
      if (c === a || c === b) continue
      if (grid.getCell(c) !== 0 || (grid.getCandidates(c) & mask) === 0) continue
      if (!areWeaklyLinked(b, c)) continue

      // From C, find a strong link to D (Link 3: C = D)
      const linksFromC = cellToLinks.get(c) ?? []
      for (const link3 of linksFromC) {
        const d = getOtherEnd(link3, c)

        // D must be different from A, B, C
        if (d === a || d === b || d === c) continue

        // Verify D has the digit
        if (grid.getCell(d) !== 0 || (grid.getCandidates(d) & mask) === 0) continue

        // Check if A and D can eliminate anything
        const result = yield* findTurbotFishEliminations(grid, a, d, digit, mask)
        if (Option.isSome(result)) return result
      }
    }

    // Also try the reverse: B as start, A as middle
    for (const c of cellToLinks.keys()) {
      if (c === a || c === b) continue
      if (grid.getCell(c) !== 0 || (grid.getCandidates(c) & mask) === 0) continue
      if (!areWeaklyLinked(a, c)) continue

      const linksFromC = cellToLinks.get(c) ?? []
      for (const link3 of linksFromC) {
        const d = getOtherEnd(link3, c)

        if (d === a || d === b || d === c) continue
        if (grid.getCell(d) !== 0 || (grid.getCandidates(d) & mask) === 0) continue

        const result = yield* findTurbotFishEliminations(grid, b, d, digit, mask)
        if (Option.isSome(result)) return result
      }
    }
  }

  return Option.none()
})

export const findTurbotFish = Effect.fn("TechniqueFinder.findTurbotFish")(function* (
  grid: SudokuGrid,
) {
  for (let digit = 1; digit <= 9; digit++) {
    const result = yield* findTurbotFishForDigit(grid, digit)
    if (Option.isSome(result)) return result
  }

  return Option.none()
})
