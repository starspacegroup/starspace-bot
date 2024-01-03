import { ObjectId } from "mongodb"

export default class MemberMutedByBot {
  constructor(
    public memberId: string,
    public guildId: string,
    public serverMuted: boolean,
    public id?: ObjectId
  ) {}
}
