#!/usr/bin/env bun
import { readdir, readFile, writeFile, mkdir } from "node:fs/promises"
import { join, parse } from "node:path"

import { Effect, Schema } from "effect"

export class FileReadError extends Schema.TaggedError<FileReadError>()("FileReadError", {
  path: Schema.String,
  cause: Schema.String,
}) {}

export class FileWriteError extends Schema.TaggedError<FileWriteError>()("FileWriteError", {
  path: Schema.String,
  cause: Schema.String,
}) {}

export class CSVParseError extends Schema.TaggedError<CSVParseError>()("CSVParseError", {
  path: Schema.String,
  message: Schema.String,
}) {}

export class InvalidPuzzleDataError extends Schema.TaggedError<InvalidPuzzleDataError>()(
  "InvalidPuzzleDataError",
  {
    path: Schema.String,
    message: Schema.String,
  },
) {}

const PuzzleSchema = Schema.Struct({
  grid: Schema.String,
  solution: Schema.String,
})

const PuzzleSetSchema = Schema.Struct({
  difficulty: Schema.String,
  puzzles: Schema.Array(PuzzleSchema),
})

function toTitleCase(str: string): string {
  return str
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ")
}

function parseCSV(content: string): Array<Array<string>> {
  const lines = content.trim().split("\n")
  return lines.map((line) => {
    const result: Array<string> = []
    let current = ""
    let inQuotes = false

    for (const char of line) {
      if (char === '"') {
        inQuotes = !inQuotes
      } else if (char === "," && !inQuotes) {
        result.push(current)
        current = ""
      } else {
        current += char
      }
    }
    result.push(current)
    return result
  })
}

const scriptDir = new URL(".", import.meta.url).pathname
const outputDir = join(scriptDir, "..", "src", "data", "puzzles")

const readCSVFile = (filePath: string) =>
  Effect.tryPromise({
    try: () => readFile(filePath, "utf-8"),
    catch: (error) =>
      new FileReadError({
        path: filePath,
        cause: String(error),
      }),
  })

const writeJSONFile = (filePath: string, data: unknown) =>
  Effect.tryPromise({
    try: () => writeFile(filePath, JSON.stringify(data, null, 2), "utf-8"),
    catch: (error) =>
      new FileWriteError({
        path: filePath,
        cause: String(error),
      }),
  })

const ensureOutputDir = () =>
  Effect.tryPromise({
    try: () => mkdir(outputDir, { recursive: true }),
    catch: (error) =>
      new FileWriteError({
        path: outputDir,
        cause: String(error),
      }),
  }).pipe(Effect.as(outputDir))

const getCSVFiles = (inputDir: string) =>
  Effect.tryPromise({
    try: () => readdir(inputDir),
    catch: (error) =>
      new FileReadError({
        path: inputDir,
        cause: String(error),
      }),
  }).pipe(Effect.map((files) => files.filter((f) => f.endsWith(".csv"))))

const convertFile = Effect.fn("PuzzleConverter.convertFile")(function* (
  inputDir: string,
  filename: string,
) {
  const filePath = join(inputDir, filename)

  yield* Effect.log(`Processing ${filename}...`)

  const content = yield* readCSVFile(filePath)
  const rows = parseCSV(content)

  const header = rows[0]
  if (header === undefined || rows.length < 2) {
    return yield* Effect.fail(
      new CSVParseError({
        path: filePath,
        message: "No data rows found",
      }),
    )
  }

  const sudokuIndex = header.indexOf("Sudoku")
  const solutionIndex = header.indexOf("Solution")

  if (sudokuIndex === -1 || solutionIndex === -1) {
    return yield* Effect.fail(
      new CSVParseError({
        path: filePath,
        message: "Missing Sudoku or Solution column",
      }),
    )
  }

  const puzzles: Array<{ grid: string; solution: string }> = []
  for (const row of rows.slice(1)) {
    const grid = row[sudokuIndex]
    const solution = row[solutionIndex]

    if (grid !== undefined && solution !== undefined) {
      if (grid.length !== 81 || solution.length !== 81) {
        return yield* Effect.fail(
          new InvalidPuzzleDataError({
            path: filePath,
            message: `Invalid puzzle length: grid=${grid.length}, solution=${solution.length}`,
          }),
        )
      }
      puzzles.push({ grid, solution })
    }
  }

  const { name } = parse(filename)
  const difficulty = toTitleCase(name)

  const output = {
    difficulty,
    puzzles,
  }

  yield* Schema.decodeUnknown(PuzzleSetSchema)(output).pipe(
    Effect.mapError(
      (error) =>
        new InvalidPuzzleDataError({
          path: filePath,
          message: `Schema validation failed: ${String(error)}`,
        }),
    ),
  )

  const outputFilename = `${name}.json`
  const outputPath = join(outputDir, outputFilename)
  yield* writeJSONFile(outputPath, output)

  yield* Effect.log(`Converted ${filename} → ${outputFilename} (${puzzles.length} puzzles)`)

  return { filename, puzzleCount: puzzles.length }
})

const convertDirectory = Effect.fn("PuzzleConverter.convertDirectory")(function* (
  inputDir: string,
) {
  yield* ensureOutputDir()

  const csvFiles = yield* getCSVFiles(inputDir)

  if (csvFiles.length === 0) {
    return yield* Effect.fail(
      new InvalidPuzzleDataError({
        path: inputDir,
        message: "No CSV files found in directory",
      }),
    )
  }

  yield* Effect.log(`Found ${csvFiles.length} CSV files to convert`)

  const results = yield* Effect.forEach(csvFiles, (filename) => convertFile(inputDir, filename), {
    concurrency: "unbounded",
  })

  const totalPuzzles = results.reduce((sum, r) => sum + r.puzzleCount, 0)

  yield* Effect.log(`\nConversion complete! ${totalPuzzles} total puzzles converted`)

  return results
})

export class PuzzleConverter extends Effect.Service<PuzzleConverter>()("PuzzleConverter", {
  accessors: true,
  succeed: {
    convertDirectory,
  },
}) {}

const program = Effect.gen(function* () {
  const inputDir = process.argv[2]

  if (inputDir === undefined) {
    yield* Effect.logError("Usage: bun scripts/convert-puzzles.ts <input-directory>")
    return yield* Effect.fail(
      new InvalidPuzzleDataError({
        path: "",
        message: "Input directory not provided",
      }),
    )
  }

  const converter = yield* PuzzleConverter
  yield* converter.convertDirectory(inputDir)
})

const runnable = program.pipe(Effect.provide(PuzzleConverter.Default))

await Effect.runPromise(runnable)
