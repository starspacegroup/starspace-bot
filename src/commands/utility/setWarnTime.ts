import mongoClient from "../../connections/mongoDb"
import log from "../../lib/logger"
import NumberSetting from "../../models/numberSetting"
import { CommandReasonType } from "../../models/commandReasonTypes"
import {
  CommandInteraction,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from "discord.js"

export const setwarntime = {
  command: new SlashCommandBuilder()
    .setName("setwarntime")
    .setDescription("Sets the number of seconds before bot joins VC")
    .addNumberOption((option) =>
      option
        .setName("seconds")
        .setDescription("The number of seconds")
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
    const seconds = interaction.options.getNumber("seconds")
    const reason =
      // @ts-ignore
      interaction.options.getString("reason")
    await interaction.deferReply()
    await updateJoinTimeSeconds(seconds, reason, interaction).catch(
      async (err) => {
        await interaction.editReply(`Error updating botJoinSeconds${reason}.`)
        log(err)
      }
    )
  },
}

async function updateJoinTimeSeconds(
  seconds: number,
  reason: CommandReasonType,
  interaction: CommandInteraction
) {
  try {
    const database = mongoClient.db("camera_on")
    // @ts-ignore
    const numberSettings = database.collection<NumberSetting>("numberSettings")
    const result = await numberSettings.updateOne(
      { name: `botJoinSeconds${reason}` },
      {
        $set: {
          value: seconds,
          guildId: interaction.guildId || "",
        },
      },
      { upsert: true }
    )
    log(
      `Updated botJoinSeconds${reason} in mongoDB: ${result.modifiedCount} documents.`
    )
    interaction.editReply(
      `Updated botJoinSeconds${reason} to ${seconds} seconds.`
    )
  } catch (err) {
    if (err instanceof Error) {
      log(err.message)
    }
  }
}
