import mongoClient from "../../connections/mongoDb"
import log from "../../lib/logger"
import NumberSetting from "../../models/numberSetting"
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
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),
  async execute(interaction: CommandInteraction) {
    // @ts-ignore
    const seconds = interaction.options.getNumber("seconds")
    await interaction.deferReply()
    await updateJoinTimeSeconds(seconds, interaction).catch(async (err) => {
      await interaction.editReply("Error updating botJoinSeconds.")
      log(err)
    })
  },
}

async function updateJoinTimeSeconds(
  seconds: number,
  interaction: CommandInteraction
) {
  try {
    const database = mongoClient.db("camera_on")
    // @ts-ignore
    const numberSettings = database.collection<NumberSetting>("numberSettings")
    const result = await numberSettings.updateOne(
      { name: "botJoinSeconds" },
      {
        $set: {
          value: seconds,
        },
      },
      { upsert: true }
    )
    log(`Updated botJoinSeconds in mongoDB: ${result.modifiedCount} documents.`)
    interaction.editReply(`Updated botJoinSeconds to ${seconds} seconds.`)
  } catch (err) {
    if (err instanceof Error) {
      log(err.message)
    }
  }
}
