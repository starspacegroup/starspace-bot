import mongoClient from "../../connections/mongoDb"
import NumberSetting from "../../models/numberSetting"
import { CommandInteraction, SlashCommandBuilder } from "discord.js"

export const setwarntime = {
  command: new SlashCommandBuilder()
    .setName("setwarntime")
    .setDescription("Sets the number of seconds before bot joins VC")
    .addNumberOption((option) =>
      option
        .setName("seconds")
        .setDescription("The number of seconds")
        .setRequired(true)
    ),
  async execute(interaction: CommandInteraction) {
    // @ts-ignore
    const seconds = interaction.options.getNumber("seconds")
    await interaction.reply(`Updating botJoinSeconds to ${seconds} seconds.`)
    await updateJoinTime(seconds, interaction).catch(async (err) => {
      await interaction.followUp("Error updating botJoinSeconds.")
      console.log(err)
    })
  },
}

async function updateJoinTime(
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
    console.log(
      `Updated botJoinSeconds in mongoDB: ${result.modifiedCount} documents.`
    )
    interaction.followUp(`Updated botJoinSeconds to ${seconds} seconds.`)
  } catch (err) {
    if (err instanceof Error) {
      console.log(err.message)
    }
  }
}
