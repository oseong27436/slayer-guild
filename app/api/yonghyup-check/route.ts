import { NextResponse } from 'next/server'

const SUPABASE_URL = process.env.SUPABASE_URL!
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY!

export async function PATCH(req: Request) {
  const { 닉네임 } = await req.json()
  if (!닉네임) return NextResponse.json({ error: '닉네임 필수' }, { status: 400 })

  // KST 기준 오늘 날짜
  const today = new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10)

  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/slayer_members?닉네임=eq.${encodeURIComponent(닉네임)}`,
    {
      method: 'PATCH',
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 용협체크일: today }),
    }
  )

  if (!res.ok) return NextResponse.json({ error: '업데이트 실패' }, { status: 500 })
  return NextResponse.json({ ok: true, 용협체크일: today })
}
