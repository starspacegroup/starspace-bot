import { ObjectId } from "mongodb"

export default class LogChannelSetting {
  constructor(
    public guildId: string,
    public channelId: string,
    public logType: LogType,
    public id?: ObjectId
  ) {}
}

export type LogType =
  | "joinServer"
  | "leaveServer"
  | "voiceChannelJoin"
  | "voiceChannelLeave"
  | "voiceChannelMute"
  | "voiceChannelUnmute"
  | "voiceChannelDeafen"
  | "voiceChannelUndeafen"
  | "voiceChannelMove"
  | "voiceChannelDisconnect"
  | "voiceChannelConnect"
  | "voiceChannelStreamStart"
  | "voiceChannelStreamEnd"
  | "voiceChannelStreamPause"
  | "All"
