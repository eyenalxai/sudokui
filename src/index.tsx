import { BunContext, BunRuntime } from "@effect/platform-bun"
import { createCliRenderer } from "@opentui/core"
import { createRoot } from "@opentui/react"
import { Effect } from "effect"

import { App } from "./tui/components/app"
import { RootBox } from "./tui/components/root-box"
import { Toast } from "./tui/components/toast-notification"
import { ExitProvider } from "./tui/providers/exit"
import { ThemeProvider } from "./tui/providers/theme"
import { ToastProvider } from "./tui/providers/toast"

const run = Effect.tryPromise({
  try: async () =>
    createCliRenderer({
      exitOnCtrlC: false,
      useKittyKeyboard: {},
    }),
  catch: (error) => new Error(typeof error === "string" ? error : "Failed to create CLI renderer"),
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
        new Error(typeof error === "string" ? error : "Failed to render TUI application"),
    }),
  ),
  Effect.provide(BunContext.layer),
)

run.pipe(BunRuntime.runMain)
