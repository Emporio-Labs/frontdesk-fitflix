/**
 * ZEGOCLOUD server-side token (Token04) generator.
 *
 * Vendored from ZEGOCLOUD's official Node.js "Generate a token on your server"
 * sample (https://docs.zegocloud.com/article/11649) so we don't add an npm
 * dependency. Uses Node's built-in `crypto` (AES-128/192/256-CBC depending on
 * ServerSecret length) — MUST run server-side only; never import into client code.
 *
 * The ServerSecret must never reach the browser. Read it from `ZEGO_SERVER_SECRET`
 * (no NEXT_PUBLIC_ prefix) inside a route handler, and return only the generated token.
 */
import crypto from 'crypto'

export enum ErrorCode {
  success = 0,
  appIDInvalid = 1,
  userIDInvalid = 3,
  secretInvalid = 5,
  effectiveTimeInSecondsInvalid = 6,
}

function makeNonce(): number {
  return Math.floor(Math.random() * (2147483647 * 2 + 1)) - 2147483647
}

function makeRandomIv(): string {
  const chars = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'
  let result = ''
  for (let i = 0; i < 16; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

/** Pick AES-CBC variant from key length (16/24/32 bytes). */
function getAlgorithm(keyBase64: string): string {
  const key = Buffer.from(keyBase64)
  switch (key.length) {
    case 16:
      return 'aes-128-cbc'
    case 24:
      return 'aes-192-cbc'
    case 32:
      return 'aes-256-cbc'
    default:
      throw new Error('Invalid ServerSecret length: ' + key.length)
  }
}

function aesEncrypt(plainText: string, key: string, iv: string): ArrayBuffer {
  const cipher = crypto.createCipheriv(getAlgorithm(key), key, iv)
  cipher.setAutoPadding(true)
  const encrypted = cipher.update(plainText)
  const final = cipher.final()
  const out = Buffer.concat([encrypted, final])
  return Uint8Array.from(out).buffer
}

/**
 * Generate a ZEGO Token04 for a given user.
 *
 * @param appId   Numeric ZEGO AppID.
 * @param userId  The user's ID (must match the userID passed to the UIKit).
 * @param secret  32-char ServerSecret from the ZEGO console.
 * @param effectiveTimeInSeconds Token TTL in seconds (e.g. 3600).
 * @param payload Optional privilege payload; '' grants default RTC access for UIKit.
 */
export function generateToken04(
  appId: number,
  userId: string,
  secret: string,
  effectiveTimeInSeconds: number,
  payload = ''
): string {
  if (!appId || typeof appId !== 'number') {
    throw { errorCode: ErrorCode.appIDInvalid, errorMessage: 'appID invalid' }
  }
  if (!userId || typeof userId !== 'string') {
    throw { errorCode: ErrorCode.userIDInvalid, errorMessage: 'userId invalid' }
  }
  if (!secret || typeof secret !== 'string' || secret.length !== 32) {
    throw { errorCode: ErrorCode.secretInvalid, errorMessage: 'secret must be a 32 byte string' }
  }
  if (!effectiveTimeInSeconds || typeof effectiveTimeInSeconds !== 'number') {
    throw {
      errorCode: ErrorCode.effectiveTimeInSecondsInvalid,
      errorMessage: 'effectiveTimeInSeconds invalid',
    }
  }

  const createTime = Math.floor(new Date().getTime() / 1000)
  const tokenInfo = {
    app_id: appId,
    user_id: userId,
    nonce: makeNonce(),
    ctime: createTime,
    expire: createTime + effectiveTimeInSeconds,
    payload: payload || '',
  }

  // Encrypt tokenInfo with AES-CBC.
  const plaintText = JSON.stringify(tokenInfo)
  const iv = makeRandomIv()
  const encryptBuf = aesEncrypt(plaintText, secret, iv)

  // Concatenate: expire(8) + iv.length(2) + iv + encrypt.length(2) + encrypt
  const b1 = new Uint8Array(8)
  const b2 = new Uint8Array(2)
  const b3 = new Uint8Array(2)
  new DataView(b1.buffer).setBigInt64(0, BigInt(tokenInfo.expire), false)
  new DataView(b2.buffer).setUint16(0, iv.length, false)
  new DataView(b3.buffer).setUint16(0, encryptBuf.byteLength, false)

  const buf = Buffer.concat([
    Buffer.from(b1),
    Buffer.from(b2),
    Buffer.from(iv),
    Buffer.from(b3),
    Buffer.from(encryptBuf),
  ])

  // Version prefix '04' + base64 of the packed buffer.
  return '04' + Buffer.from(buf).toString('base64')
}
