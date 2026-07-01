import { NextResponse } from 'next/server'
import { GUILDS } from '../../lib/guilds'

const SUPABASE_URL = process.env.SUPABASE_URL!
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY!
const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID

export async function PATCH(req: Request) {
  const { 닉네임 } = await req.json()
  if (!닉네임) return NextResponse.json({ error: '닉네임 필수' }, { status: 400 })

  const today = new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10)

  const updateRes = await fetch(
    `${SUPABASE_URL}/rest/v1/slayer_members?닉네임=eq.${encodeURIComponent(닉네임)}`,
    {
      method: 'PATCH',
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 용협체크일: today }),
    }
  )

  if (!updateRes.ok) return NextResponse.json({ error: '업데이트 실패' }, { status: 500 })

  if (TELEGRAM_TOKEN && TELEGRAM_CHAT_ID) {
    const membersRes = await fetch(
      `${SUPABASE_URL}/rest/v1/slayer_members?select=닉네임,길드,용협체크일`,
      { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` }, cache: 'no-store' }
    )
    const all: { 닉네임: string; 길드: string; 용협체크일: string | null }[] = membersRes.ok ? await membersRes.json() : []

    const lines = GUILDS.map(g => {
      const guildMembers = all.filter(m => m.길드 === g.key)
      const incomplete = guildMembers.filter(m => m.용협체크일 !== today)
      const cnt = incomplete.length
      const base = `${g.emoji} ${g.key} : ${cnt}명`
      if (cnt > 0 && cnt < 5) {
        const names = incomplete.map(m => m.닉네임).join(', ')
        return `${base}\n  └ ${names}`
      }
      return base
    })

    const text = `⚔️ <b>금일 용협 미완</b>\n\n${lines.join('\n')}`
    await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text, parse_mode: 'HTML' }),
    }).catch(() => {})
  }

  return NextResponse.json({ ok: true, 용협체크일: today })
}
