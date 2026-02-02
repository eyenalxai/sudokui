import { Option } from "effect"

import { CANDIDATE_MASKS, GRID_SIZE } from "./constants.ts"

export const countCandidates = (candidates: number): number => {
  let count = 0
  let mask = candidates
  while (mask) {
    count += mask & 1
    mask >>= 1
  }
  return count
}

export const getSingleCandidate = (candidates: number): Option.Option<number> => {
  if (countCandidates(candidates) === 1) {
    for (let i = 1; i <= GRID_SIZE; i++) {
      const mask = CANDIDATE_MASKS[i]
      if (mask !== undefined && candidates & mask) {
        return Option.some(i)
      }
    }
  }
  return Option.none()
}

export const getCandidatesArray = (candidates: number): number[] => {
  const result: number[] = []
  for (let i = 1; i <= GRID_SIZE; i++) {
    const mask = CANDIDATE_MASKS[i]
    if (mask !== undefined && candidates & mask) {
      result.push(i)
    }
  }
  return result
}
