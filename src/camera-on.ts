import {
  Client,
  Collection,
  VoiceChannel,
  TextChannel,
  User,
  Events,
  GatewayIntentBits,
  SlashCommandBuilder,
} from "discord.js"
import * as dotenv from "dotenv"
dotenv.config()
import fs from "node:fs"
import path from "node:path"
import { voiceStateEvent } from "./events/voiceState"
// import { readyStateEvent } from "./events/ready"
import { setjointime } from "./commands/utility/set-join-time"

const botToken = process.env.DISCORD_BOT_TOKEN

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates],
})

client.on("voiceStateUpdate", voiceStateEvent)

const commands = {
  setjointime,
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
