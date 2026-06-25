import { NextResponse } from 'next/server'
import { GUILDS } from '../../lib/guilds'

const SUPABASE_URL = process.env.SUPABASE_URL!
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY!
const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN!
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID!

const PROMOTION_ORDER = [
  '스톤','브론즈','아이언','실버','골드',
  '미스릴','오리하르콘','아케이나이트','아다만타이트',
  '에테르','블랙미스릴','데몬메탈','드라고노스',
  '라그나블러드','워프로스트','다크녹스','블루어비스',
  '인피넌트','사이클로스','에이션트케나인','기가로크',
  '아이젠하르트','다이아더스트','엘든우드','블리츠골드',
]

async function telegramReply(chatId: number, text: string) {
  await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' }),
  })
}

async function answerCallback(callbackQueryId: string) {
  await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/answerCallbackQuery`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ callback_query_id: callbackQueryId }),
  })
}

async function editMessage(chatId: number, messageId: number, text: string) {
  await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/editMessageText`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, message_id: messageId, text, parse_mode: 'HTML' }),
  })
}

async function getMembers() {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/slayer_members?select=id,닉네임,길드,승급,용협,역할&order=번호.asc`,
    { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` }, cache: 'no-store' }
  )
  return res.json() as Promise<{ id: string; 닉네임: string; 길드: string; 승급: string; 용협: string; 역할: string }[]>
}

const ROLE_ORDER: Record<string, number> = { '길드마스터': 0, '부길드마스터': 1 }

async function handleSort(chatId: number) {
  const members = await getMembers()

  const sorted = GUILDS.flatMap(g => {
    const guildMembers = members.filter(m => m.길드 === g.key)
    return guildMembers.sort((a, b) => {
      const aRole = ROLE_ORDER[a.역할] ?? 2
      const bRole = ROLE_ORDER[b.역할] ?? 2
      if (aRole !== bRole) return aRole - bRole
      return PROMOTION_ORDER.indexOf(b.승급) - PROMOTION_ORDER.indexOf(a.승급)
    })
  })

  await Promise.all(
    sorted.map((m, i) =>
      fetch(`${SUPABASE_URL}/rest/v1/slayer_members?id=eq.${m.id}`, {
        method: 'PATCH',
        headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ 번호: i + 1 }),
      })
    )
  )

  const lines = GUILDS.map(g => {
    const gm = sorted.filter(m => m.길드 === g.key)
    return `${g.emoji} <b>${g.key}</b>\n` + gm.map((m, i) => `  ${i + 1}. ${m.닉네임} (${m.승급})`).join('\n')
  })

  await telegramReply(chatId, `✅ <b>정렬 완료</b>\n\n${lines.join('\n\n')}`)
}

function avgPromotion(members: { 승급: string }[]) {
  const indices = members.map(m => PROMOTION_ORDER.indexOf(m.승급)).filter(i => i >= 0).sort((a, b) => a - b)
  if (indices.length <= 4) return null
  const trimmed = indices.slice(2, -2)
  const avg = trimmed.reduce((a, b) => a + b, 0) / trimmed.length
  return { name: PROMOTION_ORDER[Math.round(avg)], value: avg, count: trimmed.length }
}

function nextPromotionSteps(avgValue: number, count: number) {
  const currentIdx = Math.round(avgValue)
  const nextIdx = currentIdx + 1
  if (nextIdx >= PROMOTION_ORDER.length) return null
  const needed = Math.ceil(nextIdx * count + 0.5 * count) - Math.floor(avgValue * count)
  const actualNeeded = Math.ceil((nextIdx - 0.5) * count) - Math.floor(avgValue * count)
  return { next: PROMOTION_ORDER[nextIdx], steps: Math.max(1, actualNeeded) }
}

async function handleHyunhwang(chatId: number) {
  const members = await getMembers()

  const lines = ['⚔️ <b>길드 현황</b>', '']
  GUILDS.forEach((g, i) => {
    const guildMembers = members.filter(m => m.길드 === g.key)
    const total = guildMembers.reduce((s, m) => s + (Number(m.용협) || 0), 0)
    const avg = avgPromotion(guildMembers)
    const next = avg ? nextPromotionSteps(avg.value, avg.count) : null

    if (i > 0) lines.push('')
    lines.push(`${g.emoji} <b>${g.key}</b> (${guildMembers.length}명)`)
    lines.push(`  용협 합산: ${total.toLocaleString()}`)
    lines.push(`  평균 승급: ${avg?.name ?? '-'}`)
    lines.push(next ? `  다음(${next.next})까지: ${next.steps}번` : '  최고 등급')
  })

  await telegramReply(chatId, lines.join('\n'))
}


const VALID_REGIONS = ['황무지', '용암', '얼음', '바람']

async function handleRegionChange(chatId: number, text: string) {
  const parts = text.trim().split(/\s+/)
  const region = parts[1]
  if (!region || !VALID_REGIONS.includes(region)) {
    await telegramReply(chatId, `❌ 올바른 지역을 입력해줘요.\n사용법: /지역변경 [황무지|용암|얼음|바람]`)
    return
  }
  await fetch(`${SUPABASE_URL}/rest/v1/slayer_settings?key=eq.region`, {
    method: 'PATCH',
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ value: region }),
  })
  await telegramReply(chatId, `✅ 이번 주 탐사 지역: <b>${region}</b> 으로 변경됐어요!`)
}

async function getRequest(id: string) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/slayer_promotion_requests?id=eq.${id}&select=닉네임,요청승급`, {
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
  })
  const rows: { 닉네임: string; 요청승급: string }[] = await res.json()
  return rows[0] ?? null
}

async function getGuildRequest(id: string) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/slayer_guild_requests?id=eq.${id}&select=닉네임,요청길드`, {
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
  })
  const rows: { 닉네임: string; 요청길드: string }[] = await res.json()
  return rows[0] ?? null
}

async function handleGuildApprove(id: string, chatId: number, messageId: number, callbackQueryId: string) {
  const req = await getGuildRequest(id)
  if (!req) { await answerCallback(callbackQueryId); return }
  await fetch(`${SUPABASE_URL}/rest/v1/slayer_guild_requests?id=eq.${id}`, {
    method: 'PATCH',
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ 상태: '승인' }),
  })
  await fetch(`${SUPABASE_URL}/rest/v1/slayer_members?닉네임=eq.${encodeURIComponent(req.닉네임)}`, {
    method: 'PATCH',
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ 길드: req.요청길드 }),
  })
  await answerCallback(callbackQueryId)
  await editMessage(chatId, messageId, `✅ <b>길드 이동 승인 완료</b>\n\n${req.닉네임} → ${req.요청길드}`)
}

async function handleGuildReject(id: string, chatId: number, messageId: number, callbackQueryId: string) {
  const req = await getGuildRequest(id)
  if (!req) { await answerCallback(callbackQueryId); return }
  await fetch(`${SUPABASE_URL}/rest/v1/slayer_guild_requests?id=eq.${id}`, {
    method: 'PATCH',
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ 상태: '거절' }),
  })
  await answerCallback(callbackQueryId)
  await editMessage(chatId, messageId, `❌ <b>길드 이동 거부</b>\n\n${req.닉네임} → ${req.요청길드}`)
}

async function handleApprove(id: string, chatId: number, messageId: number, callbackQueryId: string) {
  const req = await getRequest(id)
  if (!req) { await answerCallback(callbackQueryId); return }
  await fetch(`${SUPABASE_URL}/rest/v1/slayer_promotion_requests?id=eq.${id}`, {
    method: 'PATCH',
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ 상태: '승인' }),
  })
  await fetch(`${SUPABASE_URL}/rest/v1/slayer_members?닉네임=eq.${encodeURIComponent(req.닉네임)}`, {
    method: 'PATCH',
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ 승급: req.요청승급 }),
  })
  await answerCallback(callbackQueryId)
  await editMessage(chatId, messageId, `✅ <b>승급 승인 완료</b>\n\n${req.닉네임} → ${req.요청승급}`)
}

async function handleReject(id: string, chatId: number, messageId: number, callbackQueryId: string) {
  const req = await getRequest(id)
  if (!req) { await answerCallback(callbackQueryId); return }
  await fetch(`${SUPABASE_URL}/rest/v1/slayer_promotion_requests?id=eq.${id}`, {
    method: 'PATCH',
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ 상태: '거절' }),
  })
  await answerCallback(callbackQueryId)
  await editMessage(chatId, messageId, `❌ <b>승급 거부</b>\n\n${req.닉네임} → ${req.요청승급}`)
}

export async function POST(req: Request) {
  const body = await req.json()

  if (body.message?.text) {
    const text: string = body.message.text
    const chatId: number = body.message.chat.id

    if (text.startsWith('/현황')) await handleHyunhwang(chatId)
    else if (text.startsWith('/지역변경')) await handleRegionChange(chatId, text)
    else if (text.startsWith('/정렬')) await handleSort(chatId)
  }

  if (body.callback_query) {
    const { id: callbackQueryId, data, message } = body.callback_query
    const chatId: number = message.chat.id
    const messageId: number = message.message_id
    const [action, requestId] = data.split(':')

    if (action === 'approve') await handleApprove(requestId, chatId, messageId, callbackQueryId)
    else if (action === 'reject') await handleReject(requestId, chatId, messageId, callbackQueryId)
    else if (action === 'guild_approve') await handleGuildApprove(requestId, chatId, messageId, callbackQueryId)
    else if (action === 'guild_reject') await handleGuildReject(requestId, chatId, messageId, callbackQueryId)
  }

  return NextResponse.json({ ok: true })
}
