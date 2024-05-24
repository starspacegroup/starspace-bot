import log from "../../lib/logger"
import {
  CommandInteraction,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from "discord.js"

export const whymuted = {
  command: new SlashCommandBuilder()
    .setName("whymuted")
    .setDescription("Lets the user know why they're muted while cam is off.")
    .addUserOption((option) =>
      option.setName("user").setDescription("The user to inform")
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.SendMessages),
  async execute(interaction: CommandInteraction) {
    // @ts-ignore
    const user = interaction.options.getUser("user") ?? interaction.user
    await interaction.reply(
      `${user} We have a bot (that's me) which mutes you in voice chat while your camera is turned off in certain voice channels. Turn on your camera to be automatically unmuted. :)`
    )
    log(`Informed ${user.tag} of mute details in ${interaction.guild?.name}.`)
  },
}
