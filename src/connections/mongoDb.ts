import { MongoClient, ServerApiVersion } from "mongodb"
import NumberSetting, { NumberSettingType } from "../models/numberSetting"
import VoiceChannelEvent, {
  VoiceChannelAction,
} from "../models/voiceChannelEvent"
import { GuildMember, VoiceBasedChannel } from "discord.js"
import log from "../lib/logger"
const mongoUser = process.env.MONGO_USER
const mongoPass = process.env.MONGO_PASS
const mongoDb = process.env.MONGO_DB
const uri = `mongodb+srv://${mongoUser}:${mongoPass}@cameraon.ihn5vri.mongodb.net/${mongoDb}?retryWrites=false&w=majority`

const mongoClient = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
})

export const insertVoiceChannelEvent = async (
  guildId: string,
  member: GuildMember,
  channel: VoiceBasedChannel,
  action: VoiceChannelAction
) => {
  const database = mongoClient.db("camera_on")
  const voiceChannelEvent =
    database.collection<VoiceChannelEvent>("voiceChannelEvent")

  const result = await voiceChannelEvent.insertOne({
    guildId: guildId,
    memberId: member.id,
    memberName: member.user.username,
    channelId: channel.id,
    channelName: channel.name,
    action: action,
    timestamp: new Date(),
  })
  // log(`A document was inserted with the _id: ${result.insertedId}`)
}

export const getNumberSetting = async (
  settingName: NumberSettingType,
  guildId: string
) => {
  const database = mongoClient.db("camera_on")
  const result = await database
    .collection<NumberSetting>("numberSettings")
    .findOne({ name: settingName, guildId: guildId })
  return result ? result.value : 0
}

export const getJoinTime = async () => {
  const database = mongoClient.db("camera_on")
  // @ts-ignore
  const numberSettings = database.collection<TimeSetting>("numberSettings")
  const result = await numberSettings.findOne({ name: "botJoin" })
  return result.value
}

process.on("SIGINT", () => {
  mongoClient.close().then(() => {
    process.exit(0)
  })
})
process.on("SIGTERM", () => {
  mongoClient.close().then(() => {
    process.exit(0)
  })
})
export default mongoClient
