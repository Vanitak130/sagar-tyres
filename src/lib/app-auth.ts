import config from '@payload-config'
import { getPayload } from 'payload'
import { cookies } from 'next/headers'

const COOKIE = 'app-session'

export async function currentUser() {
  const token = (await cookies()).get(COOKIE)?.value
  if (!token) return null
  const payload = await getPayload({ config })
  const headers = new Headers({ Authorization: `JWT ${token}` })
  const { user } = await payload.auth({ headers })
  return user?.collection === 'users' ? user : null
}

export async function loginUser(email: string, password: string) {
  const payload = await getPayload({ config })
  const result = await payload.login({
    collection: 'users',
    data: { email, password },
  })
  if (!result.token) throw new Error('Login did not return a session token.')
  ;(await cookies()).set(COOKIE, result.token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  })
  return result.user
}

export async function logoutUser() {
  ;(await cookies()).delete(COOKIE)
}
