import * as dotenv from "dotenv"
dotenv.config()

import log, { lerror } from "./lib/logger"
import mongoClient, { getNumberSetting } from "./connections/mongoDb"
import VoiceChannelEvent, {
  VoiceChannelAction,
} from "./models/voiceChannelEvent"
import { CommandReasonType } from "./models/commandReasonTypes"

import {
  Client,
  User,
  GatewayIntentBits,
  VoiceBasedChannel,
  PermissionsBitField,
  Guild,
  GuildMember,
} from "discord.js"
import { createAudioPlayer } from "@discordjs/voice"
import { Agenda } from "@hokify/agenda"
import {
  createAudioResource,
  joinVoiceChannel,
  VoiceConnection,
} from "@discordjs/voice"
import { ChangeStreamInsertDocument } from "mongodb"
import { createReadStream } from "fs"
import { join } from "path"
import { NumberSettingType } from "./models/numberSetting"
let voiceConnection: VoiceConnection | null
const botToken = process.env.DISCORD_BOT_TOKEN

const database = mongoClient.db("camera_on")
const mongoUser = process.env.MONGO_USER
const mongoPass = process.env.MONGO_PASS
const mongoDb = process.env.MONGO_DB
const mongoUrl = process.env.MONGO_URL
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

agenda.define("warn member", async (job) => {
  const guild = discordClient.guilds.cache.get(job.attrs.data.guildId)
  const channel = await discordClient.channels.fetch(job.attrs.data.channelId)
  const member = guild?.members.cache.get(job.attrs.data.memberId)
  const voiceChannel = channel?.isVoiceBased() ? channel : null
  if (!member || !voiceChannel || !guild) {
    const message = `Couldn't find either guild (${guild}), voiceChannel (${voiceChannel}), and/or member (${member}).`
    job.fail(`${message}`)
    lerror(`${message}`)
    return
  }
  try {
    await botDoWarning(
      guild,
      voiceChannel,
      member,
      job.attrs.data.desiredAction
    )
  } catch (error) {
    job.fail(`${error}`)
    lerror(`${error}`)
  }
})

agenda.define("disconnect member", async (job) => {
  const guild = discordClient.guilds.cache.get(job.attrs.data.guildId)
  const channel = await discordClient.channels.fetch(job.attrs.data.channelId)
  const member = guild?.members.cache.get(job.attrs.data.memberId)
  const voiceChannel = channel?.isVoiceBased() ? channel : null
  if (!guild || !voiceChannel || !member) return
  await disconnectMember(
    guild,
    voiceChannel,
    member,
    job.attrs.data.desiredAction
  )
})

export const botScheduler = {
  async run() {
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
        const botGuildMember = await channel?.guild.members.fetch(botUser)
        if (
          !channel
            .permissionsFor(botGuildMember)
            .has(PermissionsBitField.Flags.Connect) ||
          !channel
            .permissionsFor(botGuildMember)
            .has(PermissionsBitField.Flags.SendMessages)
        ) {
          // ignore channels the bot can't join or send messages in
          return
        }
        switch (action) {
          case "join":
          case "cameraOff":
            triggerWarning(guild, channel, member, action)
            break
          case "screenShared":
            triggerWarning(guild, channel, member, action)
            break
          case "leave":
            crisisAverted(guild, channel, member, "leave voice channel")
            break
          case "cameraOn":
            crisisAverted(guild, channel, member, "turn on camera")
            break
          case "screenUnshared":
            crisisAverted(guild, channel, member, "turn off screen share")
            break
        }
      }
    })
  },
}
const triggerWarning = async (
  guild: Guild,
  channel: VoiceBasedChannel,
  member: GuildMember,
  action: VoiceChannelAction
) => {
  let desiredAction: string
  let numberSetting: NumberSettingType
  switch (action) {
    case "join":
    case "cameraOff":
      desiredAction = `turn on camera`
      numberSetting = "botJoinSecondsCamera"
      break
    case "screenShared":
      desiredAction = `stop screen sharing`
      numberSetting = "botJoinSecondsScreenshare"
      break
    default:
      desiredAction = `turn on camera`
      numberSetting = "botJoinSecondsCamera"
      break
  }
  const botJoinSeconds = await getNumberSetting(numberSetting, guild.id)
  log(
    `Waiting ${botJoinSeconds} seconds for ${member.user.tag} to ${desiredAction}.`
  )

  scheduleJob(
    "warn member",
    botJoinSeconds,
    guild,
    channel,
    member,
    desiredAction
  )
}
const crisisAverted = async (
  guild: Guild,
  voiceChannel: VoiceBasedChannel,
  member: GuildMember,
  desiredAction: string
) => {
  log(
    `User ${member.user.tag} did ${desiredAction}, cancelling any pending warnings/kicks.`
  )
  await cancelJobs(guild, voiceChannel, member, desiredAction)
  if (voiceConnection) {
    voiceConnection.disconnect()
    voiceConnection = null
  }
}

const botDoWarning = async (
  guild: Guild,
  voiceChannel: VoiceBasedChannel,
  member: GuildMember,
  desiredAction: string
) => {
  log("Doing bot warning.")
  let numberSettingKickSeconds: NumberSettingType
  let reason: CommandReasonType
  switch (desiredAction) {
    case "turn on camera":
      numberSettingKickSeconds = "userDisconnectSecondsCamera"
      reason = "Camera"
      break
    case "stop screen sharing":
      numberSettingKickSeconds = "userDisconnectSecondsScreenshare"
      reason = "Screenshare"
      break
    default:
      numberSettingKickSeconds = "userDisconnectSecondsCamera"
      reason = "Camera"
      break
  }

  const kickSeconds = await getNumberSetting(numberSettingKickSeconds, guild.id)

  let audioFile = ""
  switch (desiredAction) {
    case "turn on camera":
      audioFile = join(__dirname, "../camera_warning.mp3")
      break
    case "stop screen sharing":
      audioFile = join(__dirname, "../screenshare_warning.mp3")
      break
    default:
      audioFile = join(__dirname, "../camera_warning.mp3")
      break
  }
  const guildMember = await guild.members.fetch(member.id)
  if (voiceConnection) {
    await cancelJobs(guild, voiceChannel, member, desiredAction)
    scheduleJob("warn member", 5, guild, voiceChannel, member, desiredAction)
    log(
      `Scheduled retry to join on ${member.user.tag} in voice channel: ${voiceChannel.name}.`
    )
    return
  }
  if (
    guildMember.voice.channel == null ||
    (guildMember.voice.selfVideo && !guildMember.voice.streaming)
  ) {
    // don't run when the user isn't in a voice channel or has cam on and is not screen sharing
    return
  }
  const user = await discordClient.users.fetch(member)

  const player = createAudioPlayer()
  let resource = createAudioResource(createReadStream(audioFile))
  if (resource.volume) {
    resource.volume.setVolume(0.5)
  }

  voiceChannel.send(
    `Hey ${user}, ${desiredAction}. I'm going to disconnect you in ${kickSeconds} seconds.`
  )
  voiceConnection = joinVoiceChannel({
    guildId: voiceChannel.guild.id,
    channelId: voiceChannel.id,
    adapterCreator: voiceChannel.guild.voiceAdapterCreator,
  })
  player.play(resource)
  voiceConnection.subscribe(player)
  log(
    `Disconnecting ${member.user.tag} in ${voiceChannel.name} in ${kickSeconds} seconds. Reason: ${reason}.`
  )
  scheduleJob(
    "disconnect member",
    kickSeconds,
    guild,
    voiceChannel,
    member,
    desiredAction
  )
}

const disconnectMember = async (
  guild: Guild,
  voiceChannel: VoiceBasedChannel,
  member: GuildMember,
  reason: VoiceChannelAction
) => {
  if (!guild || !voiceChannel || !member) {
    lerror(
      `Couldn't find either guild (${guild}), voiceChannel (${voiceChannel}), and/or member (${member}).`
    )
    return
  }
  const guildMember = await guild.members.fetch(member.id)
  if (
    guildMember.voice.channel != null &&
    guildMember.voice.selfVideo &&
    !guildMember.voice.streaming
  ) {
    log(
      `Skipping disconnect of ${member.user.tag} because they're not in ${voiceChannel.name} or they turned on their camera / stopped screen share.`
    )
    return
  }
  try {
    voiceChannel.send(`Disconnected ${member}: ${reason}.`)

    const guildMember = await voiceChannel.guild.members.fetch(member.id)

    if (guildMember) {
      guildMember.voice.disconnect(`${reason}`)
      guildMember.client.voice.client.destroy
    }
    log(
      `User ${member.user.tag} disconnected from ${voiceChannel.name}. Reason: ${reason}.`
    )
  } catch (error) {
    log(error)
  }
}

const cancelJobs = async (
  guild: Guild,
  channel: VoiceBasedChannel,
  member: GuildMember,
  desiredAction: string
) => {
  const numJobsRemoved = await agenda.cancel({
    name: "warn member",
    "data.guildId": guild.id,
    "data.channelId": channel.id,
    "data.memberId": member.id,
    "data.desiredAction": desiredAction,
  })
  log(
    `Removed ${numJobsRemoved} jobs for ${member.user.tag} in ${channel.name}.`
  )
}

interface JobAttributes {
  name: string
  memberId: string
  channelId: string
  guildId: string
  desiredAction: string
}

async function scheduleJob(
  name: string,
  delayInSeconds: number,
  guild: Guild,
  channel: VoiceBasedChannel,
  member: GuildMember,
  desiredAction: string
) {
  const jobAttributes: JobAttributes = {
    name: name,
    memberId: member.id,
    channelId: channel.id,
    guildId: guild.id,
    desiredAction: desiredAction,
  }
  const job = agenda.create(name, jobAttributes)
  job.schedule(`in ${delayInSeconds} seconds`)
  await job.save()
  return job.attrs._id
}
