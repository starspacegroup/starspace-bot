import { affirmation } from "./text/affirmation"
import { insult } from "./text/insult"
import { say } from "./text/say"
import { whymuted } from "./text/whymuted"
import { disable } from "./utility/disable"
import { enable } from "./utility/enable"
import { setLogChannel } from "./utility/setLogChannel"

export const activeCommands = {
  enable,
  disable,
  whymuted,
  affirmation,
  insult,
  say,
  setLogChannel,
}

export const activeCommandsList = Object.values(activeCommands)
