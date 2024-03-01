import log from "../../lib/logger"
import {
  CommandInteraction,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from "discord.js"

export const affirmation = {
  command: new SlashCommandBuilder()
    .setName("affirmation")
    .setDescription("Sends user an affirmation.")
    .addUserOption((option) =>
      option.setName("user").setDescription("The user to give affirmation to")
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.SendMessages),
  async execute(interaction: CommandInteraction) {
    // @ts-ignore
    const user = interaction.options.getUser("user") ?? interaction.user
    // Get random Affirmation:
    const randomAffirmation =
      Affirmations[Math.floor(Math.random() * Affirmations.length)]
    await interaction.reply(`${user} ${randomAffirmation}`)
    log(`${user.tag} has been insulted in ${interaction.guild?.name}.`)
  },
}

let Affirmations = [
  `You are beautiful, inside and out. Your inner light shines brightly, illuminating the world around you. I am proud of the person you are becoming.`,
  `You are capable of achieving anything you set your mind to. Your determination and perseverance know no bounds. I believe in your abilities wholeheartedly.`,
  `You radiate positivity and kindness wherever you go. Your compassionate heart touches the lives of those around you, spreading joy and warmth.`,
  `You are worthy of love and happiness. You deserve all the good things life has to offer, and I know you will seize every opportunity with grace and gratitude.`,
  `You are strong and resilient, capable of overcoming any challenge that comes your way. With every obstacle you face, you emerge even more powerful and unstoppable.`,
  `You are surrounded by abundance and blessings. The universe conspires in your favor, guiding you towards success and fulfillment in every aspect of your life.`,
  `You are loved deeply and unconditionally. Your presence brightens the lives of those around you, filling their hearts with joy and gratitude.`,
  `You are enough, just as you are. Your worth is not determined by external validation, but by the unique qualities that make you who you are. Embrace your authenticity with pride.`,
  `You are a beacon of hope and inspiration to others. Your words and actions have the power to uplift and empower those in need, making a meaningful difference in their lives.`,
  `You are the architect of your own destiny. With vision and purpose, you shape the course of your life, manifesting your dreams into reality with unwavering faith and determination.`,
  `You are a masterpiece in progress, constantly evolving and growing into the best version of yourself. Embrace the journey of self-discovery with courage and curiosity, knowing that each step forward brings you closer to your fullest potential.`,
  `You are a magnet for success and prosperity. Your positive mindset and unwavering belief in yourself attract limitless opportunities for growth and abundance into your life.`,
  `You are a radiant soul, bursting with creativity and passion. Your unique gifts and talents enrich the world, leaving a lasting legacy of beauty and inspiration for generations to come.`,
  `You are the captain of your own happiness. By choosing gratitude and embracing life's blessings, you create a reality filled with joy, love, and fulfillment.`,
  `You are a warrior of light, fearlessly shining your truth into the world. Your courage and authenticity inspire others to break free from darkness and embrace the brilliance of their own existence.`,
  `You are worthy of all the love and joy the universe has to offer. Open your heart to receive the abundance that surrounds you, knowing that you are infinitely deserving of life's greatest blessings.`,
]

// Affirmations.push.apply(Affirmations, [
// ])
