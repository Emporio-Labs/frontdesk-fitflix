/**
 * Fetches a server-minted ZEGOCLOUD token for the given user.
 *
 * Always use this rather than ZegoUIKitPrebuilt.generateKitTokenForTest: that
 * helper's second argument is the 32-char ServerSecret (not the 64-char
 * AppSign), and minting tokens in the browser would ship that secret in client
 * JS. The secret stays server-side in app/api/zego-token/route.ts.
 */
export async function fetchZegoToken(userID: string): Promise<string> {
  const res = await fetch('/api/zego-token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userID }),
  })

  if (!res.ok) {
    const body = await res.json().catch(() => null)
    throw new Error(body?.message || 'Failed to fetch ZEGOCLOUD token from server.')
  }

  const { token } = await res.json()

  if (!token) {
    throw new Error('ZEGOCLOUD token response was empty.')
  }

  return token
}
