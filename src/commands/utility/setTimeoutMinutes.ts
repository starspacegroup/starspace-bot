import mongoClient from "../../connections/mongoDb"
import NumberSetting from "../../models/numberSetting"
import { CommandInteraction, SlashCommandBuilder } from "discord.js"

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
    ),
  async execute(interaction: CommandInteraction) {
    // @ts-ignore
    const minutes = interaction.options.getNumber("minutes")
    await interaction.reply(
      `Updating timeoutLengthMinutes to ${minutes} minutes.`
    )
    await updateTimeouteLengthMinutes(minutes, interaction).catch(
      async (err) => {
        await interaction.followUp("Error updating timeoutLengthMinutes.")
        console.log(err)
      }
    )
  },
}

async function updateTimeouteLengthMinutes(
  minutes: number,
  interaction: CommandInteraction
) {
  try {
    const database = mongoClient.db("camera_on")
    // @ts-ignore
    const numberSettings = database.collection<NumberSetting>("numberSettings")
    const result = await numberSettings.updateOne(
      { name: "timeoutLengthMinutes" },
      {
        $set: {
          value: minutes,
        },
      },
      { upsert: true }
    )
    console.log(
      `Updated timeoutLengthMinutes in mongoDB: ${result.modifiedCount} documents.`
    )
    interaction.followUp(`Updated timeoutLengthMinutes to ${minutes} minutes.`)
  } catch (err) {
    if (err instanceof Error) {
      console.log(err.message)
    }
  }
}
