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

// 멤버 목록 (id 포함)
export async function GET() {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/slayer_members?select=id,번호,닉네임,길드,승급,역할,용협&order=번호.asc`,
    { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` }, cache: 'no-store' }
  )
  const rows = await res.json()
  return NextResponse.json(rows.filter((r: { 닉네임: string }) => r.닉네임))
}

// 수정
export async function PATCH(req: Request) {
  const { id, 닉네임, 길드, 승급, 역할 } = await req.json()
  if (!id) return NextResponse.json({ error: 'id 필요' }, { status: 400 })

  const patch: Record<string, unknown> = {}
  if (닉네임 !== undefined) patch['닉네임'] = 닉네임
  if (길드 !== undefined) patch['길드'] = 길드
  if (승급 !== undefined) patch['승급'] = 승급
  if (역할 !== undefined) patch['역할'] = 역할 || null

  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/slayer_members?id=eq.${id}`,
    {
      method: 'PATCH',
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(patch),
    }
  )
  if (!res.ok) return NextResponse.json({ error: 'update failed' }, { status: 500 })

  const parts = [닉네임, 길드, 승급, 역할].filter(Boolean)
  await tgSend(`✏️ 멤버 수정\n${parts.join(' · ')}`)

  return NextResponse.json({ ok: true })
}

// 삭제
export async function DELETE(req: Request) {
  const { id, 닉네임 } = await req.json()
  if (!id) return NextResponse.json({ error: 'id 필요' }, { status: 400 })

  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/slayer_members?id=eq.${id}`,
    {
      method: 'DELETE',
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
    }
  )
  if (!res.ok) return NextResponse.json({ error: 'delete failed' }, { status: 500 })

  await tgSend(`🗑️ 멤버 삭제\n${닉네임 || id}`)
  return NextResponse.json({ ok: true })
}
