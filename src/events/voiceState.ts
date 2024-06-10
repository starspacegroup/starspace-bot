import log from "../lib/logger"

import { insertVoiceChannelEvent } from "../connections/mongoDb"
import { VoiceState, GuildMember } from "discord.js"

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
  return false
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
const screenShared = (
  member: GuildMember,
  oldState: VoiceState,
  newState: VoiceState
) => {
  const newChannel = newState.channel
  const oldShareState = oldState.streaming ? "on" : "off"
  const newShareState = newState.streaming ? "on" : "off"
  if (oldState.channel == newState.channel) {
    if (newChannel && member && oldShareState !== newShareState) {
      if (newState.streaming) {
        return true
      }
    }
  }
  return false
}

const screenUnshared = (
  member: GuildMember,
  oldState: VoiceState,
  newState: VoiceState
) => {
  const newChannel = newState.channel
  const oldShareState = oldState.streaming ? "on" : "off"
  const newShareState = newState.streaming ? "on" : "off"
  if (oldState.channel == newState.channel) {
    if (newChannel && member && oldShareState !== newShareState) {
      if (!newState.streaming) {
        return true
      }
    }
  }
  return false
}

export function voiceStateEvent(oldState: VoiceState, newState: VoiceState) {
  const member = newState.member
  const userName = member?.user.tag
  const guildId = newState.guild.id

  if (!member) {
    return
  }

  if (userName === newState.client.user.tag || member?.user.bot) {
    // ignore myself and other bots
    return
  }
  if (memberJoined(member, oldState, newState) && newState.channel) {
    log(`${newState.guild.name}: ${userName} joined ${newState.channel?.name}.`)
    insertVoiceChannelEvent(
      guildId,
      member,
      newState.channel,
      "joinVoiceChannel"
    )
  }

  if (memberLeft(member, oldState, newState) && oldState.channel) {
    log(`${newState.guild.name}: ${userName} left ${oldState.channel?.name}.`)
    insertVoiceChannelEvent(
      guildId,
      member,
      oldState.channel,
      "leaveVoiceChannel"
    )
  }

  if (
    memberMoved(member, oldState, newState) &&
    newState.channel &&
    oldState.channel
  ) {
    log(
      `${newState.guild.name}: ${userName} moved from ${oldState.channel?.name} to ${newState.channel?.name}.`
    )
    insertVoiceChannelEvent(
      guildId,
      member,
      oldState.channel,
      "leaveVoiceChannel"
    )
    insertVoiceChannelEvent(
      guildId,
      member,
      newState.channel,
      "joinVoiceChannel"
    )
  }

  if (cameraDisabled(member, oldState, newState) && newState.channel) {
    log(`${newState.guild.name}: ${userName} camera disabled.`)
    insertVoiceChannelEvent(guildId, member, newState.channel, "cameraOff")
  }

  if (cameraEnabled(member, oldState, newState) && newState.channel) {
    log(`${newState.guild.name}: ${userName} camera enabled.`)
    insertVoiceChannelEvent(guildId, member, newState.channel, "cameraOn")
  }

  if (screenShared(member, oldState, newState) && newState.channel) {
    log(`${newState.guild.name}: ${userName} screen shared.`)
    insertVoiceChannelEvent(guildId, member, newState.channel, "screenShared")
  }

  if (screenUnshared(member, oldState, newState) && newState.channel) {
    log(`${newState.guild.name}: ${userName} screen unshared.`)
    insertVoiceChannelEvent(guildId, member, newState.channel, "screenUnshared")
  }
}
