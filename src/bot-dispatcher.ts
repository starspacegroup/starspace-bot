import log, { lerror } from "./lib/logger"
import * as dotenv from "dotenv"
dotenv.config()
const botToken = process.env.DISCORD_BOT_TOKEN
const mongoUser = process.env.MONGO_USER
const mongoPass = process.env.MONGO_PASS
const mongoDb = process.env.MONGO_DB
const mongoUrl = process.env.MONGO_URL

import { Agenda } from "@hokify/agenda"

import mongoClient, {
  getMutedRole,
  getNumberSetting,
  getEnabledStatus,
} from "./connections/mongoDb"
import VoiceChannelEvent from "./models/voiceChannelEvent"
import {
  Client,
  GatewayIntentBits,
  VoiceBasedChannel,
  Guild,
  GuildMember,
} from "discord.js"
import { ChangeStreamInsertDocument } from "mongodb"
import { NumberSettingType } from "./models/numberSetting"
let currentMemberBeingWarned = []

const database = mongoClient.db("camera_on")
const agenda = new Agenda({
  db: {
    address: `mongodb+srv://${mongoUser}:${mongoPass}@${mongoUrl}/${mongoDb}?retryWrites=true&w=majority`,
  },
  processEvery: "15ms",
})
const discordClient = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates],
})
discordClient.login(botToken)

type DesiredAction = "turn on camera" | "stop screen sharing" | "leave"

const createAgendaJobs = async () => {
  agenda.define("disconnect member", async (job) => {
    const guild = discordClient.guilds.cache.get(job.attrs.data.guildId)
    const channel = await discordClient.channels.fetch(job.attrs.data.channelId)
    const member = guild?.members.cache.get(job.attrs.data.memberId)
    const voiceChannel = channel?.isVoiceBased() ? channel : null
    if (!guild || !voiceChannel || !member) return
    try {
      disconnectMember(guild, voiceChannel, member)
    } catch (e) {
      lerror(e)
    }
  })
}

class MyEvent {
  should_handle!: boolean
  desired_action!: string
}

export const botScheduler = {
  async run() {
    await createAgendaJobs()
    await agenda.start()
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
        // const botGuildMember = await channel?.guild.members.fetch(botUser)
        // if (
        //   !channel
        //     .permissionsFor(botGuildMember)
        //     .has(PermissionsBitField.Flags.Connect) ||
        //   !channel
        //     .permissionsFor(botGuildMember)
        //     .has(PermissionsBitField.Flags.SendMessages)
        // ) {
        //   // ignore channels the bot can't join or send messages in
        //   return
        // }
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
    if (member.roles.cache.has(mutedByAdhereRole)) {
      member.roles.remove(mutedByAdhereRole)
      member.edit({ mute: false })
      log(
        `${guild.name}: Unmuted ${member} in ${member.voice.channel?.name}. JOINED A CHANNEL I DON'T HAVE PERMISSIONS IN.`
      )
    }
    return
  }
  try {
    if (!enabledStatus && memberHasMutedRole) {
      member.roles.remove(mutedByAdhereRole)
      member.edit({ mute: false })
      log(`${guild.name}: Unmuted ${member} since bot is disabled.`)
    }

    member.roles.add(mutedByAdhereRole)
    member.edit({ mute: true })
    log(`${guild.name}: Muted ${member}`)
  } catch (e) {
    lerror(e)
  }
}
const serverUnmuteMember = async (guild: Guild, member: GuildMember) => {
  if (!member.voice) return
  if (!member.voice.serverMute) {
    log(
      `${guild.name}: ${member.user.tag} is not muted so I'm not going to unmute them.`
    )
    return
  }
  const mutedByAdhereRole = await getMutedRole(guild.id)
  if (!mutedByAdhereRole) {
    lerror(`${guild.name}: Couldn't find mutedByAdhereRole.`)
    return
  }
  try {
    const myMember = await guild.members.fetch({
      user: member.user.id,
      force: true,
    })
    const memberHasMutedRole = myMember.roles.cache.has(mutedByAdhereRole)
    if (memberHasMutedRole) {
      member.edit({ mute: false })
      member.roles.remove(mutedByAdhereRole)
      log(`${guild.name}: Unmuted ${member}`)
    } else {
      log(
        `${guild.name}: ${member.user.tag} was not muted by me, not un-muting.`
      )
    }
  } catch (e) {
    lerror(e)
  }
}

const disconnectMember = (
  guild: Guild,
  voiceChannel: VoiceBasedChannel,
  member: GuildMember
) => {
  if (!guild || !voiceChannel || !member) {
    lerror(
      `Couldn't find either guild (${guild}), voiceChannel (${voiceChannel}), and/or member (${member}).`
    )
    if (currentMemberBeingWarned[guild.id] == member.id) {
      currentMemberBeingWarned[guild.id] = null
    }
    return
  }
  if (
    member.voice.channel?.id != voiceChannel.id ||
    (member.voice.selfVideo && !member.voice.streaming)
  ) {
    log(
      `Skipping disconnect of ${member.user.tag} in ${guild} because they're not in ${voiceChannel.name} or they have camera on and are not streaming.`
    )
    return
  }
  try {
    voiceChannel.send(`Disconnected ${member}`)

    member.voice.disconnect(`Camera off for too long.`)
    member.client.voice.client.destroy
    log(
      `User ${member.user.tag} disconnected from ${voiceChannel.name}. Reason: Camera off.`
    )
  } catch (error) {
    lerror(error)
  }
}

const cancelJob = async (
  name: string,
  guild: Guild,
  channel: VoiceBasedChannel,
  member: GuildMember
) => {
  const numJobsRemoved = await agenda
    .cancel({
      name: name,
      "data.guildId": guild.id,
      "data.channelId": channel.id,
      "data.memberId": member.id,
    })
    .catch((error) => {
      lerror(error)
    })
  agenda.jobs()
  log(
    `Removed ${numJobsRemoved} jobs for ${member.user.tag} in ${channel.name}.`
  )
}

interface JobAttributes {
  name: string
  memberId: string
  channelId: string
  guildId: string
  desiredAction: DesiredAction
}

function scheduleJob(
  name: string,
  delayInSeconds: number,
  guild: Guild,
  channel: VoiceBasedChannel,
  member: GuildMember,
  desiredAction: DesiredAction
) {
  log(
    `Scheduling job in ${guild.name} in ${channel.name} for ${member.user.tag} in ${delayInSeconds} seconds.`
  )
  const jobAttributes: JobAttributes = {
    name: name,
    memberId: member.id,
    channelId: channel.id,
    guildId: guild.id,
    desiredAction: desiredAction,
  }
  const job = agenda.create(name, jobAttributes)
  job.schedule(`in ${delayInSeconds} seconds`)
  job.save().catch((error) => {
    lerror(error)
  })
  return job.attrs._id
}
