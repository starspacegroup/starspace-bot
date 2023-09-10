import { ObjectId } from "mongodb"

export default class VoiceChannelEvent {
  constructor(
    public memberId: string,
    public memberName: string,
    public channelId: string,
    public channelName: string,
    public action: VoiceChannelAction,
    public timestamp: Date,
    public id?: ObjectId
  ) {}
}

export type VoiceChannelAction =
  | "join"
  | "leave"
  | "cameraOn"
  | "cameraOff"
  | "screenShared"
  | "screenUnshared"
