import * as dotenv from "dotenv"
dotenv.config()

import log from "./lib/logger"
import mongoClient, { getNumberSetting } from "./connections/mongoDb"
import VoiceChannelEvent from "./models/voiceChannelEvent"
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
  processEvery: "500ms",
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
            triggerWarning(user, channel)
            break
          case "leave":
            crisisAverted(user, `left ${channel.name}.`)
            break
          case "cameraOn":
            crisisAverted(user, "turned on camera")
            break
        }
      }
    })
  },
}
const triggerWarning = async (user: User, channel: VoiceBasedChannel) => {
  const botJoinSeconds = await getNumberSetting("botJoinSeconds")
  log(`Waiting ${botJoinSeconds} seconds for ${user.tag} to turn on camera.`)
  warningJobs[`warn-${user.id}`] = agenda.define(
    `warn-${user.id}`,
    async (job) => {
      log(`Joining on ${user.tag} in voice channel: ${channel.name}.`)
      botDoWarning(channel, user)
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

const botDoWarning = async (channel: VoiceBasedChannel, member: User) => {
  log("Doing bot warning.")
  const guildMember = await channel.guild.members.fetch(member.id)
  if (voiceConnection) {
    log("Gotta retry later when the bot isn't already in a voice channel.")
    await agenda.schedule(`in 5 seconds`, `warn-${member.id}`)
    log(
      `Scheduled retry to join on ${member.tag} in voice channel: ${channel.name}.`
    )
    return
  }
  if (guildMember.voice.channel == null || guildMember.voice.selfVideo) {
    // don't run when the user isn't in a voice channel or has cam on
    return
  }
  const user = await discordClient.users.fetch(member)

  const player = createAudioPlayer()
  let resource = createAudioResource(
    createReadStream(join(__dirname, "../audio_1.mp3"))
  )
  if (resource.volume) {
    resource.volume.setVolume(0.5)
  }

  const kickSeconds = await getNumberSetting("userDisconnectSeconds")
  // channel.send(
  //   `Hey ${member} turn on your camera! Otherwise you will be disconnected in ${kickSeconds} seconds.`
  // )
  voiceConnection = joinVoiceChannel({
    channelId: channel.id,
    guildId: channel.guild.id,
    adapterCreator: channel.guild.voiceAdapterCreator,
  })
  player.play(resource)
  voiceConnection.subscribe(player)
  log(
    `Setting job to disconnect ${member.tag} in ${channel.name} in ${kickSeconds} seconds.`
  )
  kickJobs[`kick-${member.id}`] = agenda.define(
    `kick-${member.id}`,
    async (job) => {
      log(`Disconnecting ${member.tag}.`)
      disconnectUser(user, channel)
    }
  )
  await agenda.schedule(`${kickSeconds}s`, `kick-${member.id}`)
}

const botDisconnectSelf = (member: User, player) => {
  player.stop()
  if (voiceConnection) {
    voiceConnection.disconnect()
    voiceConnection = null
  }
}

const disconnectUser = async (member: User, channel: VoiceBasedChannel) => {
  const guildMember = await channel.guild.members.fetch(member.id)
  if (guildMember.voice.channel != null && guildMember.voice.selfVideo) {
    log(
      `Skipping disconnect of ${member.tag} because they're not in ${channel.name} or they turned on their camera.`
    )
    return
  }
  try {
    const disconnectSeconds = await getNumberSetting("userDisconnectSeconds")
    const joinSeconds = await getNumberSetting("botJoinSeconds")
    const seconds = disconnectSeconds + joinSeconds

    // channel.send(
    //   `Disconnected ${member} for not turning on their camera in ${seconds} seconds!`
    // )

    const guildMember = await channel.guild.members.fetch(member.id)

    if (guildMember) {
      guildMember.voice.disconnect(`Camera not on for ${seconds}`)
      guildMember.client.voice.client.destroy
    }
    log(`User ${member.tag} disconnected.`)
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
