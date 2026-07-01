import { NextResponse } from 'next/server'

export interface Member {
  번호: string
  길드: string
  닉네임: string
  승급: string
  역할: string
  용협: string
  promotion_warning_since: string | null
  용협체크일: string | null
}

const SUPABASE_URL = process.env.SUPABASE_URL!
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY!

export async function GET() {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/slayer_members?select=번호,길드,닉네임,승급,역할,용협,promotion_warning_since,용협체크일&order=번호.asc`,
    {
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
      cache: 'no-store',
    }
  )
  if (!res.ok) return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 })

  const rows: { 번호: number; 길드: string; 닉네임: string; 승급: string; 역할: string | null; 용협: number | null; promotion_warning_since: string | null; 용협체크일: string | null }[] = await res.json()

  const members: Member[] = rows
    .filter(r => r.닉네임)
    .map(r => ({
      번호: r.번호?.toString() ?? '',
      길드: r.길드 ?? '',
      닉네임: r.닉네임,
      승급: r.승급 ?? '',
      역할: r.역할 ?? '',
      용협: r.용협 != null ? r.용협.toString() : '-',
      promotion_warning_since: r.promotion_warning_since ?? null,
      용협체크일: r.용협체크일 ?? null,
    }))

  return NextResponse.json(members)
}
