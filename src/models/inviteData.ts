import { ObjectId } from "mongodb"

export default class InviteData {
  [guildId: string]: {
    inviteCode: string
    inviteUses: number
    inviteExpires: Date
    inviteCreator: string
    id?: ObjectId
  }
}
