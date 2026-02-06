import { BunContext, BunRuntime } from "@effect/platform-bun"
import { createCliRenderer } from "@opentui/core"
import { createRoot } from "@opentui/react"
import { Effect, Schema } from "effect"

import { App } from "./tui/components/app"
import { RootBox } from "./tui/components/root-box"
import { Toast } from "./tui/components/toast-notification"
import { ExitProvider } from "./tui/providers/exit"
import { ThemeProvider } from "./tui/providers/theme"
import { ToastProvider } from "./tui/providers/toast"

class RendererInitError extends Schema.TaggedError<RendererInitError>()("RendererInitError", {
  message: Schema.String,
  cause: Schema.optional(Schema.String),
}) {}

class RenderError extends Schema.TaggedError<RenderError>()("RenderError", {
  message: Schema.String,
  cause: Schema.optional(Schema.String),
}) {}

const run = Effect.tryPromise({
  try: async () =>
    createCliRenderer({
      exitOnCtrlC: false,
      useKittyKeyboard: {},
    }),
  catch: (error) =>
    new RendererInitError({
      message: "Failed to create CLI renderer",
      cause: typeof error === "string" ? error : undefined,
    }),
}).pipe(
  Effect.andThen((renderer) =>
    Effect.try({
      try: () => {
        createRoot(renderer).render(
          <ExitProvider>
            <ToastProvider>
              <RootBox>
                <ThemeProvider>
                  <App />
                  <Toast />
                </ThemeProvider>
              </RootBox>
            </ToastProvider>
          </ExitProvider>,
        )
      },
      catch: (error) =>
        new RenderError({
          message: "Failed to render TUI application",
          cause: typeof error === "string" ? error : undefined,
        }),
    }),
  ),
  Effect.provide(BunContext.layer),
)

run.pipe(BunRuntime.runMain)
