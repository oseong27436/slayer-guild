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

interface RecordItem {
  nickname: string
  score: number
}

async function supabaseUpsertHistory(records: RecordItem[], date: string) {
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
  if (!res.ok) throw new Error(`Supabase history ${res.status}`)
}

async function supabaseUpdateScores(records: RecordItem[]) {
  await Promise.all(
    records.map(({ nickname, score }) =>
      fetch(
        `${SUPABASE_URL}/rest/v1/slayer_members?닉네임=eq.${encodeURIComponent(nickname)}`,
        {
          method: 'PATCH',
          headers: {
            apikey: SUPABASE_KEY,
            Authorization: `Bearer ${SUPABASE_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 용협: score }),
        }
      )
    )
  )
}

export async function POST(req: Request) {
  try {
    const { records, date } = (await req.json()) as { records: RecordItem[]; date: string }

    await Promise.all([
      supabaseUpsertHistory(records, date),
      supabaseUpdateScores(records),
    ])

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
