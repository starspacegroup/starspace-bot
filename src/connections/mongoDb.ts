import { MongoClient, ServerApiVersion } from "mongodb"
const mongoUser = process.env.MONGO_USER
const mongoPass = process.env.MONGO_PASS
const mongoDb = process.env.MONGO_DB
const uri = `mongodb+srv://${mongoUser}:${mongoPass}@cameraon.ihn5vri.mongodb.net/${mongoDb}?retryWrites=true&w=majority`

const mongoClient = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
})

process.on("SIGINT", async () => {
  await mongoClient.close()
})
process.on("SIGTERM", async () => {
  await mongoClient.close()
})
export default mongoClient
