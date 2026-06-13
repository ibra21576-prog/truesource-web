import { SignJWT, jwtVerify } from 'jose'

const secret = () => new TextEncoder().encode(process.env.SESSION_SECRET ?? 'fallback-change-me')

export interface SessionPayload {
  userId: string
  username: string
  memberSince?: string
}

export async function createSession(userId: string, username: string, memberSince?: string): Promise<string> {
  return new SignJWT({ userId, username, memberSince })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('24h')
    .sign(secret())
}

export async function verifySession(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secret())
    return {
      userId:      payload.userId as string,
      username:    payload.username as string,
      memberSince: payload.memberSince as string | undefined,
    }
  } catch {
    return null
  }
}
