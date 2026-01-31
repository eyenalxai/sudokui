// Index Helpers

export const indexToRow = (index: number): number => Math.floor(index / 9)
export const indexToCol = (index: number): number => index % 9
export const indexToBlock = (index: number): number =>
  Math.floor(index / 27) * 3 + Math.floor((index % 9) / 3)

export const rowColToIndex = (row: number, col: number): number => row * 9 + col

// Get all indices in the same row
export const getRowIndices = (index: number): readonly number[] => {
  const row = indexToRow(index)
  return Array.from({ length: 9 }, (_, i) => row * 9 + i)
}

// Get all indices in the same column
export const getColIndices = (index: number): readonly number[] => {
  const col = indexToCol(index)
  return Array.from({ length: 9 }, (_, i) => i * 9 + col)
}

// Get all indices in the same 3x3 block
export const getBlockIndices = (index: number): readonly number[] => {
  const blockRow = Math.floor(index / 27)
  const blockCol = Math.floor((index % 9) / 3)
  const startIndex = blockRow * 27 + blockCol * 3
  return [
    startIndex,
    startIndex + 1,
    startIndex + 2,
    startIndex + 9,
    startIndex + 10,
    startIndex + 11,
    startIndex + 18,
    startIndex + 19,
    startIndex + 20,
  ]
}

// Get all peers (same row, col, or block) - excluding self
export const getPeers = (index: number): readonly number[] => {
  const peers = new Set<number>()

  // Row
  for (let i = 0; i < 9; i++) {
    const idx = indexToRow(index) * 9 + i
    if (idx !== index) peers.add(idx)
  }

  // Col
  for (let i = 0; i < 9; i++) {
    const idx = i * 9 + indexToCol(index)
    if (idx !== index) peers.add(idx)
  }

  // Block
  const blockIndices = getBlockIndices(index)
  for (const idx of blockIndices) {
    if (idx !== index) peers.add(idx)
  }

  return Array.from(peers)
}
