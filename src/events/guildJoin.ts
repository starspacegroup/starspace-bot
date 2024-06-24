import { Client, Guild, GuildMember, Invite, TextChannel } from "discord.js"
import {
  getInvitesData,
  getLogChannelSetting,
  incrementInvite,
  insertGuildJoinEvent,
  setInvitesData,
} from "../connections/mongoDb"
import log from "../lib/logger"
import { InviteData } from "../models/inviteData"

export async function guildMemberAddEvent(member: GuildMember) {
  setTimeout(async () => {
    const codeUsed = await inferInviteCodeUsed(member)
    await sendChannelMessage(
      member.guild,
      `[${member.guild.name}] ${member.user.username}#${member.user.discriminator} joined the server.`
    )
  }, 60 * 1000 * 9)
}

async function sendChannelMessage(guild: Guild, message: string) {
  await getLogChannelSetting(guild.id, "All")
    .then(async (setting) => {
      if (setting?.channelId) {
        const channel = guild.channels.cache.get(
          setting?.channelId
        ) as TextChannel
        await channel.send(message).catch((err) => {
          log(
            `[${guild.name}] Error sending message in ${channel.name}: ${err}`
          )
        })
      }
    })
    .catch((err) => {
      log(`[${guild.name}] Error getting log channel setting: ${err}`)
    })
}

async function inferInviteCodeUsed(member: GuildMember) {
  const guild = member.guild
  let inviteCodeUsed: string | undefined = undefined

  // Fetch all previous invites for the guild
  await getInvitesData(guild.id).then((data) => {
    log(`${guild.name} has ${data?.length || 0} stored invites.`)
    data.forEach(async (storedInvite) => {
      await guild.invites
        .fetch(storedInvite.code)
        .then((discordInvite: Invite) => {
          const newInviteCount = discordInvite.uses ? discordInvite.uses : 0
          const storedInviteCount = storedInvite.uses ? storedInvite.uses : 0
          log(
            `[${guild.name}] Invite code (${storedInvite.code}) Stored: ${storedInviteCount}, Discord: ${newInviteCount}.`
          )
          if (storedInviteCount < newInviteCount) {
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
  })

  if (inviteCodeUsed) {
    insertGuildJoinEvent(guild.id, member, inviteCodeUsed)
    incrementInvite(guild.id, inviteCodeUsed)
    log(
      `[${guild.name}] ${member.user.tag} joined server with invite: ${inviteCodeUsed}.`
    )
  } else {
    insertGuildJoinEvent(guild.id, member)
    log(
      `[${guild.name}] ${member.user.tag} joined server without detected invite.`
    )
  }
}

export function updateInvitesData(client: Client) {
  client.guilds.cache.forEach(async (guild) => {
    log(`[${guild.name}] Updating invites...`)

    const discordInvites = await guild.invites.fetch()
    const inviteData = discordInvites.map((invite) => ({
      code: invite.code ?? "",
      uses: invite.uses ?? 0,
      inviter: invite.inviter,
      expiresAt: invite.expiresAt,
    }))

    setInvitesData(guild.id, inviteData)

    // guild.invites.cache.forEach((invite: Invite) => {
    //   log(`[${guild.name}] ${invite.code} ${invite.uses}`)
    //   inviteData[invite.code] = {
    //     code: invite.code,
    //     uses: invite.uses,
    //     expires: invite.expiresAt,
    //     creator: invite.inviter,
    //   }
    // })
    // if (inviteData && Object.keys(inviteData).length > 0) {
    //   setInvitesData(guild.id, inviteData)
    // }

    // await guild.invites
    //   .fetch()
    //   .then((discordInvites) => {
    //     const inviteData = {}
    //     discordInvites?.forEach((invite: Invite) => {
    //       inviteData[invite.code] = invite.uses?.toString() || "0"
    //     })
    //     if (inviteData) {
    //       setInvitesData(guild.id, inviteData)
    //     }
    //   })
    //   .catch((error) => {
    //     log(`[${guild.name}] updateInvitesData ${error}`)
    //     return []
    //   })
  })
}
