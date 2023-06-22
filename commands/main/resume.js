'use strict'
// @ts-check

const { SlashCommandBuilder } = require('discord.js')
const { joinVoiceChannel } = require('@discordjs/voice')

module.exports = {
  data: new SlashCommandBuilder().setName('resume').setDescription('Resume the paused music playback'),
  async execute(interaction) {
    const voiceChannel = interaction.member.voice.channel

    if (!voiceChannel) return interaction.reply('You need to be in a voice channel to use this command.')

    const connection = joinVoiceChannel({
      channelId: voiceChannel.id,
      guildId: voiceChannel.guild.id,
      adapterCreator: voiceChannel.guild.voiceAdapterCreator
    })

    if (!connection) return interaction.reply('I am not currently playing any music.')

    const audioPlayer = connection.state.subscription.player

    if (!audioPlayer) return interaction.reply('I am not currently playing any music.')

    audioPlayer.unpause()

    return interaction.reply('Music resumed.')
  }
}
