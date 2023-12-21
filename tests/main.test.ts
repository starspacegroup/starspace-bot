import { Agenda, Job } from "@hokify/agenda"
import { Db } from "mongodb"
import { mockMongo } from "./helpers/mock-mongodb"
import { describe, expect, test } from "@jest/globals"
import { doTriggerWarning } from "../src/bot-dispatcher"

async function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// agenda instances
let globalAgenda: Agenda
let mongoCfg: string
let mongoDb: Db

describe("Agenda", () => {
  beforeEach(async () => {
    if (!mongoDb) {
      const mockedMongo = await mockMongo()
      mongoCfg = mockedMongo.uri
      mongoDb = mockedMongo.mongo.db()
    }

    return new Promise<void>((resolve) => {
      globalAgenda = new Agenda(
        {
          mongo: mongoDb,
          processEvery: "250ms",
        },
        async () => {
          await delay(50)
          // await clearJobs()

          globalAgenda.define("warn member", (job) => {
            console.log(`warning ${job.attrs.data.memberId}`)
          })
          globalAgenda.define("disconnect member", (job) => {
            console.log(`disconnecting ${job.attrs.data.memberId}`)
          })
          globalAgenda.start()

          return resolve()
        }
      )
    })
  })

  afterEach(async () => {
    if (globalAgenda) {
      await globalAgenda.stop()
      //await clearJobs();
    }
  })

  test("warns a user", async () => {
    await doTriggerWarning("join", 1, "humble-david")

    console.log("wait...")
    await delay(1000)

    true
  })

  test("user joins and turns on camera", async () => {
    handle_event("join", "humble-david")
    // await delay(1000);
    // maybe do some asserts;
    handle_event("cameraOn", "humble-david")
    // do some asserts
  })
})

function clearJobs() {
  // throw new Error("Function not implemented.")
}
