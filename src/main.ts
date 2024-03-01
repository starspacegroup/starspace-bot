import { Client, Events, GatewayIntentBits } from "discord.js"
import * as dotenv from "dotenv"
dotenv.config()
import { readyEvent } from "./events/ready"

import { voiceStateEvent } from "./events/voiceState"

import { enable } from "./commands/utility/enable"
import { disable } from "./commands/utility/disable"
import { insult } from "./commands/text/insult"
import { affirmation } from "./commands/text/affirmation"

import { botScheduler } from "./bot-dispatcher"
botScheduler.run()

const botToken = process.env.DISCORD_BOT_TOKEN
const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates],
})

client.on("ready", readyEvent)
client.on("voiceStateUpdate", voiceStateEvent)

const commands = {
  enable,
  disable,
  insult,
  affirmation,
}

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return
  if (!Object.keys(commands).includes(interaction.commandName)) {
    return
  }
  const command =
    commands[interaction.commandName as unknown as keyof typeof commands]
  try {
    await command.execute(interaction)
  } catch {}
})

client.login(botToken)
