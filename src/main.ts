import * as dotenv from "dotenv"
dotenv.config()
import { Client, Events, GatewayIntentBits } from "discord.js"

import { guildMemberAddEvent, updateInvitesData } from "./events/guildJoin"
import { readyEvent } from "./events/ready"
import { voiceStateEvent } from "./events/voiceState"

import { enable } from "./commands/utility/enable"
import { disable } from "./commands/utility/disable"
import { whymuted } from "./commands/text/whymuted"
import { affirmation } from "./commands/text/affirmation"
import { insult } from "./commands/text/insult"

const commands = {
  enable,
  disable,
  whymuted,
  affirmation,
  insult,
}

import { botScheduler } from "./bot-dispatcher"
botScheduler.run()

const botToken = process.env.DISCORD_BOT_TOKEN
const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates],
})

client.on("ready", readyEvent)
client.on("ready", updateInvitesData)

client.on("voiceStateUpdate", voiceStateEvent)
client.on("guildMemberAdd", guildMemberAddEvent)

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
