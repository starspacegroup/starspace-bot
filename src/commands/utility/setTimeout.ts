import mongoClient from "../../connections/mongoDb"
import NumberSetting from "../../models/numberSetting"
import { CommandInteraction, SlashCommandBuilder } from "discord.js"

export const settimeout = {
  command: new SlashCommandBuilder()
    .setName("settimeout")
    .setDescription("Sets the number of infractions before bot times out user")
    .addNumberOption((option) =>
      option
        .setName("infractions")
        .setDescription("The number of infractions")
        .setRequired(true)
    ),
  async execute(interaction: CommandInteraction) {
    // @ts-ignore
    const infractions = interaction.options.getNumber("infractions")
    await interaction.reply(
      `Updating userTimeoutAfterXInfractions to ${infractions} infractions.`
    )
    await updateJoinTime(infractions, interaction).catch(async (err) => {
      await interaction.followUp("Error updating userTimeoutAfterXInfractions.")
      console.log(err)
    })
  },
}

async function updateJoinTime(
  infractions: number,
  interaction: CommandInteraction
) {
  try {
    const database = mongoClient.db("camera_on")
    // @ts-ignore
    const numberSettings = database.collection<NumberSetting>("numberSettings")
    const result = await numberSettings.updateOne(
      { name: "userTimeoutAfterXInfractions" },
      {
        $set: {
          value: infractions,
        },
      },
      { upsert: true }
    )
    console.log(
      `Updated userTimeoutAfterXInfractions in mongoDB: ${result.modifiedCount} documents.`
    )
    interaction.followUp(
      `Updated userTimeoutAfterXInfractions to ${infractions} infractions.`
    )
  } catch (err) {
    if (err instanceof Error) {
      console.log(err.message)
    }
  }
}
