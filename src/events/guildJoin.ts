import { Client, GuildMember, Invite } from "discord.js"
import {
  getInvitesData,
  incrementInvite,
  setInvitesData,
} from "../connections/mongoDb"
import log from "../lib/logger"

export async function guildMemberAddEvent(member: GuildMember) {
  const guild = member.guild
  let inviteCodeUsed: string | undefined = undefined

  // Fetch all previous invites for the guild
  const storedInviteData = await getInvitesData(guild.id)

  if (storedInviteData) {
    storedInviteData.invites["invites"].forEach(async (storedInvite) => {
      const discordInvite = await guild.invites
        .fetch(storedInvite.code)
        .then((discordInvite) => {
          const newInviteCount = discordInvite.uses ? discordInvite.uses : 0
          if (storedInvite.count > discordInvite) {
            // Invite code was used
            inviteCodeUsed = discordInvite.code
            console.log(
              `${member.user.tag} joined using invite code: ${discordInvite.code}`
            )
          }
        })
        .catch((error) => {
          log(`[${guild.name}] guildMemberAddEvent ${error}`)
          return []
        })
    })
  }

  if (inviteCodeUsed) {
    incrementInvite(guild.id, inviteCodeUsed)
  }
}

export function updateInvitesData(client: Client) {
  client.guilds.cache.forEach(async (guild) => {
    log(`[${guild.name}] Updating invites...`)
    const discordInvites = await guild.invites.fetch().catch((error) => {
      log(`[${guild.name}] updateInvitesData ${error}`)
      return []
    })
    const inviteData = {}
    discordInvites.forEach((invite: Invite) => {
      inviteData[invite.code] = invite.uses?.toString() || "0"
    })
    if (inviteData) {
      setInvitesData(guild.id, inviteData)
    }
  })
}
