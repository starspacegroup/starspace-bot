import { ObjectId } from "mongodb"

export type GuildInviteData = {
  guildId: string
  invites: InvitesData
}

export type InvitesData = [InviteData]

export type InviteData = {
  code: string
  uses: number
  expires: Date | null
  creator: string | null
  id?: ObjectId
}
