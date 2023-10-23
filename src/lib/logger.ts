export default function log(message: string) {
  const timestamp = new Date()
  console.log(`[${timestamp.toUTCString()}] ${message}`)
}
