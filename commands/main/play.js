'use strict'
// @ts-check

const { SlashCommandBuilder } = require('discord.js')
const { joinVoiceChannel, createAudioPlayer, createAudioResource, NoSubscriberBehavior } = require('@discordjs/voice')
const { createReadStream, createWriteStream, existsSync } = require('fs')
const { join } = require('path')
const ytdl = require('ytdl-core')
const sanitize = require('sanitize-filename')
const musicFolder = 'music'

/**
 * playMusic
 * @param {string} filePath
 * @param {string} voiceChannel
 */
async function playMusic(filePath, voiceChannel) {
  const connection = joinVoiceChannel({
    channelId: voiceChannel.id,
    guildId: voiceChannel.guild.id,
    adapterCreator: voiceChannel.guild.voiceAdapterCreator
  })

  const resource = createAudioResource(createReadStream(filePath), { inlineVolume: true })
  const audioPlayer = createAudioPlayer({
    behaviors: {
      noSubscriber: NoSubscriberBehavior.Pause
    }
  })

  audioPlayer.play(resource)
  connection.subscribe(audioPlayer)

  audioPlayer.on('error', (error) => {
    console.error(`Error: ${error.message} with resource ${error.resource}`)
    connection.destroy()
  })

  audioPlayer.on('idle', () => {
    audioPlayer.stop()
    connection.destroy()
  })
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('play')
    .setDescription('Plays Music from a YouTube Url!')
    .addStringOption((option) => option.setName('url').setDescription('Enter the YouTube Url').setRequired(true)),
  async execute(interaction) {
    const url = interaction.options.getString('url')

    try {
      const voiceChannel = interaction.member.voice.channel

      if (!voiceChannel) return interaction.reply('You need to be in a voice channel to use this command.')

      const info = await ytdl.getInfo(url)
      const title = sanitize(info.videoDetails.title)
      const fileName = `${title}.mp3`
      const filePath = join(musicFolder, fileName)

      if (!existsSync(filePath)) {
        console.log(`Downloading ${fileName}`)
        const file = createWriteStream(filePath)
        const stream = ytdl(url, { filter: 'audioonly', quality: 'highestaudio' })
        stream.pipe(file)

        file.on('finish', () => {
          file.close()
          playMusic(filePath, voiceChannel)
        })
      } else {
        console.log(`${fileName} already exists`)
        playMusic(filePath, voiceChannel)
      }

      return interaction.reply(`Now Playing: ${title}`)
    } catch (error) {
      console.error(error)
      return interaction.reply('Error playing the music.')
    }
  }
}
