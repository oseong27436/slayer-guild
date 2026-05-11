import { NextResponse } from 'next/server'

const TOKEN = process.env.NOTION_TOKEN
const MEMBERS_DB = process.env.NOTION_MEMBERS_DB_ID
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

interface RecordItem {
  nickname: string
  score: number
}

async function notionApi(method: string, url: string, body?: object) {
  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      'Notion-Version': '2022-06-28',
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
    cache: 'no-store',
  })
  const json = await res.json()
  if (!res.ok) throw new Error(json.message || `Notion ${res.status}`)
  return json
}

async function supabaseUpsert(records: RecordItem[], date: string) {
  const rows = records.map(({ nickname, score }) => ({
    member_name: nickname,
    recorded_date: date,
    score,
  }))
  const res = await fetch(`${SUPABASE_URL}/rest/v1/slayer_history`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates',
    },
    body: JSON.stringify(rows),
  })
  if (!res.ok) throw new Error(`Supabase ${res.status}`)
}

export async function POST(req: Request) {
  try {
    const { records, date } = (await req.json()) as { records: RecordItem[]; date: string }

    // Supabase 히스토리 upsert
    await supabaseUpsert(records, date)

    // 멤버 DB 용협 필드 업데이트
    const membersRes = await notionApi(
      'POST',
      `https://api.notion.com/v1/databases/${MEMBERS_DB}/query`,
      { page_size: 100 }
    )
    const scoreMap = Object.fromEntries(records.map((r) => [r.nickname, r.score]))

    await Promise.all(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      membersRes.results
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .filter((page: any) => {
          const name = page.properties['닉네임']?.title?.[0]?.plain_text || ''
          return name in scoreMap
        })
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .map((page: any) => {
          const name = page.properties['닉네임']?.title?.[0]?.plain_text || ''
          return notionApi('PATCH', `https://api.notion.com/v1/pages/${page.id}`, {
            properties: { 용협: { number: scoreMap[name] } },
          })
        })
    )

    const lines = records
      .sort((a, b) => b.score - a.score)
      .map(({ nickname, score }) => `  ${nickname}: ${score.toLocaleString()}`)
      .join('\n')
    await tgSend(`📊 용협 점수 저장 (${date})\n\n${lines}\n\n총 ${records.length}명`)

    return NextResponse.json({ ok: true, count: records.length })
  } catch (err) {
    console.error('Record error:', err)
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}
