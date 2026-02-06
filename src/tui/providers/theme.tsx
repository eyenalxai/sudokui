import { homedir } from "node:os"
import { join } from "node:path"

import { FileSystem } from "@effect/platform"
import { BunContext } from "@effect/platform-bun"
import { useRenderer } from "@opentui/react"
import { Effect, Option, Schema } from "effect"
import { createContext, useContext, useEffect, useState, type ReactNode } from "react"

import { ANSI_FALLBACK, luminance, mix, normalizeHex } from "../utils/colors"

const cachePath = join(homedir(), ".local/share/sudokui/theme-cache.json")
const cacheDir = join(homedir(), ".local/share/sudokui")

const PaletteInputSchema = Schema.Struct({
  palette: Schema.Array(Schema.NullOr(Schema.String)),
  defaultForeground: Schema.NullOr(Schema.String),
  defaultBackground: Schema.NullOr(Schema.String),
})

const readCache = Effect.gen(function* () {
  const fs = yield* FileSystem.FileSystem
  const content = yield* fs.readFileString(cachePath)
  const parsed = yield* Effect.try(() => JSON.parse(content) as unknown)
  return yield* Schema.decodeUnknown(PaletteInputSchema)(parsed)
}).pipe(Effect.provide(BunContext.layer), Effect.option)

const writeCache = (input: PaletteInput) =>
  Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem
    yield* fs.makeDirectory(cacheDir, { recursive: true })
    yield* fs.writeFileString(cachePath, JSON.stringify(input))
  }).pipe(
    Effect.provide(BunContext.layer),
    Effect.catchAll(() => Effect.void),
  )

export type Theme = {
  primary: string
  secondary: string
  error: string
  warning: string
  success: string
  text: string
  textMuted: string
  background: string
  border: string
  borderSubtle: string
  // Full ANSI palette (0-15) - use these for custom theming
  palette0: string
  palette1: string
  palette2: string
  palette3: string
  palette4: string
  palette5: string
  palette6: string
  palette7: string
  palette8: string
  palette9: string
  palette10: string
  palette11: string
  palette12: string
  palette13: string
  palette14: string
  palette15: string
}

type PaletteInput = {
  palette: ReadonlyArray<string | null>
  defaultForeground: string | null
  defaultBackground: string | null
}

const ThemeContext = createContext<Theme | null>(null)

const buildTheme = (input: PaletteInput): Theme => {
  const fallbackBackground = ANSI_FALLBACK[0] ?? "#000000"
  const fallbackForeground = ANSI_FALLBACK[7] ?? "#ffffff"
  const colorAt = (index: number) =>
    normalizeHex(input.palette[index], ANSI_FALLBACK[index] ?? fallbackForeground)
  const background = normalizeHex(input.defaultBackground, fallbackBackground)
  const text = normalizeHex(input.defaultForeground, fallbackForeground)
  const isDark = luminance(background) < 0.5

  const borderSubtle = mix(background, text, isDark ? 0.2 : 0.18)
  const border = mix(background, text, isDark ? 0.35 : 0.3)
  const textMuted = mix(text, background, isDark ? 0.45 : 0.55)

  return {
    primary: colorAt(6),
    secondary: colorAt(5),
    error: colorAt(1),
    warning: colorAt(3),
    success: colorAt(2),
    text,
    textMuted,
    background,
    border,
    borderSubtle,
    // Full ANSI palette
    palette0: colorAt(0),
    palette1: colorAt(1),
    palette2: colorAt(2),
    palette3: colorAt(3),
    palette4: colorAt(4),
    palette5: colorAt(5),
    palette6: colorAt(6),
    palette7: colorAt(7),
    palette8: colorAt(8),
    palette9: colorAt(9),
    palette10: colorAt(10),
    palette11: colorAt(11),
    palette12: colorAt(12),
    palette13: colorAt(13),
    palette14: colorAt(14),
    palette15: colorAt(15),
  }
}

const fallbackTheme = buildTheme({
  palette: ANSI_FALLBACK,
  defaultForeground: ANSI_FALLBACK[7] ?? "#ffffff",
  defaultBackground: ANSI_FALLBACK[0] ?? "#000000",
})

export const ThemeProvider = ({ children }: { readonly children: ReactNode }) => {
  const renderer = useRenderer()
  const [theme, setTheme] = useState<Theme | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let active = true

    const program = Effect.gen(function* () {
      const cached = yield* readCache
      if (
        Option.isSome(cached) &&
        cached.value.palette[0] !== null &&
        cached.value.palette[0] !== undefined &&
        cached.value.palette[0] !== "" &&
        active
      ) {
        setTheme(buildTheme(cached.value))
        setIsLoading(false)
      }

      const fresh = yield* Effect.tryPromise(async () => renderer.getPalette({ size: 16 }))
      if (
        !active ||
        fresh.palette[0] === null ||
        fresh.palette[0] === undefined ||
        fresh.palette[0] === ""
      ) {
        return
      }

      const freshInput: PaletteInput = {
        palette: fresh.palette,
        defaultForeground: fresh.defaultForeground,
        defaultBackground: fresh.defaultBackground,
      }

      const cachedValue = Option.isSome(cached) ? cached.value : null
      const hasChanged = JSON.stringify(cachedValue) !== JSON.stringify(freshInput)
      if (hasChanged) {
        setTheme(buildTheme(freshInput))
        yield* writeCache(freshInput)
      }
    }).pipe(
      Effect.catchAll(() => Effect.void),
      Effect.ensuring(
        Effect.sync(() => {
          if (active) setIsLoading(false)
        }),
      ),
    )

    void Effect.runPromise(program)
    return () => {
      active = false
    }
  }, [renderer])

  if (isLoading && !theme) {
    return null
  }

  return <ThemeContext.Provider value={theme ?? fallbackTheme}>{children}</ThemeContext.Provider>
}

export const useTheme = () => {
  const theme = useContext(ThemeContext)
  if (!theme) {
    throw new Error("useTheme must be used within ThemeProvider")
  }
  return theme
}
