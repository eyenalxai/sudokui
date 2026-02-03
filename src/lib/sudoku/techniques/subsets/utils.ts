export {
  makeCellElimination,
  makeCellIndex,
  makeCellValue,
  type RawElimination,
} from "../helpers.ts"

export type NakedTechnique = "NAKED_PAIR" | "NAKED_TRIPLE" | "NAKED_QUADRUPLE"
export type HiddenTechnique = "HIDDEN_PAIR" | "HIDDEN_TRIPLE" | "HIDDEN_QUADRUPLE"

/**
 * Get all combinations of n elements from array
 */
export const getCombinations = <T>(arr: readonly T[], n: number): T[][] => {
  const result: T[][] = []
  const current: T[] = []

  const combine = (start: number) => {
    if (current.length === n) {
      result.push([...current])
      return
    }

    for (let i = start; i < arr.length; i++) {
      const item = arr[i]
      if (item !== undefined) {
        current.push(item)
        combine(i + 1)
        current.pop()
      }
    }
  }

  combine(0)
  return result
}

export interface CellData {
  index: number
  candidates: readonly number[]
}
