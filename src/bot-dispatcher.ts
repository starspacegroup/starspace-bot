import * as dotenv from "dotenv"
dotenv.config()

import mongoClient, { getNumberSetting } from "./connections/mongoDb"
import VoiceChannelEvent from "./models/voiceChannelEvent"
import {
  Client,
  User,
  GatewayIntentBits,
  VoiceBasedChannel,
  GuildMember,
} from "discord.js"
import { Agenda, Job } from "@hokify/agenda"
import { joinVoiceChannel, VoiceConnection } from "@discordjs/voice"
import { ChangeStreamInsertDocument } from "mongodb"
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
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates],
})
discordClient.login(botToken)

const botJoinAndPlayMusic = async (
  channel: VoiceBasedChannel,
  member: User
) => {
  const kickSeconds = await getNumberSetting("userDisconnectSeconds")
  voiceConnection[`warn-${member.id}`] = joinVoiceChannel({
    channelId: channel.id,
    guildId: channel.guild.id,
    adapterCreator: channel.guild.voiceAdapterCreator,
  })
  kickJobs[`kick-${member.id}`] = agenda.create(
    `kick-${member.id}`,
    async (job, member) => {
      disconnectUser(member, channel)
    }
  )
  agenda.schedule(`${kickSeconds}s`, `kick-${member.id}`)
}

const botDisconnectSelf = (member: User) => {
  voiceConnection[`warn-${member.id}`].disconnect()
}

const disconnectUser = async (
  member: GuildMember,
  channel: VoiceBasedChannel
) => {
  try {
    const disconnectSeconds = await getNumberSetting("userDisconnectSeconds")
    const joinSeconds = await getNumberSetting("botJoinSeconds")
    const seconds = disconnectSeconds + joinSeconds

    member.voice.disconnect(`Camera not on for ${seconds}`)
    console.log(`User ${member.user.tag} disconnected.`)
  } catch (error) {
    console.log(error)
  }
}

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
            userJoined(user, timestamp, channel)
            break
          case "leave":
            userLeft(user, timestamp, channel)
            break
          case "cameraOff":
            userTurnedOffCamera(user, timestamp, channel)
            break
          case "cameraOn":
            userTurnedOnCamera(user, timestamp, channel)
            break
        }
      }

      console.log(`change: ${JSON.stringify(action)}`)
    })

    // start agenda
    // agenda.start()

    // const pipeline = [{ $match: {} }]
    // const changeStream = voiceChannelEvents.watch(pipeline)

    // for await (const change of changeStream) {
    //   console.log(`change: ${JSON.stringify(change)}`)
    // }
  },
}

const userJoined = async (
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
      console.log("Joining voice channel")
      voiceConnection[`warn-${user.id}`] = joinVoiceChannel({
        channelId: channel.id,
        guildId: channel.guild.id,
        adapterCreator: channel.guild.voiceAdapterCreator,
      })
    }
  )
  // await agenda.start()
  await agenda.schedule(`${botJoinSeconds}s`, `warn-${user.id}`)
}
const userLeft = (user: User, time: Date, channel: VoiceBasedChannel) => {
  console.log(
    `User ${user.tag} left ${channel.name}, cancelling any pending warnings.`
  )
  if (warningJobs[`warn-${user.id}`]) {
    warningJobs[`warn-${user.id}`].cancel()
    delete warningJobs[`warn-${user.id}`]
  }
  if (voiceConnection[`warn-${user.id}`]) {
    voiceConnection[`warn-${user.id}`].disconnect()
  }
}

const userTurnedOffCamera = async (
  user: User,
  time: Date,
  channel: VoiceBasedChannel
) => {
  const botJoinSeconds = await getNumberSetting("botJoinSeconds")
  console.log(
    `Waiting ${botJoinSeconds} seconds for ${user.tag} to turn camera back on.`
  )
  warningJobs[`warn-${user.id}`] = agenda.create(
    `warn-${user.id}`,
    async (job) => {
      voiceConnection[`warn-${user.id}`] = joinVoiceChannel({
        channelId: channel.id,
        guildId: channel.guild.id,
        adapterCreator: channel.guild.voiceAdapterCreator,
      })
      done: () => {
        voiceConnection[`warn-${user.id}`].disconnect()
      }
    }
  )
  await agenda.schedule(`${botJoinSeconds}s`, `warn-${user.id}`)
}

const userTurnedOnCamera = (
  user: User,
  time: Date,
  channel: VoiceBasedChannel
) => {
  console.log(
    `User ${user.tag} turned on camera, cancelling any pending warnings.`
  )
  if (warningJobs[`warn-${user.id}`]) {
    warningJobs[`warn-${user.id}`].cancel()
    delete warningJobs[`warn-${user.id}`]
  }
  if (voiceConnection[`warn-${user.id}`]) {
    voiceConnection[`warn-${user.id}`].disconnect()
  }
}
