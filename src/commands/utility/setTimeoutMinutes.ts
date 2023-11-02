import mongoClient from "../../connections/mongoDb"
import log from "../../lib/logger"
import NumberSetting from "../../models/numberSetting"
import { CommandReasonType } from "../../models/commandReasonTypes"
import {
  CommandInteraction,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from "discord.js"

export const settimeoutminutes = {
  command: new SlashCommandBuilder()
    .setName("settimeoutminutes")
    .setDescription(
      "Sets the number of minutes to timeout users with X number of infractions "
    )
    .addNumberOption((option) =>
      option
        .setName("minutes")
        .setDescription("The number of minutes")
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
    const minutes = interaction.options.getNumber("minutes")
    const reason =
      // @ts-ignore
      interaction.options.getString("reason")
    await interaction.deferReply()
    await updateTimeouteLengthMinutes(minutes, reason, interaction).catch(
      async (err) => {
        await interaction.editReply("Error updating timeoutLengthMinutes.")
        log(err)
      }
    )
  },
}

async function updateTimeouteLengthMinutes(
  minutes: number,
  reason: CommandReasonType,
  interaction: CommandInteraction
) {
  try {
    const database = mongoClient.db("camera_on")
    // @ts-ignore
    const numberSettings = database.collection<NumberSetting>("numberSettings")
    const result = await numberSettings.updateOne(
      { name: `timeoutLengthMinutes${reason}` },
      {
        $set: {
          value: minutes,
          guildId: interaction.guildId || "",
        },
      },
      { upsert: true }
    )
    log(
      `Updated timeoutLengthMinutes${reason} in mongoDB: ${result.modifiedCount} documents.`
    )
    interaction.editReply(
      `Updated timeoutLengthMinutes${reason} to ${minutes} minutes.`
    )
  } catch (err) {
    if (err instanceof Error) {
      log(err.message)
    }
  }
}
