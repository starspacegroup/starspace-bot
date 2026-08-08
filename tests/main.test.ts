import { describe, expect, test } from "@jest/globals"
import NumberSetting from "../src/models/numberSetting"
import VoiceChannelEvent from "../src/models/voiceChannelEvent"

describe("bot domain models", () => {
  test("records a voice-channel event", () => {
    const timestamp = new Date("2026-01-01T00:00:00.000Z")
    const event = new VoiceChannelEvent(
      "guild-1",
      "member-1",
      "Ada",
      "channel-1",
      "General",
      "cameraOn",
      timestamp
    )

    expect(event).toMatchObject({
      guildId: "guild-1",
      memberId: "member-1",
      action: "cameraOn",
      timestamp,
    })
  })

  test("records a guild-scoped numeric setting", () => {
    const setting = new NumberSetting("enabledOnServer", 1, "guild-1")

    expect(setting).toEqual(
      expect.objectContaining({
        name: "enabledOnServer",
        value: 1,
        guildId: "guild-1",
      })
    )
  })
})
