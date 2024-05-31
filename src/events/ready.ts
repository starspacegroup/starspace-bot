import { Client } from "discord.js"
import log from "../lib/logger"

export function readyEvent(client: Client) {
  log(`Ready! Logged in as ${client.user?.tag}`)
  log(`Connected to ${client.guilds.cache.size} guilds.`)

  client.guilds.cache.forEach(async (guild) => {
    log(`[${guild.name}] (${guild.id})`)
  })
}
