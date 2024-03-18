import log, { lerror } from "../lib/logger"

export function readyEvent(client) {
  log(`Ready! Logged in as ${client.user?.tag}`)
  log(`Connected to ${client.guilds.cache.size} guilds.`)

  client.guilds.cache.forEach(async (guild) => {
    log(`Connected to ${guild.name} (${guild.id})`)
  })
}
