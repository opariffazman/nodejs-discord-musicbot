'use strict'
// @ts-check

const { SlashCommandBuilder } = require('discord.js')
const { joinVoiceChannel, createAudioPlayer, createAudioResource, NoSubscriberBehavior } = require('@discordjs/voice')
const { createReadStream, createWriteStream, existsSync } = require('fs')
const { join } = require('path')
const { once } = require('events')
const ytdl = require('ytdl-core')
const ytpl = require('ytpl')
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

  audioPlayer.on('stateChange', (oldState, newState) => {
    console.log(`stateChange: ${oldState} => ${newState}`)

    if (newState.status === 'idle') {
      audioPlayer.stop()
    }
  })
  await once(audioPlayer, 'idle')
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('playlist')
    .setDescription('Plays Music from a YouTube Playlist!')
    .addStringOption((option) => option.setName('url').setDescription('Enter the YouTube Playlist').setRequired(true)),
  async execute(interaction) {
    const url = interaction.options.getString('url')

    try {
      const voiceChannel = interaction.member.voice.channel

      if (!voiceChannel) return interaction.reply('You need to be in a voice channel to use this command.')

      const playlist = await ytpl(url)
      const videos = playlist.items

      if (videos.length === 0) return interaction.reply('The playlist does not contain any videos.')

      for (const video of videos) {
        const url = video.shortUrl
        const info = await ytdl.getInfo(url)
        const title = sanitize(info.videoDetails.title)
        const fileName = `${title}.mp3`
        const filePath = join(musicFolder, fileName)

        if (!existsSync(filePath)) {
          console.log(`Downloading ${fileName}`)
          const file = createWriteStream(filePath)
          const stream = ytdl(url, { filter: 'audioonly', quality: 'highestaudio' })
          stream.pipe(file)

          await new Promise((resolve) => {
            file.on('finish', () => {
              file.close()
              resolve()
            })
          })
        } else console.log(`${fileName} already exists`)

        await playMusic(filePath, voiceChannel)
        await interaction.reply(`Now Playing: ${title}`)
      }
    } catch (error) {
      console.error(error)
      return interaction.reply('Error playing the music.')
    }
  }
}
