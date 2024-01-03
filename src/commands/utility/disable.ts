import { setEnabledStatus } from "../../connections/mongoDb"
import log from "../../lib/logger"
import {
  CommandInteraction,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from "discord.js"
import { getMutedRole } from "../../connections/mongoDb"

export const disable = {
  command: new SlashCommandBuilder()
    .setName("disable")
    .setDescription("Disable Adhere")
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
        await interaction.editReply(`Adhere disabled.`)
        // if (interaction.guildId) {
        //   log(
        //     `Adhere has been disabled in ${interaction.guild?.name}, removing muted role from all members.`
        //   )
        //   const mutedRole = await getMutedRole(interaction.guildId)
        //   if (mutedRole) {
        //     interaction.guild?.roles.cache
        //       .get(mutedRole)
        //       ?.members.forEach(async (member) => {
        //         await member.roles.remove(mutedRole)
        //       })
        //   }
        // }
      })
      .catch(async (err) => {
        await interaction.editReply(`Error enabling Adhere.`)
        log(err)
      })
  },
}
