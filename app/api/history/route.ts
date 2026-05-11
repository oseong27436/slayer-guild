import { NextResponse } from 'next/server'

export interface HistoryEntry {
  닉네임: string
  weeks: { date: string; score: number | null }[]
}

const SUPABASE_URL = process.env.SUPABASE_URL!
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY!

export async function GET() {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/slayer_history?select=member_name,recorded_date,score&order=member_name.asc,recorded_date.asc`,
    {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
      cache: 'no-store',
    }
  )

  if (!res.ok) return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 })

  const rows: { member_name: string; recorded_date: string; score: number }[] = await res.json()

  const map: Record<string, Map<string, number | null>> = {}
  for (const row of rows) {
    if (!map[row.member_name]) map[row.member_name] = new Map()
    map[row.member_name].set(row.recorded_date, row.score)
  }

  const entries: HistoryEntry[] = Object.entries(map).map(([닉네임, dateMap]) => ({
    닉네임,
    weeks: Array.from(dateMap.entries())
      .map(([date, score]) => ({ date, score }))
      .sort((a, b) => a.date.localeCompare(b.date)),
  }))

  return NextResponse.json(entries)
}
