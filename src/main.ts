import * as dotenv from "dotenv"
dotenv.config()
import { Client, Events, GatewayIntentBits } from "discord.js"

import { guildMemberAddEvent, updateInvitesData } from "./events/guildJoin"
import { readyEvent } from "./events/ready"
import { voiceStateEvent } from "./events/voiceState"

import { botScheduler } from "./bot-dispatcher"
import { activeCommands } from "./commands/activeCommands"
botScheduler.run()

const commands = activeCommands

const botToken = process.env.DISCORD_BOT_TOKEN
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMembers,
  ],
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
