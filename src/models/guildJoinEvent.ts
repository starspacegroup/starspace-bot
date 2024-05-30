import { ObjectId } from "mongodb"

export default class GuildJoinEvent {
  constructor(
    public guildId: string,
    public memberId: string,
    public timestamp: Date,
    public inviteCode: string,
    public id?: ObjectId
  ) {}
}
