import log, { lerror } from "./lib/logger"
import * as dotenv from "dotenv"
dotenv.config()
const botToken = process.env.DISCORD_BOT_TOKEN

import mongoClient, {
  getMutedRole,
  getNumberSetting,
  getEnabledStatus,
} from "./connections/mongoDb"
import VoiceChannelEvent from "./models/voiceChannelEvent"
import { Client, GatewayIntentBits, Guild, GuildMember } from "discord.js"
import { ChangeStreamInsertDocument } from "mongodb"

const database = mongoClient.db("camera_on")
const discordClient = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates],
})
discordClient.login(botToken)

export const botScheduler = {
  async run() {
    const voiceChannelEvents =
      database.collection<VoiceChannelEvent>("voiceChannelEvent")

    const changeStream = voiceChannelEvents.watch<
      VoiceChannelEvent,
      ChangeStreamInsertDocument<VoiceChannelEvent>
    >([{ $match: {} }], {
      fullDocument: "updateLookup",
    })

    changeStream.on("change", async (change) => {
      const channelId = change.fullDocument.channelId
      const memberId = change.fullDocument.memberId
      const botUser = discordClient?.user?.id
      const channel = discordClient.channels.cache.get(channelId)
      const guild = discordClient.guilds.cache.get(change.fullDocument.guildId)
      const member = await guild?.members.fetch(memberId)
      const action = change.fullDocument.action

      if (member && channel?.isVoiceBased() && botUser && guild) {
        const enabledOnServer = await getNumberSetting(
          "enabledOnServer",
          guild.id
        )
        if (!enabledOnServer) {
          log(`${guild.name}: Bot is not enabled on server.`)
          return
        }
        switch (action) {
          case "join":
          case "cameraOff":
            await serverMuteMember(guild, member)
            break
          case "leave":
            // await serverUnmuteMember(guild, member)
            break
          case "cameraOn":
            await serverUnmuteMember(guild, member)
            break
        }
      }
    })
  },
}

export const serverMuteMember = async (guild: Guild, member: GuildMember) => {
  const mutedByAdhereRole = await getMutedRole(guild.id)
  const enabledStatus = await getEnabledStatus(guild.id)
  const botUser = discordClient?.user?.id
  if (!member.voice) return
  if (!botUser) return
  const botGuildMember = await member.voice.channel?.guild.members.fetch(
    botUser
  )
  if (!botGuildMember) return

  if (!mutedByAdhereRole) {
    lerror(`${guild.name}: Couldn't find mutedByAdhereRole.`)
    return
  }
  const myMember = await guild.members.fetch({
    user: member.user.id,
    force: true,
  })
  const memberHasMutedRole = myMember.roles.cache.has(mutedByAdhereRole)

  if (
    !member.voice.channel?.permissionsFor(botGuildMember)?.has("SendMessages")
  ) {
    log(`${guild.name}: I don't have permissions in this VC.`)
    member.roles.remove(mutedByAdhereRole)
    member.edit({ mute: false })
    log(
      `${guild.name}: Unmuted ${member.user.username} in ${member.voice.channel?.name}. JOINED A CHANNEL I DON'T HAVE PERMISSIONS IN.`
    )
    return
  }
  try {
    if (!enabledStatus && memberHasMutedRole) {
      member.roles.remove(mutedByAdhereRole)
      member.edit({ mute: false })
      log(
        `${guild.name}: Unmuted ${member.user.username} since bot is disabled.`
      )
      return
    }

    // member.roles.add(mutedByAdhereRole)
    member.edit({ mute: true })
    log(`${guild.name}: Muted ${member.user.username}`)
  } catch (e) {
    lerror(e)
  }
}
const serverUnmuteMember = async (guild: Guild, member: GuildMember) => {
  if (!member.voice) return
  const mutedByAdhereRole = await getMutedRole(guild.id)
  if (!mutedByAdhereRole) {
    lerror(`${guild.name}: Couldn't find mutedByAdhereRole.`)
    return
  }
  try {
    member.edit({ mute: false })
    member.roles.remove(mutedByAdhereRole)
    setTimeout(() => {
      if (member.voice.selfVideo) {
        member.edit({ mute: false })
        member.roles.remove(mutedByAdhereRole)
      }
      // log("Second try for good measure")
    }, 1500)
    log(`${guild.name}: Unmuted ${member.user.username}`)
  } catch (e) {
    lerror(e)
  }
}
