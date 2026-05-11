import { NextResponse } from 'next/server'

const SUPABASE_URL = process.env.SUPABASE_URL!
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY!

export async function GET() {
  const since = new Date()
  since.setDate(since.getDate() - 14)
  const sinceStr = since.toISOString().slice(0, 10)

  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/slayer_visits?select=session_id,date,last_seen&date=gte.${sinceStr}&order=date.desc`,
    {
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
      cache: 'no-store',
    }
  )
  const rows: { session_id: string; date: string; last_seen: string }[] = await res.json()

  const now = Date.now()
  const ONLINE_THRESHOLD_MS = 5 * 60 * 1000

  const dailyMap: Record<string, Set<string>> = {}
  let onlineCount = 0

  for (const row of rows) {
    if (!row.session_id || !row.date) continue
    if (!dailyMap[row.date]) dailyMap[row.date] = new Set()
    dailyMap[row.date].add(row.session_id)

    if (row.last_seen && now - new Date(row.last_seen).getTime() <= ONLINE_THRESHOLD_MS) {
      onlineCount++
    }
  }

  const daily = Object.entries(dailyMap)
    .map(([date, sessions]) => ({ date, count: sessions.size }))
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 14)

  return NextResponse.json({ daily, onlineCount })
}
