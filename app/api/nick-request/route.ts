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
          { text: '✅ 승인', callback_data: `nick_approve:${id}` },
          { text: '❌ 거부', callback_data: `nick_reject:${id}` },
        ]],
      },
    }),
  }).catch(() => {})
}

export async function POST(req: Request) {
  const { 현재닉네임, 요청닉네임, 사유 } = await req.json()
  if (!현재닉네임 || !요청닉네임) return NextResponse.json({ error: '필수값 누락' }, { status: 400 })

  const today = new Date().toISOString().slice(0, 10)
  const res = await fetch(`${SUPABASE_URL}/rest/v1/slayer_nick_requests`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation',
    },
    body: JSON.stringify({ 현재닉네임, 요청닉네임, 사유: 사유 || null, 상태: '대기', 요청일: today }),
  })
  if (!res.ok) return NextResponse.json({ error: '저장 실패' }, { status: 500 })

  const rows: { id: string }[] = await res.json()
  const id = rows[0]?.id ?? 'unknown'

  const text = 사유
    ? `✏️ <b>닉네임 변경 요청</b>\n\n${현재닉네임} → ${요청닉네임}\n사유: ${사유}`
    : `✏️ <b>닉네임 변경 요청</b>\n\n${현재닉네임} → ${요청닉네임}`
  await telegramSend(text, id)

  return NextResponse.json({ ok: true })
}

export async function GET() {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/slayer_nick_requests?상태=eq.대기&order=요청일.asc`,
    {
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
      cache: 'no-store',
    }
  )
  const rows: { id: string; 현재닉네임: string; 요청닉네임: string; 사유: string | null; 요청일: string }[] = await res.json()
  return NextResponse.json(rows)
}

export async function PATCH(req: Request) {
  const { id, action, 현재닉네임, 요청닉네임 } = await req.json()

  await fetch(`${SUPABASE_URL}/rest/v1/slayer_nick_requests?id=eq.${id}`, {
    method: 'PATCH',
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ 상태: action === 'approve' ? '승인' : '거절' }),
  })

  if (action === 'approve' && 현재닉네임 && 요청닉네임) {
    // slayer_members 닉네임 변경
    await fetch(`${SUPABASE_URL}/rest/v1/slayer_members?닉네임=eq.${encodeURIComponent(현재닉네임)}`, {
      method: 'PATCH',
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ 닉네임: 요청닉네임 }),
    })
    // slayer_history member_name 변경
    await fetch(`${SUPABASE_URL}/rest/v1/slayer_history?member_name=eq.${encodeURIComponent(현재닉네임)}`, {
      method: 'PATCH',
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ member_name: 요청닉네임 }),
    })
    // slayer_promotion_requests 닉네임 변경
    await fetch(`${SUPABASE_URL}/rest/v1/slayer_promotion_requests?닉네임=eq.${encodeURIComponent(현재닉네임)}`, {
      method: 'PATCH',
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ 닉네임: 요청닉네임 }),
    })
    // slayer_guild_requests 닉네임 변경
    await fetch(`${SUPABASE_URL}/rest/v1/slayer_guild_requests?닉네임=eq.${encodeURIComponent(현재닉네임)}`, {
      method: 'PATCH',
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ 닉네임: 요청닉네임 }),
    })
  }

  return NextResponse.json({ ok: true })
}
