import { NextResponse } from 'next/server'

const SUPABASE_URL = process.env.SUPABASE_URL!
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY!

export async function GET() {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/slayer_promotion_requests?상태=in.(승인,직접변경)&order=created_at.desc&limit=2000`,
    {
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
      cache: 'no-store',
    }
  )
  const rows = await res.json()
  return NextResponse.json(Array.isArray(rows) ? rows : [])
}
