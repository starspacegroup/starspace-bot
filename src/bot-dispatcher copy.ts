import log, { lerror } from "./lib/logger"
import * as dotenv from "dotenv"
dotenv.config()
const botToken = process.env.DISCORD_BOT_TOKEN
const mongoUser = process.env.MONGO_USER
const mongoPass = process.env.MONGO_PASS
const mongoDb = process.env.MONGO_DB
const mongoUrl = process.env.MONGO_URL

// import { Queue } from "bullmq"
// const mainQueue = new Queue("main-queue")
import { Agenda } from "@hokify/agenda"

import mongoClient, { getNumberSetting } from "./connections/mongoDb"
import VoiceChannelEvent, {
  VoiceChannelAction,
} from "./models/voiceChannelEvent"
import { CommandReasonType } from "./models/commandReasonTypes"
import {
  Client,
  GatewayIntentBits,
  VoiceBasedChannel,
  PermissionsBitField,
  Guild,
  GuildMember,
} from "discord.js"
import { createAudioPlayer } from "@discordjs/voice"
import { createAudioResource, joinVoiceChannel } from "@discordjs/voice"
import { ChangeStreamInsertDocument } from "mongodb"
import { createReadStream } from "fs"
import { join } from "path"
import { NumberSettingType } from "./models/numberSetting"
let voiceConnection = []
let currentMemberBeingWarned = []

const botName = process.env.BOT_NAME
const database = mongoClient.db(botName)
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

type DesiredAction =
  | "turn on camera"
  | "stop screen sharing"
  | "leaveVoiceChannel"

const createAgendaJobs = async () => {
  agenda.define("warn member", async (job) => {
    const guild = discordClient.guilds.cache.get(job.attrs.data.guildId)
    const channel = await discordClient.channels.fetch(job.attrs.data.channelId)
    const member = guild?.members.cache.get(job.attrs.data.memberId)
    const voiceChannel = channel?.isVoiceBased() ? channel : null
    if (!member || !voiceChannel || !guild) {
      const message = `Couldn't find either guild (${guild}), voiceChannel (${voiceChannel}), and/or member (${member}).`
      // job.fail(`${message}`)
      lerror(`${message}`)
      return
    }
    try {
      botDoWarning(guild, voiceChannel, member, job.attrs.data.desiredAction)
    } catch (error) {
      lerror(`${error}`)
    }
  })

  agenda.define("disconnect member", async (job) => {
    const guild = discordClient.guilds.cache.get(job.attrs.data.guildId)
    const channel = await discordClient.channels.fetch(job.attrs.data.channelId)
    const member = guild?.members.cache.get(job.attrs.data.memberId)
    const voiceChannel = channel?.isVoiceBased() ? channel : null
    if (!guild || !voiceChannel || !member) return
    try {
      disconnectMember(
        guild,
        voiceChannel,
        member,
        job.attrs.data.desiredAction
      )
    } catch (e) {
      lerror(e)
    }
  })
}

class MyEvent {
  should_handle!: boolean
  desired_action!: string
}

export const to_my_event = (
  change: ChangeStreamInsertDocument<VoiceChannelEvent>
) => {
  let myEvent = new MyEvent()
  switch (change.fullDocument.action) {
    case "joinVoiceChannel":
    case "cameraOff":
    case "cameraOn":
    case "leaveVoiceChannel":
      myEvent.should_handle = true
      myEvent.desired_action = change.fullDocument.action
      break
    default:
      myEvent.should_handle = false
      break
  }
  return myEvent
}

export const handle_event = (myEvent: MyEvent) => {
  if (myEvent.should_handle) {
    log(myEvent)
  }
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
      let myEvent: MyEvent = to_my_event(change)
      if (myEvent.should_handle) {
        handle_event(myEvent)
      }
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
          case "joinVoiceChannel":
          case "cameraOff":
            await triggerWarning(guild, channel, member, action)
            break
          case "screenShared":
            await triggerWarning(guild, channel, member, action)
            break
          case "leaveVoiceChannel":
            await crisisAverted(guild, channel, member, "leaveVoiceChannel")
            break
          case "cameraOn":
            await crisisAverted(guild, channel, member, "turn on camera")
            break
          case "screenUnshared":
            await crisisAverted(guild, channel, member, "stop screen sharing")
            break
        }
      }
    })
  },
}

export const doTriggerWarning = async (
  action: "join" | "cameraOff" | "screenShared",
  botJoinSeconds: number,
  memberId: string
) => {
  let stuff = {
    join: { message: "turn on camera", setting: "botJoinSecondsCamera" },
    cameraOff: { message: "turn on camera", setting: "botJoinSecondsCamera" },
    screenShared: {
      message: "stop screen sharing",
      setting: "botJoinSecondsScreenshare",
    },
  }
  let { message, setting } = stuff[action]
  console.log(`${botJoinSeconds} second for ${memberId} to ${message}`)
  agenda.schedule("warn member", `in ${botJoinSeconds} seconds`, {
    action,
    memberId,
  })
}

export const triggerWarning = async (
  guild: Guild,
  channel: VoiceBasedChannel,
  member: GuildMember,
  action: VoiceChannelAction
) => {
  let desiredAction: DesiredAction
  let numberSetting: NumberSettingType
  switch (action) {
    case "joinVoiceChannel":
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
  desiredAction: DesiredAction
) => {
  log(
    `User ${member.user.tag} did ${desiredAction}, cancelling any pending warnings/kicks.`
  )
  if (voiceConnection[guild.id]) {
    voiceConnection[guild.id].disconnect()
    voiceConnection[guild.id] = null
  }
  if (desiredAction == "leaveVoiceChannel") {
    await cancelJob(
      "warn member",
      guild,
      voiceChannel,
      member,
      "turn on camera"
    )
    await cancelJob(
      "warn member",
      guild,
      voiceChannel,
      member,
      "stop screen sharing"
    )
    await cancelJob(
      "disconnect member",
      guild,
      voiceChannel,
      member,
      "turn on camera"
    )
    await cancelJob(
      "disconnect member",
      guild,
      voiceChannel,
      member,
      "stop screen sharing"
    )
    return
  } else {
    await cancelJob("warn member", guild, voiceChannel, member, desiredAction)
    await cancelJob(
      "disconnect member",
      guild,
      voiceChannel,
      member,
      desiredAction
    )
  }
}

const botDoWarning = async (
  guild: Guild,
  voiceChannel: VoiceBasedChannel,
  member: GuildMember,
  desiredAction: DesiredAction
) => {
  log(
    `Attempting bot warning in ${guild} ${voiceChannel.name} for ${member.user.tag}.`
  )
  if (
    member.voice.channel?.id != voiceChannel.id ||
    (member.voice.selfVideo && !member.voice.streaming)
  ) {
    log(
      `User ${member.user.tag} in ${guild} doesn't need warning in ${voiceChannel.name}, skipping.`
    )
    return
  }
  if (currentMemberBeingWarned[guild.id] == member.id) {
    log(
      `User ${member.user.tag} in ${guild} is already being warned in ${voiceChannel.name}, skipping.`
    )
    return
  }
  log(
    `Doing bot warning in ${guild} ${voiceChannel.name} for ${member.user.tag}.`
  )
  if (currentMemberBeingWarned[guild.id] != null) {
    await cancelJob("warn member", guild, voiceChannel, member, desiredAction)
    await scheduleJob(
      "warn member",
      5,
      guild,
      voiceChannel,
      member,
      desiredAction
    )
    log(
      `Scheduled retry in ${guild} to join on ${member.user.tag} in voice channel: ${voiceChannel.name}.`
    )
    return
  }
  currentMemberBeingWarned[guild.id] = member.id

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

  const player = createAudioPlayer()
  let resource = createAudioResource(createReadStream(audioFile))
  if (resource.volume) {
    resource.volume.setVolume(0.5)
  }

  currentMemberBeingWarned[guild.id] = member.id
  voiceChannel.send(
    `Hey ${member.user.tag}, ${desiredAction}. I'm going to disconnect you in ${kickSeconds} seconds.`
  )
  voiceConnection[guild.id] = joinVoiceChannel({
    guildId: voiceChannel.guild.id,
    channelId: voiceChannel.id,
    adapterCreator: voiceChannel.guild.voiceAdapterCreator,
  })
  player.play(resource)
  voiceConnection[guild.id].subscribe(player)
  log(
    `Disconnecting ${member.user.tag} in ${voiceChannel.name} in ${kickSeconds} seconds. Reason: ${reason}.`
  )
  await scheduleJob(
    "disconnect member",
    kickSeconds,
    guild,
    voiceChannel,
    member,
    desiredAction
  )
}

const disconnectMember = (
  guild: Guild,
  voiceChannel: VoiceBasedChannel,
  member: GuildMember,
  reason: VoiceChannelAction
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
    voiceChannel.send(`Disconnected ${member}: ${reason}.`)

    member.voice.disconnect(`${reason}`)
    member.client.voice.client.destroy
    currentMemberBeingWarned[guild.id] = null
    log(
      `User ${member.user.tag} disconnected from ${voiceChannel.name}. Reason: ${reason}.`
    )
  } catch (error) {
    lerror(error)
  }
}

const cancelJob = async (
  name: string,
  guild: Guild,
  channel: VoiceBasedChannel,
  member: GuildMember,
  desiredAction: DesiredAction
) => {
  // const jobs = await agenda.jobs({
  //   name: name,
  //   "data.guildId": guild.id,
  //   "data.channelId": channel.id,
  //   "data.memberId": member.id,
  //   "data.desiredAction": desiredAction,
  // })
  // if (!jobs) return
  // let numJobsRemoved = 0
  // jobs.forEach((job) => {
  //   job.disable()
  //   job.save()
  //   numJobsRemoved++
  // })
  const numJobsRemoved = await agenda
    .cancel({
      name: name,
      "data.guildId": guild.id,
      "data.channelId": channel.id,
      "data.memberId": member.id,
      "data.desiredAction": desiredAction,
    })
    .catch((error) => {
      lerror(error)
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
