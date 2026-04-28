import { NextResponse } from 'next/server'

export interface HistoryEntry {
  닉네임: string
  weeks: { date: string; score: number | null }[]
}

const NOTION_TOKEN = process.env.NOTION_TOKEN
const HISTORY_DB_ID = process.env.NOTION_HISTORY_DB_ID

export async function GET() {
  const res = await fetch(`https://api.notion.com/v1/databases/${HISTORY_DB_ID}/query`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${NOTION_TOKEN}`,
      'Notion-Version': '2022-06-28',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      sorts: [{ property: '닉네임', direction: 'ascending' }, { property: '날짜', direction: 'ascending' }],
      page_size: 100,
    }),
    cache: 'no-store',
  })

  if (!res.ok) return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 })

  const data = await res.json()
  const results = data.results || []

  // 닉네임별로 날짜/점수 그룹핑
  const map: Record<string, { date: string; score: number | null }[]> = {}
  for (const page of results) {
    const props = page.properties
    const name = props['닉네임']?.title?.[0]?.plain_text || ''
    const date = props['날짜']?.date?.start || ''
    const score = props['점수']?.number ?? null
    if (!name || !date) continue
    if (!map[name]) map[name] = []
    map[name].push({ date, score })
  }

  // 날짜순 정렬
  const entries: HistoryEntry[] = Object.entries(map).map(([닉네임, weeks]) => ({
    닉네임,
    weeks: weeks.sort((a, b) => a.date.localeCompare(b.date)),
  }))

  return NextResponse.json(entries)
}
