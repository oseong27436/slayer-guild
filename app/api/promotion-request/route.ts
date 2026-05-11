import { NextResponse } from 'next/server'

const NOTION_TOKEN = process.env.NOTION_TOKEN
const REQUEST_DB_ID = '35267569-a19a-81aa-afaf-c201bfd132e3'
const SUPABASE_URL = process.env.SUPABASE_URL!
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY!
const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID

async function notionApi(method: string, url: string, body?: object) {
  const res = await fetch(url, {
    method,
    headers: {
      'Authorization': `Bearer ${NOTION_TOKEN}`,
      'Notion-Version': '2022-06-28',
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
    cache: 'no-store',
  })
  return res.json()
}

async function telegramSend(text: string) {
  if (!TELEGRAM_TOKEN || !TELEGRAM_CHAT_ID) return
  await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text }),
  }).catch(() => {})
}

// 요청 제출
export async function POST(req: Request) {
  const { 닉네임, 현재승급, 요청승급 } = await req.json()
  if (!닉네임 || !요청승급) return NextResponse.json({ error: '필수값 누락' }, { status: 400 })

  const today = new Date().toISOString().slice(0, 10)
  await notionApi('POST', 'https://api.notion.com/v1/pages', {
    parent: { database_id: REQUEST_DB_ID },
    properties: {
      닉네임:   { title: [{ text: { content: 닉네임 } }] },
      현재승급: { select: { name: 현재승급 || '미확인' } },
      요청승급: { select: { name: 요청승급 } },
      상태:     { select: { name: '대기' } },
      요청일:   { date: { start: today } },
    },
  })

  await telegramSend(`⬆️ 승급 변경 요청\n\n${닉네임}: ${현재승급 || '?'} → ${요청승급}\n\n슬레이어 길드 관리자 페이지에서 승인해주세요.`)

  return NextResponse.json({ ok: true })
}

// 대기 요청 목록
export async function GET() {
  const data = await notionApi('POST', `https://api.notion.com/v1/databases/${REQUEST_DB_ID}/query`, {
    filter: { property: '상태', select: { equals: '대기' } },
    sorts: [{ property: '요청일', direction: 'ascending' }],
  })
  const requests = (data.results || []).map((p: any) => ({
    id: p.id,
    닉네임: p.properties['닉네임']?.title?.[0]?.plain_text || '',
    현재승급: p.properties['현재승급']?.select?.name || '',
    요청승급: p.properties['요청승급']?.select?.name || '',
    요청일: p.properties['요청일']?.date?.start || '',
  }))
  return NextResponse.json(requests)
}

// 승인/거절
export async function PATCH(req: Request) {
  const { id, action, 닉네임, 요청승급 } = await req.json()

  // 요청 상태 업데이트
  await notionApi('PATCH', `https://api.notion.com/v1/pages/${id}`, {
    properties: { 상태: { select: { name: action === 'approve' ? '승인' : '거절' } } },
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
