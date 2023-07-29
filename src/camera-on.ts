import {
  Client,
  Collection,
  VoiceChannel,
  TextChannel,
  User,
  Events,
  GatewayIntentBits,
  SlashCommandBuilder,
} from "discord.js"
import * as dotenv from "dotenv"
dotenv.config()
import fs from "node:fs"
import path from "node:path"
import { voiceStateEvent } from "./events/voiceState"
// import { readyStateEvent } from "./events/ready"
import { setjointime } from "./commands/utility/set-join-time"

const botToken = process.env.DISCORD_BOT_TOKEN

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates],
})

client.on("voiceStateUpdate", voiceStateEvent)

global.botID = client.user?.id
// Load commands from commands folders
// client.commands = new Collection()
// const foldersPath = path.join(__dirname, "commands")
// const commandFolders = fs.readdirSync(foldersPath)

// for (const folder of commandFolders) {
//   const commandsPath = path.join(foldersPath, folder)
//   const commandFiles = fs
//     .readdirSync(commandsPath)
//     .filter((file) => file.endsWith(".js"))
//   for (const file of commandFiles) {
//     const filePath = path.join(commandsPath, file)
//     const command = require(filePath)
//     console.log(`Loaded ${filePath}`)
//     if ("data" in command && "execute" in command) {
//       client.commands.set(command.data.name, command)
//       console.log(`Added command: ${command.data.name}`)
//     } else {
//       console.log(
//         `[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`
//       )
//     }
//   }
// }

const commands = {
  setjointime,
}

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return
  if (!Object.keys(commands).includes(interaction.commandName)) {
    return
  }
  const command =
    commands[interaction.commandName as unknown as keyof typeof commands]
  try {
    await command.execute(interaction)
  } catch {}
  // const command = client.commands.get(interaction.commandName)

  // if (!command) return

  // try {
  //   /* @ts-ignore */
  //   await command.execute(interaction)
  // } catch (error) {
  //   console.error(error)
  //   if (interaction.replied || interaction.deferred) {
  //     await interaction.followUp({
  //       content: "There was an error while executing this command!",
  //       ephemeral: true,
  //     })
  //   } else {
  //     await interaction.reply({
  //       content: "There was an error while executing this command!",
  //       ephemeral: true,
  //     })
  //   }
  // }
})

// Load events from events folder
// const eventsPath = path.join(__dirname, "events")
// const eventFiles = fs
//   .readdirSync(eventsPath)
//   .filter((file) => file.endsWith(".js"))

// for (const file of eventFiles) {
//   const filePath = path.join(eventsPath, file)
//   const event = require(filePath)
//   if (event.once) {
//     client.once(event.name, (...args) => event.execute(...args))
//   } else {
//     client.on(event.name, (...args) => event.execute(...args))
//   }
// }

client.login(botToken)
