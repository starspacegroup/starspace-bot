import * as dotenv from "dotenv"
dotenv.config()

import mongoClient, { getNumberSetting } from "./connections/mongoDb"
import VoiceChannelEvent from "./models/voiceChannelEvent"
import { Client, User, GatewayIntentBits, VoiceBasedChannel } from "discord.js"
import { createAudioPlayer } from "@discordjs/voice"
import { Agenda, Job } from "@hokify/agenda"
import {
  AudioPlayerStatus,
  createAudioResource,
  joinVoiceChannel,
  VoiceConnection,
} from "@discordjs/voice"
import { ChangeStreamInsertDocument } from "mongodb"
import { isArgumentsObject } from "util/types"
import { warn } from "console"
import { createReadStream } from "fs"
import { join } from "path"
let voiceConnection: VoiceConnection[] = []
let warningJobs: Job[] = []
let kickJobs: Job[] = []
const botToken = process.env.DISCORD_BOT_TOKEN

const database = mongoClient.db("camera_on")
const mongoUser = process.env.MONGO_USER
const mongoPass = process.env.MONGO_PASS
const mongoDb = process.env.MONGO_DB
const agenda = new Agenda({
  db: {
    address: `mongodb+srv://${mongoUser}:${mongoPass}@cameraon.ihn5vri.mongodb.net/${mongoDb}?retryWrites=true&w=majority`,
  },
})
const discordClient = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildVoiceStates,
  ],
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
      const channel = await discordClient.channels.cache.get(channelID)
      const action = change.fullDocument.action
      const timestamp = change.fullDocument.timestamp

      if (user && channel?.isVoiceBased()) {
        switch (action) {
          case "join":
            triggerWarning(user, timestamp, channel)
            break
          case "leave":
            crisisAverted(user, timestamp, channel, "left channel")
            break
          case "cameraOff":
            triggerWarning(user, timestamp, channel)
            break
          case "cameraOn":
            crisisAverted(user, timestamp, channel, "turned on camera")
            break
        }
      }

      console.log(`change: ${JSON.stringify(action)}`)
    })
  },
}
const triggerWarning = async (
  user: User,
  time: Date,
  channel: VoiceBasedChannel
) => {
  const botJoinSeconds = await getNumberSetting("botJoinSeconds")
  console.log(
    `Waiting ${botJoinSeconds} seconds for ${user.tag} to turn on camera.`
  )
  warningJobs[`warn-${user.id}`] = agenda.define(
    `warn-${user.id}`,
    async (job) => {
      console.log(`Joining on ${user.tag} in voice channel: ${channel.name}.`)
      botJoinAndPlayMusic(channel, user)
    }
  )
  await agenda.schedule(`${botJoinSeconds}s`, `warn-${user.id}`)
}
const crisisAverted = async (
  user: User,
  time: Date,
  channel: VoiceBasedChannel,
  action: string
) => {
  console.log(
    `User ${user.tag} ${action}, cancelling any pending warnings/kicks.`
  )
  if (`warn-${user.id}` in warningJobs) {
    await agenda.cancel({ name: `warn-${user.id}` })
    delete warningJobs[`warn-${user.id}`]
  }
  if (`warn-${user.id}` in voiceConnection) {
    voiceConnection[`warn-${user.id}`].disconnect()
    delete voiceConnection[`warn-${user.id}`]
  }
  if (`kick-${user.id}` in kickJobs) {
    await agenda.cancel({ name: `kick-${user.id}` })
    delete kickJobs[`kick-${user.id}`]
  }
}

const botJoinAndPlayMusic = async (
  channel: VoiceBasedChannel,
  member: User
) => {
  const guildMember = await channel.guild.members.fetch(member.id)
  if (guildMember.voice.channel == null || guildMember.voice.selfVideo) {
    return
  }
  if (voiceConnection.length > 0) {
    console.log(
      "Gotta retry later when the bot isn't already in a voice channel."
    )
    agenda.cancel({ jobName: `warn-${member.id}` })
    delete warningJobs[`warn-${member.id}`]
    warningJobs[`warn-${member.id}`] = agenda.define(
      `warn-${member.id}`,
      async (job) => {
        console.log(`Joining on ${user.tag} in voice channel: ${channel.name}.`)
        botJoinAndPlayMusic(channel, member)
      }
    )
    agenda.schedule(`1s`, `warn-${member.id}`)
    return
  }
  const user = await discordClient.users.fetch(member)
  const player = createAudioPlayer()
  let resource = createAudioResource(
    createReadStream(join(__dirname, "../audio.mp3"))
  )
  if (resource.volume) {
    resource.volume.setVolume(0.5)
  }
  console.log(join(__dirname, "../audio.mp3"))

  const kickSeconds = await getNumberSetting("userDisconnectSeconds")
  voiceConnection[`warn-${member.id}`] = joinVoiceChannel({
    channelId: channel.id,
    guildId: channel.guild.id,
    adapterCreator: channel.guild.voiceAdapterCreator,
  })
  player.play(resource)
  voiceConnection[`warn-${member.id}`].subscribe(player)
  console.log(
    `Setting job to disconnect ${member.tag} in ${channel.name} in ${kickSeconds} seconds.`
  )
  kickJobs[`kick-${member.id}`] = agenda.define(
    `kick-${member.id}`,
    async (job) => {
      console.log(`Disconnecting ${member.tag}.`)
      await disconnectUser(user, channel)
    }
  )
  agenda.schedule(`${kickSeconds}s`, `kick-${member.id}`)
}

const botDisconnectSelf = (member: User, player) => {
  player.stop()
  voiceConnection[`warn-${member.id}`].disconnect()
}

const disconnectUser = async (member: User, channel: VoiceBasedChannel) => {
  const guildMember = await channel.guild.members.fetch(member.id)
  if (guildMember.voice.channel != null && guildMember.voice.selfVideo) {
    return
  }
  try {
    const disconnectSeconds = await getNumberSetting("userDisconnectSeconds")
    const joinSeconds = await getNumberSetting("botJoinSeconds")
    const seconds = disconnectSeconds + joinSeconds

    const guildMember = await channel.guild.members.fetch(member.id)

    if (guildMember) {
      guildMember.voice.disconnect(`Camera not on for ${seconds}`)
      guildMember.client.voice.client.destroy
    }
    console.log(`User ${member.tag} disconnected.`)
  } catch (error) {
    console.log(error)
  }
}
