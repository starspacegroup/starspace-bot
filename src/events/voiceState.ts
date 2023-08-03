import { getJoinTime, insertVoiceChannelEvent } from "../connections/mongoDb"
import TimeSetting from "../models/timeSetting"
import ViuceChannelEvent from "../models/voiceChannelEvent"

import {
  Events,
  Client,
  GatewayIntentBits,
  VoiceState,
  Channel,
  VoiceBasedChannel,
} from "discord.js"
import {
  getVoiceConnection,
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
  AudioPlayerStatus,
} from "@discordjs/voice"
import { checkPrimeSync } from "crypto"

const intents = [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates]

// Get join time from mongo
// global.cameraWarningDelay = getJoinTime() // In seconds
// global.cameraKickDelay = 5 // In seconds

// client.on("voiceStateUpdate", async (oldState, newState) => {
//   if (!newState.channel) {
//     return
//   }
// })

const memberMoved = (member, oldState, newState) => {
  const oldChannel = oldState.channel
  const newChannel = newState.channel
  if (oldState.channel !== newState.channel) {
    if (member) {
      if (oldChannel && newChannel) {
        return true
      }
    }
  }
}

const memberJoined = (member, oldState, newState) => {
  const oldChannel = oldState.channel
  const newChannel = newState.channel
  if (oldState.channel !== newState.channel) {
    if (member) {
      if (!oldChannel && newChannel) {
        return true
      }
    }
  }
  return false
}

const memberLeft = (member, oldState, newState) => {
  const oldChannel = oldState.channel
  const newChannel = newState.channel
  if (oldState.channel !== newState.channel) {
    if (member) {
      if (oldChannel && !newChannel) {
        return true
      }
    }
  }
  return false
}

const cameraDisabled = (member, oldState, newState) => {
  const oldChannel = oldState.channel
  const newChannel = newState.channel
  const oldCamState = oldState.selfVideo ? "on" : "off"
  const newCamState = newState.selfVideo ? "on" : "off"
  if (oldState.channel == newState.channel) {
    if (newChannel && member && oldCamState !== newCamState) {
      if (!newState.selfVideo) {
        return true
      }
    }
  }
  return false
}

const cameraEnabled = (member, oldState, newState) => {
  const oldChannel = oldState.channel
  const newChannel = newState.channel
  const oldCamState = oldState.selfVideo ? "on" : "off"
  const newCamState = newState.selfVideo ? "on" : "off"
  if (oldState.channel == newState.channel) {
    if (newChannel && member && oldCamState !== newCamState) {
      if (newState.selfVideo) {
        return true
      }
    }
  }
  return false
}

export function voiceStateEvent(oldState: VoiceState, newState: VoiceState) {
  const member = newState.member
  const userName = member?.user.tag
  const oldChannel = oldState.channel
  const newChannel = newState.channel
  const oldCamState = oldState.selfVideo ? "on" : "off"
  const newCamState = newState.selfVideo ? "on" : "off"
  const bot = newState.client

  if (memberJoined(member, oldState, newState) && member && newState.channel) {
    console.log(`${userName} joined ${newState.channel?.name}.`)
    insertVoiceChannelEvent(member, newState.channel, "join")
  }

  if (memberLeft(member, oldState, newState) && member && oldState.channel) {
    console.log(`${userName} left ${oldState.channel?.name}.`)
    insertVoiceChannelEvent(member, oldState.channel, "leave")
  }

  if (
    memberMoved(member, oldState, newState) &&
    member &&
    newState.channel &&
    oldState.channel
  ) {
    console.log(
      `${userName} moved from ${oldState.channel?.name} to ${newState.channel?.name}.`
    )
    insertVoiceChannelEvent(member, oldState.channel, "leave")
    insertVoiceChannelEvent(member, newState.channel, "join")
  }

  if (
    cameraDisabled(member, oldState, newState) &&
    member &&
    newState.channel
  ) {
    console.log(`${userName} camera disabled.`)
    insertVoiceChannelEvent(member, newState.channel, "cameraOff")
  }

  if (cameraEnabled(member, oldState, newState) && member && newState.channel) {
    console.log(`${userName} camera enabled.`)
    insertVoiceChannelEvent(member, newState.channel, "cameraOn")
  }
}
