import { ObjectId } from "mongodb"

export default class VoiceChannelEvent {
  constructor(
    public memberId: string,
    public channel: string,
    public cameraEnabled: boolean,
    public timestamp: Date,
    public id?: ObjectId
  ) {}
}
