import log from "../../lib/logger"
import mongoClient from "../../connections/mongoDb"
import NumberSetting from "../../models/numberSetting"
import { CommandReasonType } from "../../models/commandReasonTypes"
import {
  CommandInteraction,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from "discord.js"

export const settimeout = {
  command: new SlashCommandBuilder()
    .setName("settimeout")
    .setDescription("Sets the number of infractions before bot times out user")
    .addNumberOption((option) =>
      option
        .setName("infractions")
        .setDescription("The number of infractions")
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName("reason")
        .setDescription("The reason type")
        .addChoices(
          { name: "Camera", value: "Camera" },
          { name: "Screenshare", value: "Screenshare" }
        )
        .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),
  async execute(interaction: CommandInteraction) {
    // @ts-ignore
    const infractions = interaction.options.getNumber("infractions")
    const reason =
      // @ts-ignore
      interaction.options.getString("reason")
    await interaction.deferReply()
    await updateTimeoutAfterXInfractions(
      infractions,
      reason,
      interaction
    ).catch(async (err) => {
      await interaction.editReply(
        `Error updating userTimeoutAfterXInfractions${reason}.`
      )
      log(err)
    })
  },
}

async function updateTimeoutAfterXInfractions(
  infractions: number,
  reason: CommandReasonType,
  interaction: CommandInteraction
) {
  try {
    const database = mongoClient.db("camera_on")
    // @ts-ignore
    const numberSettings = database.collection<NumberSetting>("numberSettings")
    const result = await numberSettings.updateOne(
      { name: `userTimeoutAfterXInfractions${reason}` },
      {
        $set: {
          value: infractions,
          guildId: interaction.guildId || "",
        },
      },
      { upsert: true }
    )
    log(
      `Updated userTimeoutAfterXInfractions${reason} in mongoDB: ${result.modifiedCount} documents.`
    )
    interaction.editReply(
      `Updated userTimeoutAfterXInfractions${reason} to ${infractions} infractions.`
    )
  } catch (err) {
    if (err instanceof Error) {
      log(err.message)
    }
  }
}
