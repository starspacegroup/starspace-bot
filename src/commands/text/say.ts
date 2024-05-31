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
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  async execute(interaction: CommandInteraction) {
    // @ts-ignore
    const channel = interaction.options.get("channel")?.channel
    const message = interaction.options.get("message")
    if (channel?.type !== ChannelType.GuildText) {
      await interaction.reply("This command can only be used in text channels.")
      return
    }

    const messageChannel = interaction.guild?.channels.cache.get(channel.id)
    if (messageChannel && messageChannel.type == ChannelType.GuildText) {
      messageChannel.send(`${message?.value}`)
    }

    await interaction.reply(`Sent message in ${channel}`)

    log(
      `[${interaction.guild?.name}] Sent message "${interaction.options.get(
        "message"
      )}" to ${channel}`
    )
  },
}
