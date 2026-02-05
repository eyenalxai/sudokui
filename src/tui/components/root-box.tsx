import { useKeyboard } from "@opentui/react"
import type { ReactNode } from "react"

import { useExit } from "../providers/exit"

type RootBoxProps = {
  readonly children: ReactNode
}

export const RootBox = ({ children }: RootBoxProps) => {
  const exit = useExit()

  useKeyboard((event) => {
    if (event.ctrl && event.name === "c") {
      event.preventDefault()
      event.stopPropagation()
      exit()
    }
  })

  return (
    <box margin={0} padding={0}>
      {children}
    </box>
  )
}
