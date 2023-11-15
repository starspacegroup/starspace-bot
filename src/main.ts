import { Client, Events, GatewayIntentBits } from "discord.js"
import * as dotenv from "dotenv"
dotenv.config()
import { voiceStateEvent } from "./events/voiceState"
import { setwarntime } from "./commands/utility/setWarnTime"
import { setkicktime } from "./commands/utility/setKickTime"
import { settimeout } from "./commands/utility/setTimeout"
import { settimeoutminutes } from "./commands/utility/setTimeoutMinutes"
import { insult } from "./commands/text/insult"
import { botScheduler } from "./bot-dispatcher"

botScheduler.run()

const botToken = process.env.DISCORD_BOT_TOKEN

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates],
})

client.on("voiceStateUpdate", voiceStateEvent)

const commands = {
  setwarntime,
  setkicktime,
  settimeout,
  settimeoutminutes,
  insult,
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
