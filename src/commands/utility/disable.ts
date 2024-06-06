import { setEnabledStatus } from "../../connections/mongoDb"
import log from "../../lib/logger"
import {
  CommandInteraction,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from "discord.js"

const botName = process.env.BOT_NAME

export const disable = {
  command: new SlashCommandBuilder()
    .setName("disable")
    .setDescription(
      `Disable ${botName} voice channel camera requirement globally.`
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),
  async execute(interaction: CommandInteraction) {
    // @ts-ignore
    await interaction.deferReply()
    if (!interaction.guildId) {
      await interaction.editReply("This command can only be used in a server.")
      return
    }
    await setEnabledStatus(interaction.guildId, false)
      .then(async (response) => {
        await interaction.editReply(`${botName} disabled.`)
      })
      .catch(async (err) => {
        await interaction.editReply(`Error enabling ${botName}.`)
        log(err)
      })
  },
}
