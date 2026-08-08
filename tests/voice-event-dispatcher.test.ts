import { describe, expect, jest, test } from "@jest/globals"
import type { Client, Guild, GuildMember } from "discord.js"
import VoiceChannelEvent from "../src/models/voiceChannelEvent"
import { dispatchVoiceChannelEvent } from "../src/voice-event-dispatcher"

const guild = {
  id: "guild-1",
  name: "Test guild",
  members: { fetch: jest.fn() },
} as unknown as Guild
const member = { id: "member-1" } as GuildMember

function createClient() {
  ;(guild.members.fetch as jest.Mock).mockResolvedValue(member as never)
  return {
    user: { id: "bot-1" },
    channels: { cache: new Map([["channel-1", { isVoiceBased: () => true }]]) },
    guilds: { cache: new Map([[guild.id, guild]]) },
  } as unknown as Client
}

function createEvent(action: "cameraOff" | "cameraOn") {
  return new VoiceChannelEvent(
    guild.id,
    member.id,
    "Ada",
    "channel-1",
    "General",
    action,
    new Date("2026-01-01T00:00:00.000Z")
  )
}

describe("voice change-stream dispatch", () => {
  const actionCases: Array<
    ["cameraOff" | "cameraOn", "mute" | "unmute"]
  > = [
    ["cameraOff", "mute"],
    ["cameraOn", "unmute"],
  ]

  test.each(actionCases)("routes %s events to %s", async (action, expected) => {
    const actions = {
      isEnabled: jest.fn(async () => 1),
      mute: jest.fn(async () => undefined),
      unmute: jest.fn(async () => undefined),
      disabled: jest.fn(),
    }

    await dispatchVoiceChannelEvent(createEvent(action), createClient(), actions)

    expect(actions[expected]).toHaveBeenCalledWith(guild, member)
    expect(actions[expected === "mute" ? "unmute" : "mute"]).not.toHaveBeenCalled()
  })

  test("does not mute when camera enforcement is disabled", async () => {
    const actions = {
      isEnabled: jest.fn(async () => 0),
      mute: jest.fn(async () => undefined),
      unmute: jest.fn(async () => undefined),
      disabled: jest.fn(),
    }

    await dispatchVoiceChannelEvent(createEvent("cameraOff"), createClient(), actions)

    expect(actions.disabled).toHaveBeenCalledWith(guild)
    expect(actions.mute).not.toHaveBeenCalled()
  })
})
