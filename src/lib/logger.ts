import { env } from "process"

export default function log(message: any) {
  const timestamp = new Date()
  if (env.NODE_ENV !== "production") {
    console.log(`[${timestamp.toUTCString()}] ${message}`)
    return
  }
  console.log(`${message}`)
}

export function lerror(message: any) {
  const timestamp = new Date()
  if (env.NODE_ENV !== "production") {
    console.error(`[${timestamp.toUTCString()}] ERROR: ${message}`)
    return
  }
  console.error(`ERROR: ${message}`)
}
