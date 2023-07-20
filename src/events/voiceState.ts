import { Events, Client, GatewayIntentBits } from 'discord.js';
import { getVoiceConnection, joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus } from '@discordjs/voice';

const intents = [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates];
global.cameraCountdowns = [];
global.retryIntervals = [];
global.cameraWarningDelay = 5; // In seconds
global.cameraKickDelay = 5; // In seconds

module.exports = {
  name: 'voiceStateUpdate',
  once: false,
  execute(oldState, newState) {
    console.log(`Voice State Updated!`);
    const member = newState.member;
    const memberID = member.user.id;
    if (memberID === global.botID) return;
    const oldChannel = oldState.channel?.name || 'None';
    const newChannel = newState.channel?.name || 'None';
    // Check if a member joins or leaves a voice channel
    if (oldState.channel !== newState.channel) {
      if (member) {
        const userName = member.user.tag;

        if (oldChannel === 'None') {
          console.log(`${userName} joined voice channel ${newChannel}.`);
        } else if (newChannel === 'None') {
          console.log(`${userName} left voice channel ${oldChannel}.`);
          clearTimeout(global.cameraCountdowns[memberID]);
        } else {
          console.log(`${userName} moved from ${oldChannel} to ${newChannel}.`);
          clearTimeout(global.cameraCountdowns[memberID]);
        }
      }
    }

    // If a member enables or disables camera
    if (newChannel !== 'None') {
      if (newState.selfVideo) {
        console.log(`${newState.member.user.tag} camera enabled.`);
        clearTimeout(global.cameraCountdowns[memberID]);
      } else if (!newState.selfVideo) {
        console.log(`${newState.member.user.tag} camera disabled.`);
        // Join a voice channel in 5 seconds,
        // if the user has not enabled camera
        // If the camera is still not enabled in 5 seconds,
        // then disconnect user from voice chat
        global.cameraCountdowns[memberID] = setTimeout(() => {
          // Bot joins channel playing audio
          console.log(`User has not enabled camera in ${global.cameraWarningDelay} seconds.`);
          if (global.voiceConnection) {
            console.log('Bot is already busy, set an interval to deal with this.');
            if (!global.retryIntervals[memberID]){
              global.retryIntervals[memberID] = setInterval(retryHandler(member), 5000);
            }
            return;
          };      
          global.voiceConnection = joinAndPlaySound(newState.channel);
          global.cameraCountdowns[memberID] = setTimeout(() => {
            // Bot disconnects user from voice chat
            // Bot will leave voice chat if no all other users have cam on
            console.log(`User has not enabled camera for another ${global.cameraKickDelay} seconds.`);
            member.voice.disconnect();
            leaveVoiceChannel(global.voiceConnection);
          }, global.cameraKickDelay * 1000);
        }, global.cameraWarningDelay * 1000);
      }
    }
  }
}

const retryHandler(member) {
  if (global.retryIntervals[member.user.id]) {
    clearInterval(global.retryIntervals[member.user.id]);
    delete global.retryIntervals[member.user.id];
  }
}

const joinAndPlaySound = (voiceChannel) => {
  try {
    const connection = joinVoiceChannel({
      channelId: voiceChannel.id,
      guildId: voiceChannel.guild.id,
      adapterCreator: voiceChannel.guild.voiceAdapterCreator,
    });

    // const audioPath = 'path/to/your/audio/file.mp3'; // Replace this with the path to your audio file
    // const stream = createReadStream(audioPath);
    // const resource = createAudioResource(stream);
    // audioPlayer.play(resource);
    // connection.subscribe(audioPlayer);

    // audioPlayer.on(AudioPlayerStatus.Idle, () => {
    //   connection?.destroy();
    //   connection = null;
    //   console.log('Finished playing audio.');
    // });

    console.log(`Bot joined voice channel ${voiceChannel.name} and is now playing audio.`);
    return connection;
  } catch (error) {
    console.error('Error joining or playing audio:', error);
  }
}

const leaveVoiceChannel = (connection) => {
  connection.destroy();
}