import { Client } from "discord.js"
import log from "../lib/logger"
import { setInvitesData } from "../connections/mongoDb"

export function readyEvent(client: Client) {
  log(`Ready! Logged in as ${client.user?.tag}`)
  log(`Connected to ${client.guilds.cache.size} guilds.`)

  client.guilds.cache.forEach(async (guild) => {
    log(`Connected to ${guild.name} (${guild.id})`)
  })
}

export function updateInvitesData(client: Client) {
  client.guilds.cache.forEach(async (guild) => {
    log(`[${guild.name}] Updating invites...`)
    const invites = await guild.invites.fetch()
    const inviteData = {}
    invites.forEach((invite) => {
      inviteData[invite.code] = invite.uses?.toString() || "0"
    })
    if (inviteData) {
      setInvitesData(guild.id, inviteData)
    }
  }
}
