import { NextResponse } from 'next/server'

const SUPABASE_URL = process.env.SUPABASE_URL!
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY!

export async function POST(req: Request) {
  const { sessionId } = await req.json()
  if (!sessionId) return NextResponse.json({ ok: false })

  const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' })
  const now = new Date().toISOString()

  try {
    await fetch(`${SUPABASE_URL}/rest/v1/slayer_visits`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates',
      },
      body: JSON.stringify({ session_id: sessionId, date: today, last_seen: now }),
    })
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('[track]', e)
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}
