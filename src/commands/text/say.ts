import log from "../../lib/logger"
import {
  CommandInteraction,
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
  async execute(interaction: CommandInteraction) {
    // @ts-ignore
    const channel = interaction.options.get("channel")?.channel
    const message = interaction.options.get("message")
    const user = interaction.options.get("user")?.user
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
        user ? `${user}: ${message?.value}` : `${message?.value}`
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
        ? `[${interaction.guild?.name}] Sent message "${message?.value}" in ${channel.name} to ${user?.displayName} from ${interaction.user.displayName}`
        : `[${interaction.guild?.name}] Sent message "${message?.value}" in ${channel.name} from ${interaction.user.displayName}`
    )
  },
}
