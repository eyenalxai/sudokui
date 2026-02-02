import { BLOCK_SIZE, GRID_SIZE, TOTAL_CELLS } from "./constants.ts"

const BLOCK_AREA = GRID_SIZE * BLOCK_SIZE

export const indexToRow = (index: number): number => Math.floor(index / GRID_SIZE)
export const indexToCol = (index: number): number => index % GRID_SIZE
export const indexToBlock = (index: number): number =>
  Math.floor(index / BLOCK_AREA) * BLOCK_SIZE + Math.floor((index % GRID_SIZE) / BLOCK_SIZE)

export const rowColToIndex = (row: number, col: number): number => row * GRID_SIZE + col

export const getRowIndices = (index: number): readonly number[] => {
  const row = indexToRow(index)
  return Array.from({ length: GRID_SIZE }, (_, i) => row * GRID_SIZE + i)
}

export const getColIndices = (index: number): readonly number[] => {
  const col = indexToCol(index)
  return Array.from({ length: GRID_SIZE }, (_, i) => i * GRID_SIZE + col)
}

export const getBlockIndices = (index: number): readonly number[] => {
  const blockRow = Math.floor(index / BLOCK_AREA)
  const blockCol = Math.floor((index % GRID_SIZE) / BLOCK_SIZE)
  const startIndex = blockRow * BLOCK_AREA + blockCol * BLOCK_SIZE
  const indices: number[] = []
  for (let r = 0; r < BLOCK_SIZE; r++) {
    for (let c = 0; c < BLOCK_SIZE; c++) {
      indices.push(startIndex + r * GRID_SIZE + c)
    }
  }
  return indices
}

const computePeers = (index: number): readonly number[] => {
  const peers = new Set<number>()

  // Row
  const rowStart = indexToRow(index) * GRID_SIZE
  for (let i = 0; i < GRID_SIZE; i++) {
    const idx = rowStart + i
    if (idx !== index) peers.add(idx)
  }

  // Col
  const col = indexToCol(index)
  for (let i = 0; i < GRID_SIZE; i++) {
    const idx = i * GRID_SIZE + col
    if (idx !== index) peers.add(idx)
  }

  // Block
  const blockIndices = getBlockIndices(index)
  for (const idx of blockIndices) {
    if (idx !== index) peers.add(idx)
  }

  return Array.from(peers)
}

const PEER_CACHE: readonly (readonly number[])[] = Array.from({ length: TOTAL_CELLS }, (_, i) =>
  computePeers(i),
)

export const getPeers = (index: number): readonly number[] => PEER_CACHE[index] ?? []
