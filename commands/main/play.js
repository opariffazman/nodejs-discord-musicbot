'use strict'
// @ts-check

const { SlashCommandBuilder } = require('discord.js')
const { joinVoiceChannel, createAudioPlayer, createAudioResource, NoSubscriberBehavior } = require('@discordjs/voice')
const { createReadStream, createWriteStream, existsSync } = require('fs')
const { join } = require('path')
const ytdl = require('ytdl-core')
const sanitize = require('sanitize-filename')
const musicFolder = 'music'
const queue = []

/**
 * playMusic
 * @param {*} audioPlayer
 * @param {*} connection
 * @param {*} filePath
 */
async function playMusic(audioPlayer, connection, filePath) {
  const resource = createAudioResource(createReadStream(filePath), { inlineVolume: true })
  audioPlayer.play(resource)
  connection.subscribe(audioPlayer)

  audioPlayer.on('error', (error) => {
    console.error(`Error: ${error.message} with resource ${error.resource}`)
    connection.destroy()
    removeFromQueue(filePath)
  })

  audioPlayer.on('stateChange', (oldState, newState) => {
    console.log(`stateChange: ${oldState.status} => ${newState.status}`)

    if (newState.status === 'idle') {
      audioPlayer.stop()
      removeFromQueue(filePath)

      // Play the next song in the queue if available
      const nextSong = queue[0]
      if (nextSong) {
        const { audioPlayer: nextAudioPlayer, connection: nextConnection, filePath: nextFilePath } = nextSong
        playMusic(nextAudioPlayer, nextConnection, nextFilePath)
      }
    }
  })
}

function removeFromQueue(filePath) {
  const index = queue.findIndex((song) => song.filePath === filePath)
  if (index !== -1) {
    queue.splice(index, 1)
  }
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

      const connection = joinVoiceChannel({
        channelId: voiceChannel.id,
        guildId: voiceChannel.guild.id,
        adapterCreator: voiceChannel.guild.voiceAdapterCreator
      })

      const audioPlayer = createAudioPlayer({
        behaviors: {
          noSubscriber: NoSubscriberBehavior.Pause
        }
      })

      const info = await ytdl.getInfo(url)
      const title = sanitize(info.videoDetails.title)
      const fileName = `${title}.mp3`
      const filePath = join(musicFolder, fileName)
      let playStatus

      if (!existsSync(filePath)) {
        console.log(`downloading ${fileName}`)
        const file = createWriteStream(filePath)
        const stream = ytdl(url, { filter: 'audioonly', quality: 'highestaudio' })
        stream.pipe(file)

        await new Promise((resolve) => {
          file.on('finish', () => {
            console.log(`${fileName} downloaded`)
            file.close()
            resolve()
          })
        })
      } else console.log(`${fileName} already exists`)

      // Add the song to the queue
      queue.push({
        audioPlayer,
        connection,
        filePath
      })

      // If the audioPlayer is not playing, start playing the song
      if (queue.length === 1 && audioPlayer.state.status !== 'playing') {
        console.log(`started playing ${fileName}`)
        playStatus = 'Now Playing'
        playMusic(audioPlayer, connection, filePath)
      } else {
        console.log(`added ${fileName} to queue`)
        playStatus = 'Added to Queue'
      }

      console.log(queue)

      return interaction.reply(`${playStatus}: ${title}`)
    } catch (error) {
      console.error(error)
      return interaction.reply('Error playing the music.')
    }
  }
}
