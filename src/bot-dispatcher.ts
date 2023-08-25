import * as dotenv from "dotenv"
dotenv.config()

import mongoClient, { getNumberSetting } from "./connections/mongoDb"
import VoiceChannelEvent from "./models/voiceChannelEvent"
import { Client, User, GatewayIntentBits, VoiceBasedChannel } from "discord.js"
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
let voiceConnection: VoiceConnection | null
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
      const botUser = discordClient?.user?.id
      const channel = discordClient.channels.cache.get(channelID)
      const action = change.fullDocument.action

      if (user && channel?.isVoiceBased() && botUser) {
        const botGuildMember = await channel?.guild.members.fetch(botUser)
        if (!channel.permissionsFor(botGuildMember).has("Connect")) {
          // ignore channels the bot can't join
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
  console.log(
    `Waiting ${botJoinSeconds} seconds for ${user.tag} to turn on camera.`
  )
  warningJobs[`warn-${user.id}`] = agenda.define(
    `warn-${user.id}`,
    async (job) => {
      console.log(`Joining on ${user.tag} in voice channel: ${channel.name}.`)
      botDoWarning(channel, user)
    }
  )
  agenda.schedule(`${botJoinSeconds}s`, `warn-${user.id}`)
}
const crisisAverted = async (user: User, action: string) => {
  console.log(
    `User ${user.tag} ${action}, cancelling any pending warnings/kicks.`
  )
  if (`warn-${user.id}` in warningJobs) {
    await agenda.cancel({ name: `warn-${user.id}` })
    delete warningJobs[`warn-${user.id}`]
  }
  if (voiceConnection) {
    voiceConnection.disconnect()
    voiceConnection = null
  }
  if (`kick-${user.id}` in kickJobs) {
    await agenda.cancel({ name: `kick-${user.id}` })
    delete kickJobs[`kick-${user.id}`]
  }
}

const botDoWarning = async (channel: VoiceBasedChannel, member: User) => {
  const guildMember = await channel.guild.members.fetch(member.id)
  if (voiceConnection) {
    console.log(
      "Gotta retry later when the bot isn't already in a voice channel."
    )
    await agenda.schedule(`in 5 seconds`, `warn-${member.id}`)
    console.log(
      `Scheduled retry to join on ${member.tag} in voice channel: ${channel.name}.`
    )
    return
  }
  if (guildMember.voice.channel == null || guildMember.voice.selfVideo) {
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

  const kickSeconds = await getNumberSetting("userDisconnectSeconds")
  channel.send(
    `Hey ${member} turn on your camera! Otherwise you will be disconnected in ${kickSeconds} seconds.`
  )
  voiceConnection = joinVoiceChannel({
    channelId: channel.id,
    guildId: channel.guild.id,
    adapterCreator: channel.guild.voiceAdapterCreator,
  })
  console.log(`Voice connection:` + voiceConnection)
  player.play(resource)
  voiceConnection.subscribe(player)
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
  if (voiceConnection) {
    voiceConnection.disconnect()
    voiceConnection = null
  }
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

    channel.send(
      `Disconnected ${member} for not turning on their camera in ${seconds} seconds!`
    )

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
