import { REST, Routes } from "discord.js"
import * as dotenv from "dotenv"
dotenv.config()
import log from "./lib/logger"
import { activeCommandsList } from "./commands/activeCommands"

const clientId = process.env.DISCORD_APP_ID
const guildId = process.env.DISCORD_GUILD_ID
const token = process.env.DISCORD_BOT_TOKEN

const commands = activeCommandsList.map((command) => command.command.toJSON())

// @ts-ignore
const rest = new REST().setToken(token)

;(async () => {
  // Guild 1
  // TODO: Add support for multiple guilds
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
})()
