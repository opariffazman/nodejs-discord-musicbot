'use strict'
// @ts-check

const { SlashCommandBuilder } = require('discord.js')

module.exports = {
  data: new SlashCommandBuilder().setName('play').setDescription('Play music from url!'),
  async execute(interaction) {
    return interaction.reply('Placeholder!')
  }
}
