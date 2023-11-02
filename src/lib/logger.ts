export default function log(message) {
  const timestamp = new Date()
  console.log(`[${timestamp.toUTCString()}] ${message}`)
}
