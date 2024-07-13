import log from "../../lib/logger"
import {
  CommandInteraction,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from "discord.js"

export const fortyTwo = {
  command: new SlashCommandBuilder()
    .setName("42")
    .setDescription("Gives response.")
    .setDefaultMemberPermissions(PermissionFlagsBits.SendMessages),
  async execute(interaction: CommandInteraction) {
    await interaction.reply({ content: "32" })
    log(
      `[${interaction.guild?.name}] 42 command executed by ${interaction.user.tag}`
    )
  },
}
