export default function log(message) {
  const timestamp = new Date()
  console.log(`[${timestamp.toUTCString()}] ${message}`)
}
export function lerror(message) {
  const timestamp = new Date()
  console.error(`[${timestamp.toUTCString()}] ERROR: ${message}`)
}
