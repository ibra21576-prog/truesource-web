import { SignJWT, jwtVerify } from 'jose'
import type { NextRequest } from 'next/server'

const secret = () => new TextEncoder().encode(process.env.SESSION_SECRET?.trim() || 'fallback-change-me')

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

export function getRequestToken(req: NextRequest): string {
  const authorization = req.headers.get('authorization') || ''
  const bearer = authorization.startsWith('Bearer ') ? authorization.slice(7).trim() : ''
  return bearer || req.nextUrl.searchParams.get('t') || req.cookies.get('session')?.value || ''
}

export async function getRequestSession(req: NextRequest): Promise<SessionPayload | null> {
  const token = getRequestToken(req)
  return token ? verifySession(token) : null
}
