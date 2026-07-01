import { NextResponse } from 'next/server'

const SUPABASE_URL = process.env.SUPABASE_URL!
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY!

export async function GET() {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/slayer_weekly_totals?select=길드,주_시작일,점수&order=주_시작일.asc`,
    {
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
      cache: 'no-store',
    }
  )
  const rows = await res.json()
  return NextResponse.json(Array.isArray(rows) ? rows : [])
}

export async function POST(req: Request) {
  const entries: { 길드: string; 주_시작일: string; 점수: number }[] = await req.json()
  if (!Array.isArray(entries) || entries.length === 0) {
    return NextResponse.json({ error: '데이터 없음' }, { status: 400 })
  }

  const res = await fetch(`${SUPABASE_URL}/rest/v1/slayer_weekly_totals`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates',
    },
    body: JSON.stringify(entries),
  })

  if (!res.ok) return NextResponse.json({ error: '저장 실패' }, { status: 500 })
  return NextResponse.json({ ok: true })
}
