import { NextResponse } from 'next/server'

const SUPABASE_URL = process.env.SUPABASE_URL!
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY!
const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID

async function telegramSendWithButtons(text: string, id: string, 닉네임: string, 요청승급: string) {
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
          { text: '✅ 승인', callback_data: `approve:${id}` },
          { text: '❌ 거부', callback_data: `reject:${id}` },
        ]],
      },
    }),
  }).catch(() => {})
}

// 요청 제출
export async function POST(req: Request) {
  const { 닉네임, 현재승급, 요청승급 } = await req.json()
  if (!닉네임 || !요청승급) return NextResponse.json({ error: '필수값 누락' }, { status: 400 })

  const today = new Date().toISOString().slice(0, 10)
  const res = await fetch(`${SUPABASE_URL}/rest/v1/slayer_promotion_requests`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation',
    },
    body: JSON.stringify({ 닉네임, 현재승급: 현재승급 || '미확인', 요청승급, 상태: '대기', 요청일: today }),
  })
  if (!res.ok) return NextResponse.json({ error: '저장 실패' }, { status: 500 })

  const rows: { id: string }[] = await res.json()
  const id = rows[0]?.id ?? 'unknown'

  await telegramSendWithButtons(
    `⬆️ <b>승급 변경 요청</b>\n\n${닉네임}: ${현재승급 || '?'} → ${요청승급}`,
    id, 닉네임, 요청승급
  )

  return NextResponse.json({ ok: true })
}

// 대기 요청 목록
export async function GET() {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/slayer_promotion_requests?상태=eq.대기&order=요청일.asc`,
    {
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
      cache: 'no-store',
    }
  )
  const rows: { id: string; 닉네임: string; 현재승급: string; 요청승급: string; 요청일: string }[] = await res.json()
  return NextResponse.json(rows)
}

// 승인/거절
export async function PATCH(req: Request) {
  const { id, action, 닉네임, 요청승급 } = await req.json()

  // 요청 상태 업데이트
  await fetch(`${SUPABASE_URL}/rest/v1/slayer_promotion_requests?id=eq.${id}`, {
    method: 'PATCH',
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ 상태: action === 'approve' ? '승인' : '거절' }),
  })

  // 승인이면 Supabase 멤버 승급 업데이트
  if (action === 'approve' && 닉네임 && 요청승급) {
    await fetch(
      `${SUPABASE_URL}/rest/v1/slayer_members?닉네임=eq.${encodeURIComponent(닉네임)}`,
      {
        method: 'PATCH',
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 승급: 요청승급 }),
      }
    )
  }

  return NextResponse.json({ ok: true })
}
