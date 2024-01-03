import { ObjectId } from "mongodb"

export default class MemberMutedByBot {
  constructor(
    public guildId: string,
    public roleId: string,
    public id?: ObjectId
  ) {}
}
