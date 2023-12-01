import { REST, Routes } from "discord.js"
import * as dotenv from "dotenv"
dotenv.config()
import { setwarntime } from "./commands/utility/setWarnTime"
import { setkicktime } from "./commands/utility/setKickTime"
import { settimeout } from "./commands/utility/setTimeout"
import { settimeoutminutes } from "./commands/utility/setTimeoutMinutes"
import { insult } from "./commands/text/insult"
import log from "./lib/logger"

const clientId = process.env.DISCORD_APP_ID
const guildId = process.env.DISCORD_GUILD_ID
const guildId2 = process.env.DISCORD_GUILD_ID_2
const token = process.env.DISCORD_BOT_TOKEN

const commands = [
  setwarntime,
  setkicktime,
  settimeout,
  settimeoutminutes,
  insult,
].map((command) => command.command.toJSON())

// @ts-ignore
const rest = new REST().setToken(token)

;(async () => {
  // Guild 1
  try {
    log(`Started refreshing ${commands.length} application (/) commands.`)

    const data = await rest.put(
      // @ts-ignore
      Routes.applicationGuildCommands(clientId, guildId),
      { body: commands }
    )

    log(
      // @ts-ignore
      `Successfully reloaded ${data.length} application (/) commands.`
    )
  } catch (error) {
    console.error(error)
  }
  // Guild 2
  try {
    log(`Started refreshing ${commands.length} application (/) commands.`)

    const data = await rest.put(
      // @ts-ignore
      Routes.applicationGuildCommands(clientId, guildId2),
      { body: commands }
    )

    log(
      // @ts-ignore
      `Successfully reloaded ${data.length} application (/) commands.`
    )
  } catch (error) {
    console.error(error)
  }
})()
