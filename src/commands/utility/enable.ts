import { setEnabledStatus } from "../../connections/mongoDb"
import log from "../../lib/logger"
import {
  CommandInteraction,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from "discord.js"

export const enable = {
  command: new SlashCommandBuilder()
    .setName("enable")
    .setDescription("Enable Adhere")
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),
  async execute(interaction: CommandInteraction) {
    // @ts-ignore
    await interaction.deferReply()
    if (!interaction.guildId) {
      await interaction.editReply("This command can only be used in a server.")
      return
    }
    await setEnabledStatus(interaction.guildId, true)
      .then(async (response) => {
        await interaction.editReply(`Adhere enabled.`)
      })
      .catch(async (err) => {
        await interaction.editReply(`Error enabling Adhere.`)
        log(err)
      })
  },
}
