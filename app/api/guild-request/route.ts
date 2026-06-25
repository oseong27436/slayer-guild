import { NextResponse } from 'next/server'

const SUPABASE_URL = process.env.SUPABASE_URL!
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY!
const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID

async function telegramSend(text: string, id: string) {
  if (!TELEGRAM_TOKEN || !TELEGRAM_CHAT_ID) return
  await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: TELEGRAM_CHAT_ID,
      text,
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [[
          { text: '✅ 승인', callback_data: `guild_approve:${id}` },
          { text: '❌ 거부', callback_data: `guild_reject:${id}` },
        ]],
      },
    }),
  }).catch(() => {})
}

export async function POST(req: Request) {
  const { 닉네임, 현재길드, 요청길드 } = await req.json()
  if (!닉네임 || !요청길드) return NextResponse.json({ error: '필수값 누락' }, { status: 400 })

  const today = new Date().toISOString().slice(0, 10)
  const res = await fetch(`${SUPABASE_URL}/rest/v1/slayer_guild_requests`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation',
    },
    body: JSON.stringify({ 닉네임, 현재길드: 현재길드 || '미확인', 요청길드, 상태: '대기', 요청일: today }),
  })
  if (!res.ok) return NextResponse.json({ error: '저장 실패' }, { status: 500 })

  const rows: { id: string }[] = await res.json()
  const id = rows[0]?.id ?? 'unknown'

  await telegramSend(
    `🏰 <b>길드 이동 요청</b>\n\n${닉네임}: ${현재길드 || '?'} → ${요청길드}`,
    id
  )

  return NextResponse.json({ ok: true })
}

export async function GET() {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/slayer_guild_requests?상태=eq.대기&order=요청일.asc`,
    {
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
      cache: 'no-store',
    }
  )
  const rows: { id: string; 닉네임: string; 현재길드: string; 요청길드: string; 요청일: string }[] = await res.json()
  return NextResponse.json(rows)
}

export async function PATCH(req: Request) {
  const { id, action, 닉네임, 요청길드 } = await req.json()

  await fetch(`${SUPABASE_URL}/rest/v1/slayer_guild_requests?id=eq.${id}`, {
    method: 'PATCH',
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ 상태: action === 'approve' ? '승인' : '거절' }),
  })

  if (action === 'approve' && 닉네임 && 요청길드) {
    await fetch(
      `${SUPABASE_URL}/rest/v1/slayer_members?닉네임=eq.${encodeURIComponent(닉네임)}`,
      {
        method: 'PATCH',
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 길드: 요청길드 }),
      }
    )
  }

  return NextResponse.json({ ok: true })
}
