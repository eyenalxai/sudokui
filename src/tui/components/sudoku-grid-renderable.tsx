import type { SudokuGrid } from "../../lib/sudoku/grid/sudoku-grid"
import { FrameBufferRenderable, OptimizedBuffer, RGBA, type RenderContext } from "@opentui/core"
import { extend } from "@opentui/react"

import {
  drawCandidates,
  drawCellValue,
  GRID_CHARS,
  resolveColor,
  type SudokuGridRenderableOptions,
} from "./sudoku-grid-draw"

const GRID_SIZE = 9
const CELL_WIDTH = 5
const CELL_HEIGHT = 3

const isBoxBoundary = (index: number): boolean => index % 3 === 0

export class SudokuGridRenderable extends FrameBufferRenderable {
  private _grid: SudokuGrid
  private _selectedCell: number
  private _highlightedNumber: number | null
  private _cellWidth: number
  private _cellHeight: number
  private _gridColor: RGBA
  private _boxBorderColor: RGBA
  private _highlightColor: RGBA
  private _backgroundColor: RGBA
  private _fixedColor: RGBA
  private _valueColor: RGBA
  private _selectedBackgroundColor: RGBA
  private _selectedTextColor: RGBA
  private _candidateColor: RGBA
  private _highlightTextColor: RGBA

  constructor(ctx: RenderContext, options: SudokuGridRenderableOptions) {
    super(ctx, options)
    this._grid = options.grid
    this._selectedCell = options.selectedCell
    this._highlightedNumber = options.highlightedNumber ?? null
    this._cellWidth = Math.max(1, Math.floor(options.cellWidth ?? CELL_WIDTH))
    this._cellHeight = Math.max(1, Math.floor(options.cellHeight ?? CELL_HEIGHT))

    this._gridColor = resolveColor(options.gridColor, RGBA.fromHex("#666666"))
    this._boxBorderColor = resolveColor(options.boxBorderColor, RGBA.fromHex("#3399ff"))
    this._highlightColor = resolveColor(options.highlightColor, RGBA.fromHex("#2a4a6a"))
    this._backgroundColor = resolveColor(options.backgroundColor, RGBA.fromHex("#000000"))
    this._fixedColor = resolveColor(options.fixedColor, RGBA.fromHex("#ffffff"))
    this._valueColor = resolveColor(options.valueColor, RGBA.fromHex("#cccccc"))
    this._selectedBackgroundColor = resolveColor(
      options.selectedBackgroundColor,
      RGBA.fromHex("#3399ff"),
    )
    this._selectedTextColor = resolveColor(options.selectedTextColor, RGBA.fromHex("#000000"))
    this._candidateColor = resolveColor(options.candidateColor, RGBA.fromHex("#666666"))
    this._highlightTextColor = resolveColor(options.highlightTextColor, RGBA.fromHex("#ffffff"))
  }

  set grid(value: SudokuGrid) {
    this._grid = value
    this.requestRender()
  }

  set selectedCell(value: number) {
    this._selectedCell = value
    this.requestRender()
  }

  set highlightedNumber(value: number | null) {
    this._highlightedNumber = value
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
  set highlightColor(value: string | RGBA) {
    this._highlightColor = resolveColor(value, this._highlightColor)
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
  set highlightTextColor(value: string | RGBA) {
    this._highlightTextColor = resolveColor(value, this._highlightTextColor)
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

    // Selected cell highlight (drawn after background so it takes priority)
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
          drawCandidates(
            frameBuffer,
            cell,
            cellX,
            cellY,
            candidatePositions,
            isSelected,
            this._highlightedNumber,
            this._candidateColor,
            this._highlightColor,
            this._selectedBackgroundColor,
            this._backgroundColor,
            this._highlightTextColor,
          )
        } else {
          const isHighlighted = cell.value === this._highlightedNumber
          drawCellValue(
            frameBuffer,
            cell,
            cellX,
            cellY,
            centerX,
            centerY,
            isSelected,
            isHighlighted,
            this._fixedColor,
            this._valueColor,
            this._selectedTextColor,
            this._selectedBackgroundColor,
            this._highlightColor,
            this._backgroundColor,
            this._highlightTextColor,
          )
        }
      }
    }
  }
}
extend({ sudokuGrid: SudokuGridRenderable })
