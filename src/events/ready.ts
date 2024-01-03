import { Colors, PermissionFlagsBits } from "discord.js"
import log, { lerror } from "../lib/logger"
import { getMutedRole, setMutedRole } from "../connections/mongoDb"

export function readyEvent(client) {
  log(`Ready! Logged in as ${client.user?.tag}`)
  log(`Connected to ${client.guilds.cache.size} guilds.`)

  client.guilds.cache.forEach(async (guild) => {
    const mutedRoleId = await getMutedRole(guild.id)
    const mutedRole = await guild.roles.cache.get(mutedRoleId)
    if (!mutedRoleId || !mutedRole) {
      const createdUserRole = await guild.roles
        .create({
          name: "Muted by Adhere",
          color: Colors.Red,
          reason: "For Adhere bot to mute members.",
        })
        .then(async (role) => {
          await setMutedRole(guild.id, role.id)
          log(`Created muted role for ${guild.name} (${guild.id})`)
          return role
        })
        .catch((error) => {
          lerror(`Couldn't create role: ${error}`)
        })
    }
    log(`Connected to ${guild.name} (${guild.id})`)
  })
}
