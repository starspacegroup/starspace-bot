import log from "../../lib/logger"
import { setLogChannelSetting } from "../../connections/mongoDb"
import {
  CommandInteraction,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from "discord.js"

const mongoDb = process.env.MONGO_DB

export const setLogChannel = {
  command: new SlashCommandBuilder()
    .setName("setlogchannel")
    .setDescription("Channel to send log messages to")
    .addChannelOption((option) =>
      option.setName("channel").setDescription("The channel").setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName("logtype")
        .setDescription("The log type")
        .addChoices(
          { name: "All", value: "All" },
          { name: "Member Joined Server", value: "memberJoinedServer" }
        )
        .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),
  async execute(interaction: CommandInteraction) {
    // @ts-ignore
    const logType = interaction.options.getString("logtype")
    // @ts-ignore
    const channel = interaction.options.getChannel("channel")
    const guild = interaction.guild
    const guildId = guild?.id || ""
    await interaction.deferReply()
    await setLogChannelSetting(guildId, channel, logType)
    interaction.reply(`Set log channel for ${logType} to ${channel}`)
    log(`[${guild?.name}] Set log channel for ${logType} to ${channel}`)
  },
}
