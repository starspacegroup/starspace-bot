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

Affirmations.push.apply(Affirmations, [
  `You are a beacon of positivity, radiating love and light to everyone you encounter. Your presence uplifts and inspires those around you, creating a ripple effect of joy and happiness.`,
  `You are worthy of all the love and abundance the universe has to offer. Your heart is open to receiving blessings in all forms, and you welcome them with gratitude and appreciation.`,
  `You are a magnet for miracles and miracles flow effortlessly into your life. Your unwavering faith and belief in the power of the universe align you with endless opportunities for growth and transformation.`,
  `You are aligned with the rhythm of the universe, and everything unfolds for your highest good. Trusting in the divine timing of your life, you surrender to the flow and embrace each moment with grace and ease.`,
  `You are a divine being, connected to the infinite wisdom of the cosmos. Your intuition is a guiding light, leading you towards your true purpose and destiny with clarity and confidence.`,
  `You are a force of nature, capable of moving mountains with your strength and determination. Your resilience knows no bounds, and you overcome any obstacle with grace and courage.`,
  `You are a shining star, illuminating the path for others with your brilliance and wisdom. Your unique gifts and talents are a blessing to the world, and you share them generously with others.`,
  `You are a masterpiece, a work of art crafted with love and intention. Your beauty lies in your imperfections, and you embrace them as a reflection of your uniqueness and authenticity.`,
  `You are a powerful creator, manifesting your dreams into reality with every thought and intention. Your imagination knows no limits, and you visualize your desires with clarity and conviction.`,
  `You are a miracle in motion, moving through life with purpose and passion. Your journey is a testament to the resilience of the human spirit, and you embrace each experience as an opportunity for growth and expansion.`,
  `You are a vessel of love and compassion, sharing your light with the world. Your kindness touches the hearts of those around you, bringing comfort and healing to those in need.`,
  `You are a fountain of joy, bubbling with laughter and happiness. Your zest for life is contagious, and you spread smiles wherever you go, brightening even the darkest of days.`,
  `You are a beacon of strength and courage, standing tall in the face of adversity. Your inner fortitude inspires others to find their own courage within, empowering them to overcome their challenges with grace and resilience.`,
  `You are a miracle worker, turning obstacles into opportunities with your positive mindset and unwavering faith. Your belief in the power of possibility fuels your journey towards greatness, and you manifest miracles with ease and grace.`,
  `You are a treasure trove of wisdom and insight, tapping into the vast reservoir of knowledge within. Your experiences are lessons to be learned, and you glean wisdom from every moment, enriching your life and the lives of those around you.`,
  `You are a champion of love, spreading kindness and compassion wherever you go. Your heart is a beacon of light in a world of darkness, and you nurture connections that uplift and inspire others to be their best selves.`,
])

// From Rhi (found on web?)
Affirmations.push.apply(Affirmations, [
  `You are in the right place at the right time, doing the right thing.`,
  `You are loved just for being who you are, just for existing.`,
  `The chance to love and be loved exists no matter where you are.`,
  `Courage starts with showing up and letting yourself be seen.`,
  `Make way for the unprecedented and watch your reality rearrange itself.`,
  `Open your heart and drink in this glorious day.`,
  `Are you good enough? Yes, you are.`,
  `The perfect moment is this one.`,
  `You are deliberate and afraid of nothing.`,
  `Your life is about to be incredible.`,
  `Who you are inside is what helps you make and do everything in life.`,
  `Your perspective is unique. It’s important and it counts.`,
  `Every day above earth is a good day.`,
  `Nothing can dim the light that shines from within.`,
  `You must do the things you think you cannot do.`,
  `The secret of attraction is to love yourself.`,
  `Good riddance to decisions that don’t support self-care, self-value, and self-worth.`,
  `You are the greatest. You said that even before you knew you were.`,
  `Looking on the bright side of like never killed anybody.`,
  `You’re better than you used to be. Better than you were yesterday. But hopefully not as good as you’ll be tomorrow.`,
  `You have never ever focused on the negative of things. You always look at the positive.`,
  `I’m giving you permission to root for yourself and while you’re at it root for those around you, too.`,
  `We must accept finite disappointment, but never lose infinite hope.`,
  `Your life is already a miracle of chance waiting for you to shape its destiny.`,
  `If you really think small, your world will be small. If you think big, your world will be big.`,
  `Embrace the glorious mess that you are.`,
  `The ultimate truth of who you are is not I am this or I am that, but I AM.`,
  `Gratitude is a celebration we are all invited to.`,
  `We must be willing to let go of the life we planned so as to have the life that is waiting for us.`,
  `Nothing is impossible. The word itself says “I’m possible!”`,
  `The only courage you ever need is the courage to fulfill the dreams of your own life.`,
  `Failure is just another way to learn how to do something right.`,
  `The emotion that can break your heart is sometimes the very one that heals it.`,
  `Your crown has been bought and paid for. Put it on your head and wear it.`,
  `Everything passes if you learn to hold things lightly.`,
  `Write it on your heart that everyday is the best day in the year.`,
  `Hold up your head! You were not made for failure, you were made for victory.`,
  `If you have good thoughts they will shine out of your face like sunbeams and you will always look lovely.`,
  `There is nothing either good or bad, but thinking makes it so.`,
  `The potential that you see in others is just a reflection of what you would do in that situation. Stop giving people chances and start giving them boundaries.`,
])
