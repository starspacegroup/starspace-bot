import log from "../../lib/logger"
import {
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  SlashCommandBuilder,
  ChannelType,
} from "discord.js"

export const say = {
  command: new SlashCommandBuilder()
    .setName("say")
    .setDescription("Send a message as the bot.")
    .addStringOption((option) =>
      option
        .setName("message")
        .setDescription("The message to send.")
        .setRequired(true)
    )
    .addChannelOption((option) =>
      option
        .setName("channel")
        .setDescription("The channel to send the message in.")
    )
    .addUserOption((option) =>
      option.setName("user").setDescription("The user to send the message as.")
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  async execute(interaction: ChatInputCommandInteraction) {
    const channel = interaction.options.getChannel("channel")
    const message = interaction.options.getString("message", true)
    const user = interaction.options.getUser("user")
    if (channel?.type !== ChannelType.GuildText) {
      await interaction.reply({
        content: "This command can only be used in text channels.",
        ephemeral: true,
      })
      return
    }

    const messageChannel = interaction.guild?.channels.cache.get(channel.id)
    if (messageChannel && messageChannel.type == ChannelType.GuildText) {
      messageChannel.send(
        user ? `${user}: ${message}` : message
      )
    }

    await interaction.reply({
      content: user
        ? `Sent message in ${channel} to ${user}`
        : `Sent message in ${channel}`,
      ephemeral: true,
    })

    log(
      user
        ? `[${interaction.guild?.name}] Sent message "${message}" in ${channel.name} to ${user.displayName} from ${interaction.user.displayName}`
        : `[${interaction.guild?.name}] Sent message "${message}" in ${channel.name} from ${interaction.user.displayName}`
    )
  },
}
