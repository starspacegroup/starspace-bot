import { ObjectId } from "mongodb"

export default class IdiotRole {
  constructor(
    public guildId: string,
    public roleId: string,
    public id?: ObjectId
  ) {}
}
