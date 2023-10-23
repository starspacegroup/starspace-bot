import * as dotenv from "dotenv"
dotenv.config()

import log from "./lib/logger"
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
} from "discord.js"
import { createAudioPlayer } from "@discordjs/voice"
import { Agenda, Job } from "@hokify/agenda"
import {
  createAudioResource,
  joinVoiceChannel,
  VoiceConnection,
} from "@discordjs/voice"
import { ChangeStreamInsertDocument } from "mongodb"
import { createReadStream } from "fs"
import { join } from "path"
import { warn } from "console"
import NumberSetting, { NumberSettingType } from "./models/numberSetting"
let voiceConnection: VoiceConnection | null
let warningJobs: Job[] = []
let kickJobs: Job[] = []
// var warningJobs: { [key: string]: Job }
// var kickJobs: { [key: string]: Job }
const botToken = process.env.DISCORD_BOT_TOKEN

const database = mongoClient.db("camera_on")
const mongoUser = process.env.MONGO_USER
const mongoPass = process.env.MONGO_PASS
const mongoDb = process.env.MONGO_DB
const agenda = new Agenda({
  db: {
    address: `mongodb+srv://${mongoUser}:${mongoPass}@cameraon.ihn5vri.mongodb.net/${mongoDb}?retryWrites=true&w=majority`,
  },
  processEvery: "15ms",
})
const discordClient = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates],
})
discordClient.login(botToken)

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
      const channelID = change.fullDocument.channelId
      const memberID = change.fullDocument.memberId
      const user = await discordClient.users.fetch(memberID)
      const botUser = discordClient?.user?.id
      const channel = discordClient.channels.cache.get(channelID)
      const action = change.fullDocument.action

      if (user && channel?.isVoiceBased() && botUser) {
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
            triggerWarning(user, channel, action)
            break
          case "screenShared":
            triggerWarning(user, channel, action)
            break
          case "leave":
            crisisAverted(user, `left ${channel.name}.`)
            break
          case "cameraOn":
            crisisAverted(user, "turned on camera")
            break
          case "screenUnshared":
            crisisAverted(user, "unshared screen")
            break
        }
      }
    })
  },
}
const triggerWarning = async (
  user: User,
  channel: VoiceBasedChannel,
  action: VoiceChannelAction
) => {
  let desiredAction: string
  let numberSetting: NumberSettingType
  switch (action) {
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
  const botJoinSeconds = await getNumberSetting(numberSetting)
  log(`Waiting ${botJoinSeconds} seconds for ${user.tag} to ${desiredAction}.`)
  warningJobs[`warn-${user.id}`] = agenda.define(
    `warn-${user.id}`,
    async (job) => {
      log(`Joining on ${user.tag} in voice channel: ${channel.name}.`)
      botDoWarning(channel, user, action)
    }
  )
  await agenda.schedule(`${botJoinSeconds}s`, `warn-${user.id}`)
}
const crisisAverted = async (user: User, action: string) => {
  log(`User ${user.tag} ${action}, cancelling any pending warnings/kicks.`)
  cancelJobs(user.id)
  if (voiceConnection) {
    voiceConnection.disconnect()
    voiceConnection = null
  }
}

const botDoWarning = async (
  channel: VoiceBasedChannel,
  member: User,
  action: VoiceChannelAction
) => {
  log("Doing bot warning.")
  let numberSettingKickSeconds: NumberSettingType
  let reason: CommandReasonType
  switch (action) {
    case "cameraOff":
      numberSettingKickSeconds = "userDisconnectSecondsCamera"
      reason = "Camera"
      break
    case "screenShared":
      numberSettingKickSeconds = "userDisconnectSecondsScreenshare"
      reason = "Screenshare"
      break
    default:
      numberSettingKickSeconds = "userDisconnectSecondsCamera"
      reason = "Camera"
      break
  }

  const kickSeconds = await getNumberSetting(numberSettingKickSeconds)

  let audioFile = ""
  let desiredAction: string
  switch (action) {
    case "cameraOff":
      desiredAction = "turn on camera"
      audioFile = join(__dirname, "../camera_warning.mp3")
      break
    case "screenShared":
      desiredAction = "stop screen sharing"
      audioFile = join(__dirname, "../screenshare_warning.mp3")
      break
    default:
      desiredAction = "turn on camera"
      audioFile = join(__dirname, "../camera_warning.mp3")
      break
  }
  const guildMember = await channel.guild.members.fetch(member.id)
  if (voiceConnection) {
    await agenda.schedule(`in 5 seconds`, `warn-${member.id}`)
    log(
      `Scheduled retry to join on ${member.tag} in voice channel: ${channel.name}.`
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

  channel.send(
    `Hey ${user}, ${desiredAction}. I'm going to disconnect you in ${kickSeconds} seconds.`
  )
  voiceConnection = joinVoiceChannel({
    channelId: channel.id,
    guildId: channel.guild.id,
    adapterCreator: channel.guild.voiceAdapterCreator,
  })
  player.play(resource)
  voiceConnection.subscribe(player)
  log(
    `Disconnecting ${member.tag} in ${channel.name} in ${kickSeconds} seconds. Reason: ${reason}.`
  )
  kickJobs[`kick-${member.id}`] = agenda.define(
    `kick-${member.id}`,
    async (job) => {
      log(`Disconnecting ${member.tag}. Reason: ${reason}.`)
      disconnectUser(user, channel, reason)
    }
  )
  await agenda.schedule(`${kickSeconds}s`, `kick-${member.id}`)
}

const disconnectUser = async (
  member: User,
  channel: VoiceBasedChannel,
  reason: CommandReasonType
) => {
  const guildMember = await channel.guild.members.fetch(member.id)
  if (
    guildMember.voice.channel != null &&
    guildMember.voice.selfVideo &&
    !guildMember.voice.streaming
  ) {
    log(
      `Skipping disconnect of ${member.tag} because they're not in ${channel.name} or they turned on their camera / stopped screen share.`
    )
    return
  }
  try {
    channel.send(`Disconnected ${member}: ${reason}.`)

    const guildMember = await channel.guild.members.fetch(member.id)

    if (guildMember) {
      guildMember.voice.disconnect(`${reason}`)
      guildMember.client.voice.client.destroy
    }
    log(
      `User ${member.tag} disconnected from ${channel.name}. Reason: ${reason}.`
    )
  } catch (error) {
    log(error)
  }
}

const cancelJobs = async (member: string) => {
  const warnJobTitle = `warn-${member}`
  const kickJobTitle = `kick-${member}`

  if (warnJobTitle in warningJobs) {
    delete warningJobs[warnJobTitle]
    const jobs = await agenda.jobs({ name: warnJobTitle })
    jobs.forEach((job) => job.disable())
    jobs.forEach((job) => job.save())
  }
  if (kickJobTitle in kickJobs) {
    delete kickJobs[kickJobTitle]
    const jobs = await agenda.jobs({ name: kickJobTitle })
    jobs.forEach((job) => job.disable())
    jobs.forEach((job) => job.save())
  }
}
