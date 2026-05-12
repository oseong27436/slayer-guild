import { NextResponse } from 'next/server'

const MANAGER_PASSWORD = '26452645'

export async function POST(req: Request) {
  const { password } = await req.json()

  const isMaster = password === process.env.ADMIN_PASSWORD
  const isManager = password === MANAGER_PASSWORD

  if (!isMaster && !isManager) {
    return NextResponse.json({ error: '비밀번호가 틀렸습니다' }, { status: 401 })
  }

  const role = isMaster ? 'master' : 'manager'
  const res = NextResponse.json({ ok: true })
  const cookieOpts = { httpOnly: true, sameSite: 'lax' as const, maxAge: 60 * 60 * 24 * 30 }
  res.cookies.set('admin_auth', password, cookieOpts)
  res.cookies.set('admin_role', role, { ...cookieOpts, httpOnly: false })
  return res
}
