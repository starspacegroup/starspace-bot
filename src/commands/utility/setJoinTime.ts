import mongoClient from "../../connections/mongoDb"
import TimeSetting from "../../models/timeSetting"
import { CommandInteraction, SlashCommandBuilder } from "discord.js"

export const data = new SlashCommandBuilder()
  .setName("setjointime")
  .setDescription("Sets the number of seconds before bot joins VC")
  .addNumberOption((option) =>
    option.setName("seconds").setDescription("The number of seconds")
  )

export async function execute(interaction: CommandInteraction) {
  // @ts-ignore
  const seconds = interaction.options.getNumber("seconds")
  await interaction.reply(`Updating botJoin to ${seconds} seconds.`)
  await updateJoinTime(seconds, interaction).catch(async (err) => {
    await interaction.followUp("Error updating botJoin.")
    console.log(err)
  })
}

async function updateJoinTime(seconds, interaction) {
  try {
    const database = mongoClient.db("camera_on")
    // @ts-ignore
    const timeSettings = database.collection<TimeSetting>("timeSettings")
    const result = await timeSettings.updateOne(
      { name: "botJoin" },
      {
        $set: {
          value: seconds,
        },
      },
      { upsert: true }
    )
    console.log(
      `Updated botJoin in mongoDB: ${result.modifiedCount} documents.`
    )
  } catch (err) {
    if (err instanceof Error) {
      console.log(err.message)
    }
  }
}
