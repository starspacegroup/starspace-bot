import { SlashCommandBuilder } from "discord.js"

module.exports = {
  data: new SlashCommandBuilder()
    .setName("setdisconnecttime")
    .setDescription(
      "Sets the number of seconds before disconnecting a user from VC"
    )
    .addNumberOption((option) =>
      option
        .setName("seconds")
        .setDescription("The number of seconds")
        .setRequired(true)
    ),
  async execute(interaction) {
    const seconds = interaction.options.getNumber("seconds")

    await interaction.reply(`Setting disconnect time to ${seconds} seconds.`)
  },
}
