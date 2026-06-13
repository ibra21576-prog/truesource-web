import { SignJWT, jwtVerify } from 'jose'

const secret = () => new TextEncoder().encode(process.env.SESSION_SECRET ?? 'fallback-change-me')

export async function createSession(userId: string, username: string): Promise<string> {
  return new SignJWT({ userId, username })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(secret())
}

export async function verifySession(token: string): Promise<{ userId: string; username: string } | null> {
  try {
    const { payload } = await jwtVerify(token, secret())
    return { userId: payload.userId as string, username: payload.username as string }
  } catch {
    return null
  }
}
