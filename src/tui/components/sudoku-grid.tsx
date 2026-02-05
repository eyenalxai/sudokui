import type { SudokuGrid } from "../../lib/sudoku/grid/sudoku-grid"
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

import { useTheme } from "../providers/theme"

type SudokuGridDisplayProps = {
  readonly grid: SudokuGrid
  readonly selectedCell: number
}

type SudokuGridRenderableOptions = FrameBufferOptions & {
  grid: SudokuGrid
  selectedCell: number
  cellSize?: number
  gridColor?: string | RGBA
  backgroundColor?: string | RGBA
  fixedColor?: string | RGBA
  valueColor?: string | RGBA
  selectedBackgroundColor?: string | RGBA
  selectedTextColor?: string | RGBA
}

const GRID_SIZE = 9
const DEFAULT_CELL_SIZE = 3

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
  private _cellSize: number
  private _gridColor: RGBA
  private _backgroundColor: RGBA
  private _fixedColor: RGBA
  private _valueColor: RGBA
  private _selectedBackgroundColor: RGBA
  private _selectedTextColor: RGBA

  constructor(ctx: RenderContext, options: SudokuGridRenderableOptions) {
    super(ctx, options)
    this._grid = options.grid
    this._selectedCell = options.selectedCell
    this._cellSize = Math.max(1, Math.floor(options.cellSize ?? DEFAULT_CELL_SIZE))

    const fallbackGrid = RGBA.fromHex("#666666")
    const fallbackBg = RGBA.fromHex("#000000")
    const fallbackFixed = RGBA.fromHex("#ffffff")
    const fallbackValue = RGBA.fromHex("#cccccc")
    const fallbackSelectedBg = RGBA.fromHex("#3399ff")
    const fallbackSelectedText = RGBA.fromHex("#000000")

    this._gridColor = resolveColor(options.gridColor, fallbackGrid)
    this._backgroundColor = resolveColor(options.backgroundColor, fallbackBg)
    this._fixedColor = resolveColor(options.fixedColor, fallbackFixed)
    this._valueColor = resolveColor(options.valueColor, fallbackValue)
    this._selectedBackgroundColor = resolveColor(
      options.selectedBackgroundColor,
      fallbackSelectedBg,
    )
    this._selectedTextColor = resolveColor(options.selectedTextColor, fallbackSelectedText)
  }

  set grid(value: SudokuGrid) {
    this._grid = value
    this.requestRender()
  }

  set selectedCell(value: number) {
    this._selectedCell = value
    this.requestRender()
  }

  set cellSize(value: number) {
    this._cellSize = Math.max(1, Math.floor(value))
    this.requestRender()
  }

  set gridColor(value: string | RGBA) {
    this._gridColor = resolveColor(value, this._gridColor)
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

  protected override renderSelf(buffer: OptimizedBuffer): void {
    this.drawGrid()
    super.renderSelf(buffer)
  }

  private drawGrid(): void {
    const frameBuffer = this.frameBuffer
    const stride = this._cellSize + 1
    const gridWidth = GRID_SIZE * stride + 1
    const gridHeight = GRID_SIZE * stride + 1
    const centerOffset = Math.floor(this._cellSize / 2)

    frameBuffer.fillRect(0, 0, this.width, this.height, this._backgroundColor)

    if (this._selectedCell >= 0 && this._selectedCell < GRID_SIZE * GRID_SIZE) {
      const row = Math.floor(this._selectedCell / GRID_SIZE)
      const col = this._selectedCell % GRID_SIZE
      const startX = 1 + col * stride
      const startY = 1 + row * stride
      frameBuffer.fillRect(
        startX,
        startY,
        this._cellSize,
        this._cellSize,
        this._selectedBackgroundColor,
      )
    }

    const horizontalLine = GRID_CHARS.horizontal.repeat(gridWidth)

    for (let lineIndex = 0; lineIndex <= GRID_SIZE; lineIndex++) {
      const y = lineIndex * stride
      frameBuffer.drawText(horizontalLine, 0, y, this._gridColor, this._backgroundColor)
    }

    for (let lineIndex = 0; lineIndex <= GRID_SIZE; lineIndex++) {
      const x = lineIndex * stride
      for (let y = 0; y < gridHeight; y++) {
        frameBuffer.setCell(x, y, GRID_CHARS.vertical, this._gridColor, this._backgroundColor)
      }
    }

    for (let rowIndex = 0; rowIndex <= GRID_SIZE; rowIndex++) {
      const y = rowIndex * stride
      const atTop = rowIndex === 0
      const atBottom = rowIndex === GRID_SIZE

      for (let colIndex = 0; colIndex <= GRID_SIZE; colIndex++) {
        const x = colIndex * stride
        const atLeft = colIndex === 0
        const atRight = colIndex === GRID_SIZE

        let char = GRID_CHARS.cross
        if (atTop && atLeft) char = GRID_CHARS.topLeft
        else if (atTop && atRight) char = GRID_CHARS.topRight
        else if (atBottom && atLeft) char = GRID_CHARS.bottomLeft
        else if (atBottom && atRight) char = GRID_CHARS.bottomRight
        else if (atTop) char = GRID_CHARS.topT
        else if (atBottom) char = GRID_CHARS.bottomT
        else if (atLeft) char = GRID_CHARS.leftT
        else if (atRight) char = GRID_CHARS.rightT

        frameBuffer.setCell(x, y, char, this._gridColor, this._backgroundColor)
      }
    }

    for (let row = 0; row < GRID_SIZE; row++) {
      for (let col = 0; col < GRID_SIZE; col++) {
        const cellIndex = row * GRID_SIZE + col
        const cell = this._grid.cells[cellIndex]
        if (!cell || cell.value === 0) continue

        const isSelected = cellIndex === this._selectedCell
        const isFixed = cell.fixed
        const fg = isSelected
          ? this._selectedTextColor
          : isFixed
            ? this._fixedColor
            : this._valueColor
        const attributes = isFixed ? TextAttributes.BOLD : 0

        const x = 1 + col * stride + centerOffset
        const y = 1 + row * stride + centerOffset
        frameBuffer.drawText(cell.value.toString(), x, y, fg, undefined, attributes)
      }
    }
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
  const cellSize = DEFAULT_CELL_SIZE
  const gridSpan = GRID_SIZE * (cellSize + 1) + 1

  return (
    <sudokuGrid
      grid={grid}
      selectedCell={selectedCell}
      cellSize={cellSize}
      width={gridSpan}
      height={gridSpan}
      flexShrink={0}
      gridColor={theme.border}
      backgroundColor={theme.background}
      fixedColor={theme.text}
      valueColor={theme.secondary}
      selectedBackgroundColor={theme.primary}
      selectedTextColor={theme.background}
    />
  )
}
