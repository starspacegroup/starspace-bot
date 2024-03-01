import { Colors, PermissionFlagsBits } from "discord.js"
import log, { lerror } from "../lib/logger"
import { getMutedRole, setMutedRole } from "../connections/mongoDb"

export function readyEvent(client) {
  log(`Ready! Logged in as ${client.user?.tag}`)
  log(`Connected to ${client.guilds.cache.size} guilds.`)

  client.guilds.cache.forEach(async (guild) => {
    const mutedRoleId = await getMutedRole(guild.id)
    const mutedRole = await guild.roles.cache.get(mutedRoleId)
    log(`Connected to ${guild.name} (${guild.id})`)
  })
}
