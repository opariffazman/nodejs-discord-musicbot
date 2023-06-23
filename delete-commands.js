'use strict'
// @ts-check

const { REST, Routes } = require('discord.js')
const { clientId, guildId, token } = require('./config.json')

const rest = new REST().setToken(token)

// command ID from Discord -> Server Settings -> Integrations -> Bots and Apps -> Bot
const commands = ['1121355296145690635', '1121355296145690636', '1121355296145690637']

commands.forEach((command) => {
  rest
    .delete(Routes.applicationGuildCommand(clientId, guildId, command))
    .then(() => console.log(`Successfully deleted guild command ${command}`))
    .catch(console.error)
})

// to remove all commands
// rest
//   .put(Routes.applicationGuildCommands(clientId, guildId), { body: [] })
//   .then(() => console.log('Successfully deleted all guild commands.'))
//   .catch(console.error)
