import type { Cell } from "../../lib/sudoku/grid/sudoku-grid"
import { OptimizedBuffer, RGBA, TextAttributes } from "@opentui/core"

import { getCandidatesArray } from "../../lib/sudoku/grid/candidates"

export const drawCandidates = (
  frameBuffer: OptimizedBuffer,
  cell: Cell,
  cellX: number,
  cellY: number,
  candidatePositions: Array<[number, number]>,
  isSelected: boolean,
  highlightedNumber: number | null,
  candidateColor: RGBA,
  highlightColor: RGBA,
  selectedBackgroundColor: RGBA,
  backgroundColor: RGBA,
): void => {
  const candidates = getCandidatesArray(cell.candidates)
  const bg = isSelected ? selectedBackgroundColor : backgroundColor
  for (const candidate of candidates) {
    const pos = candidatePositions[candidate - 1]
    if (pos !== undefined) {
      const x = cellX + pos[0]
      const y = cellY + pos[1]
      const isHighlighted = candidate === highlightedNumber
      if (isHighlighted) {
        frameBuffer.fillRect(x, y, 1, 1, highlightColor)
      }
      frameBuffer.drawText(
        candidate.toString(),
        x,
        y,
        candidateColor,
        isHighlighted ? highlightColor : bg,
      )
    }
  }
}

export const drawCellValue = (
  frameBuffer: OptimizedBuffer,
  cell: Cell,
  cellX: number,
  cellY: number,
  centerX: number,
  centerY: number,
  isSelected: boolean,
  isHighlighted: boolean,
  fixedColor: RGBA,
  valueColor: RGBA,
  selectedTextColor: RGBA,
  selectedBackgroundColor: RGBA,
  highlightColor: RGBA,
  backgroundColor: RGBA,
): void => {
  const isFixed = cell.fixed
  const fg = isSelected ? selectedTextColor : isFixed ? fixedColor : valueColor
  const bg = isSelected ? selectedBackgroundColor : isHighlighted ? highlightColor : backgroundColor
  const attributes = isFixed ? TextAttributes.BOLD : 0

  const x = cellX + centerX
  const y = cellY + centerY
  frameBuffer.drawText(cell.value.toString(), x, y, fg, bg, attributes)
}
