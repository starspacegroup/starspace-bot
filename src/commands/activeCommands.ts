import { fortyTwo } from "./text/fortyTwo"
import { affirmation } from "./text/affirmation"
import { insult } from "./text/insult"
import { say } from "./text/say"
import { whymuted } from "./text/whymuted"
import { disable } from "./utility/disable"
import { enable } from "./utility/enable"
import { setlogchannel } from "./utility/setLogChannel"

export const activeCommands = {
  enable,
  disable,
  whymuted,
  affirmation,
  insult,
  say,
  setlogchannel,
  fortyTwo,
}

export const activeCommandsList = Object.values(activeCommands)
