import type { Cell, SudokuGrid } from "../../lib/sudoku/grid/sudoku-grid"
import type { FrameBufferOptions } from "@opentui/core"
import { OptimizedBuffer, RGBA, TextAttributes } from "@opentui/core"

import { getCandidatesArray } from "../../lib/sudoku/grid/candidates"

export type SudokuGridDisplayProps = {
  readonly grid: SudokuGrid
  readonly selectedCell: number
  readonly highlightedNumber?: number | null
}

export type SudokuGridRenderableOptions = FrameBufferOptions & {
  grid: SudokuGrid
  selectedCell: number
  highlightedNumber: number | null
  cellWidth?: number
  cellHeight?: number
  gridColor?: string | RGBA
  boxBorderColor?: string | RGBA
  highlightColor?: string | RGBA
  backgroundColor?: string | RGBA
  fixedColor?: string | RGBA
  valueColor?: string | RGBA
  selectedBackgroundColor?: string | RGBA
  selectedTextColor?: string | RGBA
  candidateColor?: string | RGBA
  highlightTextColor?: string | RGBA
  errorColor?: string | RGBA
}

export const GRID_CHARS = {
  horizontal: "─",
  vertical: "│",
  topLeft: "┌",
  topRight: "┐",
  bottomLeft: "└",
  bottomRight: "┘",
  topT: "┬",
  bottomT: "┴",
  leftT: "├",
  rightT: "┤",
  cross: "┼",
}

export const resolveColor = (value: string | RGBA | undefined, fallback: RGBA): RGBA => {
  if (value instanceof RGBA) return value
  if (value !== undefined) return RGBA.fromHex(value)
  return fallback
}

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
  highlightTextColor: RGBA,
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
        isHighlighted ? highlightTextColor : candidateColor,
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
  hasError: boolean,
  fixedColor: RGBA,
  valueColor: RGBA,
  selectedTextColor: RGBA,
  selectedBackgroundColor: RGBA,
  highlightColor: RGBA,
  backgroundColor: RGBA,
  highlightTextColor: RGBA,
  errorColor: RGBA,
): void => {
  const isFixed = cell.fixed
  const fg = hasError
    ? backgroundColor
    : isHighlighted
      ? highlightTextColor
      : isSelected
        ? selectedTextColor
        : isFixed
          ? fixedColor
          : valueColor
  const bg = hasError
    ? errorColor
    : isHighlighted
      ? highlightColor
      : isSelected
        ? selectedBackgroundColor
        : backgroundColor
  const attributes = isFixed ? TextAttributes.BOLD : 0

  const x = cellX + centerX
  const y = cellY + centerY
  frameBuffer.drawText(cell.value.toString(), x, y, fg, bg, attributes)
}
