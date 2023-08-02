import { ObjectId } from "mongodb"

export default class VoiceChannelEvent {
  constructor(
    public memberId: string,
    public channel: string,
    public action: VoiceChannelAction,
    public timestamp: Date,
    public id?: ObjectId
  ) {}
}

export enum VoiceChannelAction {
  Join = "join",
  Leave = "leave",
  Kick = "kick",
  CameraOn = "camera_on",
}
