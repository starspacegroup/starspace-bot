import { Guild } from "discord.js"
import { ObjectId } from "mongodb"

export type InviteData = {
  [guildId: string]: [invites: [GuildInviteData]]
}

export type GuildInviteData = {
  code: string
  uses: number
  expires: Date
  creator: string
  id?: ObjectId
}
