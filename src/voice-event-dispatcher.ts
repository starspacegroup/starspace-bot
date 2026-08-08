import type { Client, Guild, GuildMember } from "discord.js"
import type VoiceChannelEvent from "./models/voiceChannelEvent"

interface DispatcherActions {
  isEnabled(guildId: string): Promise<number>
  mute(guild: Guild, member: GuildMember): Promise<void>
  unmute(guild: Guild, member: GuildMember): Promise<void>
  disabled(guild: Guild): void
}

export async function dispatchVoiceChannelEvent(
  event: VoiceChannelEvent,
  client: Client,
  actions: DispatcherActions
): Promise<void> {
  const botUserId = client.user?.id
  const channel = client.channels.cache.get(event.channelId)
  const guild = client.guilds.cache.get(event.guildId)
  const member = await guild?.members.fetch(event.memberId)

  if (!member || !channel?.isVoiceBased() || !botUserId || !guild) return

  if (!(await actions.isEnabled(guild.id))) {
    actions.disabled(guild)
    return
  }

  if (event.action === "joinVoiceChannel" || event.action === "cameraOff") {
    await actions.mute(guild, member)
  } else if (event.action === "cameraOn") {
    await actions.unmute(guild, member)
  }
}
