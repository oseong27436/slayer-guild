import { NextResponse } from 'next/server'

const SUPABASE_URL = process.env.SUPABASE_URL!
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY!
const TG_TOKEN = '8091687172:AAGbQjeCzAxzBNg-2azPlUOmedgJydyMt5M'
const TG_CHAT = '8613313428'

async function tgSend(text: string) {
  await fetch(`https://api.telegram.org/bot${TG_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: TG_CHAT, text }),
  }).catch(() => {})
}

export async function POST(req: Request) {
  try {
    const { 닉네임, 길드, 승급, 역할 } = await req.json()
    if (!닉네임 || !길드 || !승급) return NextResponse.json({ error: '필수값 누락' }, { status: 400 })

    // 현재 최대 번호 조회
    const maxRes = await fetch(
      `${SUPABASE_URL}/rest/v1/slayer_members?select=번호&order=번호.desc&limit=1`,
      { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` }, cache: 'no-store' }
    )
    const maxRows: { 번호: number }[] = await maxRes.json()
    const newNum = (maxRows[0]?.번호 ?? 0) + 1

    const row: Record<string, unknown> = { 번호: newNum, 닉네임, 길드, 승급 }
    if (역할) row['역할'] = 역할

    const insertRes = await fetch(`${SUPABASE_URL}/rest/v1/slayer_members`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
      },
      body: JSON.stringify(row),
    })
    if (!insertRes.ok) {
      const err = await insertRes.json()
      throw new Error(err.message || `Supabase ${insertRes.status}`)
    }

    const roleLabel = 역할 ? ` · ${역할}` : ''
    await tgSend(`👤 멤버 추가\n${닉네임} (${길드} · ${승급}${roleLabel})`)

    return NextResponse.json({ ok: true, 번호: newNum })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error('add-member failed:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
