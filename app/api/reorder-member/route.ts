import { NextResponse } from 'next/server'

const SUPABASE_URL = process.env.SUPABASE_URL!
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY!

export async function PATCH(req: Request) {
  const updates: { id: string; 번호: number }[] = await req.json()

  await Promise.all(
    updates.map(({ id, 번호 }) =>
      fetch(`${SUPABASE_URL}/rest/v1/slayer_members?id=eq.${id}`, {
        method: 'PATCH',
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 번호 }),
      })
    )
  )

  return NextResponse.json({ ok: true })
}
