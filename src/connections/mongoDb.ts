import { MongoClient, ServerApiVersion } from "mongodb"
import VoiceChannelEvent, {
  VoiceChannelAction,
} from "../models/voiceChannelEvent"
import {
  GuildMember,
  VoiceState,
  Channel,
  VoiceChannel,
  VoiceBasedChannel,
} from "discord.js"
const mongoUser = process.env.MONGO_USER
const mongoPass = process.env.MONGO_PASS
const mongoDb = process.env.MONGO_DB
const uri = `mongodb+srv://${mongoUser}:${mongoPass}@cameraon.ihn5vri.mongodb.net/${mongoDb}?retryWrites=true&w=majority`

const mongoClient = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
})

export const insertVoiceChannelEvent = async (
  member: GuildMember,
  channel: VoiceBasedChannel,
  action: VoiceChannelAction
) => {
  const database = mongoClient.db("camera_on")
  const voiceChannelEvent =
    database.collection<VoiceChannelEvent>("voiceChannelEvent")

  const result = await voiceChannelEvent.insertOne({
    memberId: member.id,
    memberName: member.user.username,
    channelId: channel.id,
    channelName: channel.name,
    action: action,
    timestamp: new Date(),
  })
  console.log(`A document was inserted with the _id: ${result.insertedId}`)
}

export const getJoinTime = async () => {
  const database = mongoClient.db("camera_on")
  // @ts-ignore
  const timeSettings = database.collection<TimeSetting>("timeSettings")
  const result = await timeSettings.findOne({ name: "botJoin" })
  return result.value
}

process.on("SIGINT", async () => {
  await mongoClient.close()
})
process.on("SIGTERM", async () => {
  await mongoClient.close()
})
export default mongoClient
