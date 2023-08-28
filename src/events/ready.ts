import { Events } from "discord.js"
import log from "../lib/logger"

module.exports = {
  name: Events.ClientReady,
  once: true,
  execute(client) {
    log(`Ready! Logged in as ${client.user.tag}`)
  },
}
