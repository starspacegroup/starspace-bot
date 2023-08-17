import { insertVoiceChannelEvent } from "../connections/mongoDb"
import mongoClient from "../connections/mongoDb"

import {
  Events,
  Client,
  GatewayIntentBits,
  VoiceState,
  Channel,
  VoiceBasedChannel,
  GuildMember,
} from "discord.js"
import {
  getVoiceConnection,
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
  AudioPlayerStatus,
} from "@discordjs/voice"
import { checkPrimeSync } from "crypto"
import { Agenda } from "@hokify/agenda"

const intents = [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates]

const memberMoved = (
  member: GuildMember,
  oldState: VoiceState,
  newState: VoiceState
) => {
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

const memberJoined = (
  member: GuildMember,
  oldState: VoiceState,
  newState: VoiceState
) => {
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

const memberLeft = (
  member: GuildMember,
  oldState: VoiceState,
  newState: VoiceState
) => {
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

const cameraDisabled = (
  member: GuildMember,
  oldState: VoiceState,
  newState: VoiceState
) => {
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

const cameraEnabled = (
  member: GuildMember,
  oldState: VoiceState,
  newState: VoiceState
) => {
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
  if (member) {
    if (memberJoined(member, oldState, newState) && newState.channel) {
      console.log(`${userName} joined ${newState.channel?.name}.`)
      insertVoiceChannelEvent(member, newState.channel, "join")
    }

    if (memberLeft(member, oldState, newState) && oldState.channel) {
      console.log(`${userName} left ${oldState.channel?.name}.`)
      insertVoiceChannelEvent(member, oldState.channel, "leave")
    }

    if (
      memberMoved(member, oldState, newState) &&
      newState.channel &&
      oldState.channel
    ) {
      console.log(
        `${userName} moved from ${oldState.channel?.name} to ${newState.channel?.name}.`
      )
      insertVoiceChannelEvent(member, oldState.channel, "leave")
      insertVoiceChannelEvent(member, newState.channel, "join")
    }

    if (cameraDisabled(member, oldState, newState) && newState.channel) {
      console.log(`${userName} camera disabled.`)
      insertVoiceChannelEvent(member, newState.channel, "cameraOff")
    }

    if (cameraEnabled(member, oldState, newState) && newState.channel) {
      console.log(`${userName} camera enabled.`)
      insertVoiceChannelEvent(member, newState.channel, "cameraOn")
    }
  }
}
