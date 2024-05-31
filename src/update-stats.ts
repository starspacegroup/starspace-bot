// const eventsDb = mongo://localhost:27017/voiceChannelEvents/
// const statsDb = mongo://localhost:27017/voiceChannelStats/
// find every instance of user join+leave vc in eventsDb:
//   calculate distance from join to leave:
//     save the distance in statsDb for channel

// import * as dotenv from "dotenv"
// dotenv.config()
// import log from "./lib/logger"

// import { getEnabledStatus, getNumberSetting } from "./connections/mongoDb"
// import VoiceChannelEvent from "./models/voiceChannelEvent"
// import { countReset } from "console"
// import { channel } from "diagnostics_channel"
// import { Timestamp } from "mongodb"

// interface VoiceChannelStats {
//   guildId: string
//   channelId: string
//   timestamp: Timestamp
//   activityInMinutes: number
// }

// function calculateVoiceMinutes(
//   events: VoiceChannelEvent[]
// ): VoiceChannelStats[] {
//   const channelMinutesMap: { [channelId: string]: number } = {}
//   const userChannelMap: { [userId: string]: { [channelId: string]: number } } =
//     {}

//   // Sort events by timestamp
//   events.sort((a, b) => a.timestamp - b.timestamp)

//   events.forEach((event) => {
//     const { memberId, channelId, action, timestamp } = event

//     if (action === "join") {
//       // Store the join timestamp for the user in the channel
//       if (!userChannelMap[memberId]) {
//         userChannelMap[memberId] = {}
//       }
//       userChannelMap[memberId][channelId] = timestamp
//     } else if (
//       action === "leave" &&
//       userChannelMap[userId] &&
//       userChannelMap[userId][channelId] !== undefined
//     ) {
//       // Calculate duration and update channelMinutesMap
//       const joinTime = userChannelMap[userId][channelId]
//       const durationInMinutes = (timestamp - joinTime) / (1000 * 60) // Convert milliseconds to minutes

//       if (!channelMinutesMap[channelId]) {
//         channelMinutesMap[channelId] = 0
//       }
//       channelMinutesMap[channelId] += durationInMinutes

//       // Remove user from the userChannelMap for the channel
//       delete userChannelMap[userId][channelId]
//     }
//   })

//   // Convert channelMinutesMap to VoiceChannelStats array
//   const voiceChannelStats: VoiceChannelStats[] = []
//   for (const channelId in channelMinutesMap) {
//     if (channelMinutesMap.hasOwnProperty(channelId)) {
//       voiceChannelStats.push({
//         channelId,
//         totalVoiceMinutes: channelMinutesMap[channelId],
//       })
//     }
//   }

//   return voiceChannelStats
// }

// // Example usage:
// const events: Event[] = [
//   {
//     userId: "user1",
//     channelId: "channel1",
//     timestamp: 1618404000000,
//     eventType: "join",
//   },
//   {
//     userId: "user2",
//     channelId: "channel1",
//     timestamp: 1618404500000,
//     eventType: "join",
//   },
//   {
//     userId: "user1",
//     channelId: "channel1",
//     timestamp: 1618404600000,
//     eventType: "leave",
//   },
//   {
//     userId: "user2",
//     channelId: "channel1",
//     timestamp: 1618404700000,
//     eventType: "leave",
//   },
//   {
//     userId: "user1",
//     channelId: "channel2",
//     timestamp: 1618404800000,
//     eventType: "join",
//   },
//   {
//     userId: "user1",
//     channelId: "channel2",
//     timestamp: 1618405100000,
//     eventType: "leave",
//   },
// ]

// const result = calculateVoiceMinutes(events)
// console.log(result)
