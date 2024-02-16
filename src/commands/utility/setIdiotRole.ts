import { setIdiotRole } from "../../connections/mongoDb"
import log from "../../lib/logger"
import {
  CommandInteraction,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from "discord.js"

export const idiotRole = {
  command: new SlashCommandBuilder()
    .setName("setIdiotRole")
    .setDescription("Set the role that will be used for Idiots")
    .addRoleOption((option) =>
      option
        .setName("role")
        .setDescription("The role that will be used for Idiots")
        .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),
  async execute(interaction: CommandInteraction) {
    // @ts-ignore
    await interaction.deferReply()
    if (!interaction.guildId) {
      await interaction.editReply("This command can only be used in a server.")
      return
    }
    const role = interaction.options.get("role")
    if (!role) {
      await interaction.editReply("No role provided.")
      return
    }
    await setIdiotRole(interaction.guildId, role.role?.id as string)
      .then(async (response) => {
        await interaction.editReply(`Adhere enabled.`)
      })
      .catch(async (err) => {
        await interaction.editReply(`Error enabling Adhere.`)
        log(err)
      })
  },
}
