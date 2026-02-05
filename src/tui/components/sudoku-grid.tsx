import type { Cell, SudokuGrid } from "../../lib/sudoku/grid/sudoku-grid"
import {
  FrameBufferRenderable,
  OptimizedBuffer,
  RGBA,
  TextAttributes,
  type FrameBufferOptions,
  type RenderContext,
} from "@opentui/core"
import { extend } from "@opentui/react"
import type { ReactNode } from "react"

import { getCandidatesArray } from "../../lib/sudoku/grid/candidates"
import { useTheme } from "../providers/theme"

type SudokuGridDisplayProps = {
  readonly grid: SudokuGrid
  readonly selectedCell: number
}

type SudokuGridRenderableOptions = FrameBufferOptions & {
  grid: SudokuGrid
  selectedCell: number
  cellWidth?: number
  cellHeight?: number
  gridColor?: string | RGBA
  boxBorderColor?: string | RGBA
  backgroundColor?: string | RGBA
  fixedColor?: string | RGBA
  valueColor?: string | RGBA
  selectedBackgroundColor?: string | RGBA
  selectedTextColor?: string | RGBA
  candidateColor?: string | RGBA
}

const GRID_SIZE = 9
const CELL_WIDTH = 5
const CELL_HEIGHT = 3

const isBoxBoundary = (index: number): boolean => index % 3 === 0

const GRID_CHARS = {
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

const resolveColor = (value: string | RGBA | undefined, fallback: RGBA): RGBA => {
  if (value instanceof RGBA) return value
  if (value !== undefined) return RGBA.fromHex(value)
  return fallback
}

class SudokuGridRenderable extends FrameBufferRenderable {
  private _grid: SudokuGrid
  private _selectedCell: number
  private _cellWidth: number
  private _cellHeight: number
  private _gridColor: RGBA
  private _boxBorderColor: RGBA
  private _backgroundColor: RGBA
  private _fixedColor: RGBA
  private _valueColor: RGBA
  private _selectedBackgroundColor: RGBA
  private _selectedTextColor: RGBA
  private _candidateColor: RGBA

  constructor(ctx: RenderContext, options: SudokuGridRenderableOptions) {
    super(ctx, options)
    this._grid = options.grid
    this._selectedCell = options.selectedCell
    this._cellWidth = Math.max(1, Math.floor(options.cellWidth ?? CELL_WIDTH))
    this._cellHeight = Math.max(1, Math.floor(options.cellHeight ?? CELL_HEIGHT))

    const fallbackGrid = RGBA.fromHex("#666666")
    const fallbackBoxBorder = RGBA.fromHex("#3399ff")
    const fallbackBg = RGBA.fromHex("#000000")
    const fallbackFixed = RGBA.fromHex("#ffffff")
    const fallbackValue = RGBA.fromHex("#cccccc")
    const fallbackSelectedBg = RGBA.fromHex("#3399ff")
    const fallbackSelectedText = RGBA.fromHex("#000000")
    const fallbackCandidate = RGBA.fromHex("#666666")

    this._gridColor = resolveColor(options.gridColor, fallbackGrid)
    this._boxBorderColor = resolveColor(options.boxBorderColor, fallbackBoxBorder)
    this._backgroundColor = resolveColor(options.backgroundColor, fallbackBg)
    this._fixedColor = resolveColor(options.fixedColor, fallbackFixed)
    this._valueColor = resolveColor(options.valueColor, fallbackValue)
    this._selectedBackgroundColor = resolveColor(
      options.selectedBackgroundColor,
      fallbackSelectedBg,
    )
    this._selectedTextColor = resolveColor(options.selectedTextColor, fallbackSelectedText)
    this._candidateColor = resolveColor(options.candidateColor, fallbackCandidate)
  }

  set grid(value: SudokuGrid) {
    this._grid = value
    this.requestRender()
  }

  set selectedCell(value: number) {
    this._selectedCell = value
    this.requestRender()
  }

  set cellWidth(value: number) {
    this._cellWidth = Math.max(1, Math.floor(value))
    this.requestRender()
  }

  set cellHeight(value: number) {
    this._cellHeight = Math.max(1, Math.floor(value))
    this.requestRender()
  }

  set gridColor(value: string | RGBA) {
    this._gridColor = resolveColor(value, this._gridColor)
    this.requestRender()
  }

  set boxBorderColor(value: string | RGBA) {
    this._boxBorderColor = resolveColor(value, this._boxBorderColor)
    this.requestRender()
  }

  set backgroundColor(value: string | RGBA) {
    this._backgroundColor = resolveColor(value, this._backgroundColor)
    this.requestRender()
  }

  set fixedColor(value: string | RGBA) {
    this._fixedColor = resolveColor(value, this._fixedColor)
    this.requestRender()
  }

  set valueColor(value: string | RGBA) {
    this._valueColor = resolveColor(value, this._valueColor)
    this.requestRender()
  }

  set selectedBackgroundColor(value: string | RGBA) {
    this._selectedBackgroundColor = resolveColor(value, this._selectedBackgroundColor)
    this.requestRender()
  }

  set selectedTextColor(value: string | RGBA) {
    this._selectedTextColor = resolveColor(value, this._selectedTextColor)
    this.requestRender()
  }

  set candidateColor(value: string | RGBA) {
    this._candidateColor = resolveColor(value, this._candidateColor)
    this.requestRender()
  }

  protected override renderSelf(buffer: OptimizedBuffer): void {
    this.drawGrid()
    super.renderSelf(buffer)
  }

  private drawGrid(): void {
    const frameBuffer = this.frameBuffer
    const xStride = this._cellWidth + 1
    const yStride = this._cellHeight + 1
    const gridWidth = GRID_SIZE * xStride + 1
    const gridHeight = GRID_SIZE * yStride + 1
    const centerX = Math.floor(this._cellWidth / 2)
    const centerY = Math.floor(this._cellHeight / 2)

    frameBuffer.fillRect(0, 0, this.width, this.height, this._backgroundColor)

    if (this._selectedCell >= 0 && this._selectedCell < GRID_SIZE * GRID_SIZE) {
      const row = Math.floor(this._selectedCell / GRID_SIZE)
      const col = this._selectedCell % GRID_SIZE
      const startX = 1 + col * xStride
      const startY = 1 + row * yStride
      frameBuffer.fillRect(
        startX,
        startY,
        this._cellWidth,
        this._cellHeight,
        this._selectedBackgroundColor,
      )
    }

    for (let lineIndex = 0; lineIndex <= GRID_SIZE; lineIndex++) {
      const y = lineIndex * yStride
      const isBoxLine = isBoxBoundary(lineIndex)
      const lineColor = isBoxLine ? this._boxBorderColor : this._gridColor
      const line = GRID_CHARS.horizontal.repeat(gridWidth)
      frameBuffer.drawText(line, 0, y, lineColor, this._backgroundColor)
    }

    for (let lineIndex = 0; lineIndex <= GRID_SIZE; lineIndex++) {
      const x = lineIndex * xStride
      const isBoxLine = isBoxBoundary(lineIndex)
      const lineColor = isBoxLine ? this._boxBorderColor : this._gridColor
      for (let y = 0; y < gridHeight; y++) {
        frameBuffer.setCell(x, y, GRID_CHARS.vertical, lineColor, this._backgroundColor)
      }
    }

    for (let rowIndex = 0; rowIndex <= GRID_SIZE; rowIndex++) {
      const y = rowIndex * yStride
      const atTop = rowIndex === 0
      const atBottom = rowIndex === GRID_SIZE
      const isBoxRow = isBoxBoundary(rowIndex)

      for (let colIndex = 0; colIndex <= GRID_SIZE; colIndex++) {
        const x = colIndex * xStride
        const atLeft = colIndex === 0
        const atRight = colIndex === GRID_SIZE
        const isBoxCol = isBoxBoundary(colIndex)

        const isIntersection = isBoxRow || isBoxCol
        const lineColor = isIntersection ? this._boxBorderColor : this._gridColor

        let char = GRID_CHARS.cross
        if (atTop && atLeft) char = GRID_CHARS.topLeft
        else if (atTop && atRight) char = GRID_CHARS.topRight
        else if (atBottom && atLeft) char = GRID_CHARS.bottomLeft
        else if (atBottom && atRight) char = GRID_CHARS.bottomRight
        else if (atTop) char = GRID_CHARS.topT
        else if (atBottom) char = GRID_CHARS.bottomT
        else if (atLeft) char = GRID_CHARS.leftT
        else if (atRight) char = GRID_CHARS.rightT

        frameBuffer.setCell(x, y, char, lineColor, this._backgroundColor)
      }
    }

    // Candidate positions in a 3x3 grid within each cell (5x3 cell size)
    const candidatePositions: Array<[number, number]> = [
      [0, 0],
      [2, 0],
      [4, 0], // 1, 2, 3
      [0, 1],
      [2, 1],
      [4, 1], // 4, 5, 6
      [0, 2],
      [2, 2],
      [4, 2], // 7, 8, 9
    ]

    for (let row = 0; row < GRID_SIZE; row++) {
      for (let col = 0; col < GRID_SIZE; col++) {
        const cellIndex = row * GRID_SIZE + col
        const cell = this._grid.cells[cellIndex]
        if (!cell) continue

        const cellX = 1 + col * xStride
        const cellY = 1 + row * yStride
        const isSelected = cellIndex === this._selectedCell

        if (cell.value === 0) {
          this.drawCandidates(frameBuffer, cell, cellX, cellY, candidatePositions, isSelected)
        } else {
          this.drawCellValue(frameBuffer, cell, cellX, cellY, centerX, centerY, isSelected)
        }
      }
    }
  }

  private drawCandidates(
    frameBuffer: OptimizedBuffer,
    cell: Cell,
    cellX: number,
    cellY: number,
    candidatePositions: Array<[number, number]>,
    isSelected: boolean,
  ): void {
    const candidates = getCandidatesArray(cell.candidates)
    const bg = isSelected ? this._selectedBackgroundColor : this._backgroundColor
    for (const candidate of candidates) {
      const pos = candidatePositions[candidate - 1]
      if (pos !== undefined) {
        const x = cellX + pos[0]
        const y = cellY + pos[1]
        frameBuffer.drawText(candidate.toString(), x, y, this._candidateColor, bg)
      }
    }
  }

  private drawCellValue(
    frameBuffer: OptimizedBuffer,
    cell: Cell,
    cellX: number,
    cellY: number,
    centerX: number,
    centerY: number,
    isSelected: boolean,
  ): void {
    const isFixed = cell.fixed
    const fg = isSelected ? this._selectedTextColor : isFixed ? this._fixedColor : this._valueColor
    const attributes = isFixed ? TextAttributes.BOLD : 0

    const x = cellX + centerX
    const y = cellY + centerY
    frameBuffer.drawText(cell.value.toString(), x, y, fg, undefined, attributes)
  }
}

declare module "@opentui/react" {
  interface OpenTUIComponents {
    sudokuGrid: typeof SudokuGridRenderable
  }
}

extend({ sudokuGrid: SudokuGridRenderable })

export const SudokuGridDisplay = ({ grid, selectedCell }: SudokuGridDisplayProps): ReactNode => {
  const theme = useTheme()
  const cellWidth = CELL_WIDTH
  const cellHeight = CELL_HEIGHT
  const gridWidth = GRID_SIZE * (cellWidth + 1) + 1
  const gridHeight = GRID_SIZE * (cellHeight + 1) + 1

  return (
    <sudokuGrid
      grid={grid}
      selectedCell={selectedCell}
      cellWidth={cellWidth}
      cellHeight={cellHeight}
      width={gridWidth}
      height={gridHeight}
      flexShrink={0}
      gridColor={theme.border}
      boxBorderColor={theme.text}
      backgroundColor={theme.background}
      fixedColor={theme.text}
      valueColor={theme.secondary}
      selectedBackgroundColor={theme.primary}
      selectedTextColor={theme.background}
      candidateColor={theme.textMuted}
    />
  )
}
