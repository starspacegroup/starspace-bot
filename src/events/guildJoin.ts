import { GuildMember } from "discord.js"
import { getInvitesData, incrementInvite } from "../connections/mongoDb"
import { GuildInviteData } from "../models/inviteData"

export async function guildMemberAdd(member: GuildMember) {
  const guild = member.guild
  let inviteCodeUsed: string | undefined = undefined

  // Fetch all previous invites for the guild
  const storedInviteData: Array<GuildInviteData> = await getInvitesData(
    guild.id
  )

  if (storedInviteData) {
    storedInviteData.forEach((invite) => {
      const discordInvite = guild.invites.cache.get(invite.code)
      const newInviteCount = discordInvite?.uses ? discordInvite.uses : 0
      if (newInviteCount > invite.uses) {
        // Invite code was used
        inviteCodeUsed = invite.code
        console.log(
          `${member.user.tag} joined using invite code: ${invite.code}`
        )
      }
    })
  }

  if (inviteCodeUsed) {
    incrementInvite(guild.id, inviteCodeUsed)
  }
}
