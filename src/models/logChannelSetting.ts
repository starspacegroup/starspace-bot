export type LogChannelSetting = {
  guildId: string
  channelId: string
  logType: LogType
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
