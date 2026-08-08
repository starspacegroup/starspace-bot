import log, { lerror } from "./lib/logger"
import * as dotenv from "dotenv"
dotenv.config()
const botToken = process.env.DISCORD_BOT_TOKEN
const mongoDb = process.env.MONGO_DB

import mongoClient, {
  getNumberSetting,
  getEnabledStatus,
} from "./connections/mongoDb"
import VoiceChannelEvent from "./models/voiceChannelEvent"
import { Client, GatewayIntentBits, Guild, GuildMember } from "discord.js"
import { ChangeStreamInsertDocument } from "mongodb"
import { dispatchVoiceChannelEvent } from "./voice-event-dispatcher"

const database = mongoClient.db(mongoDb)
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
    >([{ $match: { operationType: "insert" } }], {
      fullDocument: "updateLookup",
    })

    changeStream.on("change", async (change) => {
      try {
        await dispatchVoiceChannelEvent(change.fullDocument, discordClient, {
          isEnabled: (guildId) =>
            getNumberSetting("enabledOnServer", guildId),
          mute: serverMuteMember,
          unmute: serverUnmuteMember,
          disabled: (guild) =>
            log(`${guild.name}: Camera requirement not enabled on server.`),
        })
      } catch (e) {
        lerror(e)
      }
    })
  },
}

export const serverMuteMember = async (guild: Guild, member: GuildMember) => {
  const enabledStatus = await getEnabledStatus(guild.id)
  const botUser = discordClient?.user?.id
  if (!member.voice) return
  if (!botUser) return
  const botGuildMember = await member.voice.channel?.guild.members.fetch(
    botUser
  )
  if (!botGuildMember) return

  const myMember = await guild.members.fetch({
    user: member.user.id,
    force: true,
  })

  if (
    !member.voice.channel?.permissionsFor(botGuildMember)?.has("MuteMembers")
  ) {
    log(`${guild.name}: I don't have permissions in this VC.`)
    await member.edit({ mute: false }).catch((e) => {
      lerror(e)
    })
    log(
      `${guild.name}: Unmuted ${member.user.username} in ${member.voice.channel?.name}. JOINED A CHANNEL I DON'T HAVE PERMISSIONS IN.`
    )
    return
  }
  if (!enabledStatus) {
    await member.edit({ mute: false }).catch((e) => {
      lerror(e)
    })
    log(`${guild.name}: Unmuted ${member.user.username} since bot is disabled.`)
    return
  }

  await member.edit({ mute: true }).catch((e) => {
    lerror(e)
  })
  log(`${guild.name}: Muted ${member.user.username}`)
}
export const serverUnmuteMember = async (guild: Guild, member: GuildMember) => {
  if (!member.voice) return
  await member.edit({ mute: false }).catch((e) => {
    lerror(e)
  })
  setTimeout(async () => {
    if (member.voice.selfVideo) {
      await member.edit({ mute: false }).catch((e) => {
        lerror(e)
      })
    }
    // log("Second try for good measure")
  }, 1500)
  log(`${guild.name}: Unmuted ${member.user.username}`)
}
