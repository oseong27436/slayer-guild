'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { GUILDS, type GuildKey } from './lib/guilds'

interface Member {
  번호: string
  길드: string
  닉네임: string
  승급: string
  역할: string
  용협: string
  promotion_warning_since: string | null
}

interface HistoryEntry {
  닉네임: string
  weeks: { date: string; score: number | null; guild: string | null }[]
}

interface PromotionHistoryEntry {
  id: string
  닉네임: string
  현재승급: string
  요청승급: string
  상태: string
  요청일: string
  created_at: string
}

const PROMOTION_ORDER = [
  '스톤', '브론즈', '아이언', '실버', '골드',
  '미스릴', '오리하르콘', '아케이나이트', '아다만타이트',
  '에테르', '블랙미스릴', '데몬메탈', '드라고노스',
  '라그나블러드', '워프로스트', '다크녹스', '블루어비스',
  '인피넌트', '사이클로스', '에이션트케나인', '기가로크',
  '아이젠하르트', '다이아더스트', '엘든우드', '블리츠골드',
]

const HAS_IMAGE = new Set([
  '미스릴', '오리하르콘', '아케이나이트', '아다만타이트',
  '에테르', '블랙미스릴', '데몬메탈', '드라고노스',
  '라그나블러드', '워프로스트', '다크녹스', '블루어비스',
  '인피넌트', '사이클로스', '에이션트케나인', '기가로크',
  '아이젠하르트', '다이아더스트', '엘든우드', '블리츠골드',
])

function getAvgPromotion(members: Member[]) {
  const indices = members.map(m => PROMOTION_ORDER.indexOf(m.승급)).filter(i => i >= 0).sort((a, b) => a - b)
  if (indices.length <= 4) return null
  const trimmed = indices.slice(2, -2)
  return PROMOTION_ORDER[Math.round(trimmed.reduce((a, b) => a + b, 0) / trimmed.length)]
}

function getNextSteps(members: Member[]) {
  const indices = members.map(m => PROMOTION_ORDER.indexOf(m.승급)).filter(i => i >= 0).sort((a, b) => a - b)
  if (indices.length <= 4) return null
  const trimmed = indices.slice(2, -2)
  const avgValue = trimmed.reduce((a, b) => a + b, 0) / trimmed.length
  const nextIdx = Math.round(avgValue) + 1
  if (nextIdx >= PROMOTION_ORDER.length) return null
  const needed = Math.ceil((nextIdx - 0.5) * trimmed.length) - Math.floor(avgValue * trimmed.length)
  return { next: PROMOTION_ORDER[nextIdx], steps: Math.max(1, needed) }
}

function getUpHistory(nickname: string, promotionHistory: PromotionHistoryEntry[]) {
  return promotionHistory
    .filter(p => p.닉네임 === nickname)
    .filter(p => PROMOTION_ORDER.indexOf(p.요청승급) > PROMOTION_ORDER.indexOf(p.현재승급))
    .sort((a, b) => a.요청일.localeCompare(b.요청일))
    .filter((p, i, arr) => i === 0 || !(p.현재승급 === arr[i-1].현재승급 && p.요청승급 === arr[i-1].요청승급))
}

function getAvgDays(upHistory: PromotionHistoryEntry[]) {
  if (upHistory.length < 2) return null
  const intervals = upHistory.slice(1).map((p, i) =>
    (new Date(p.요청일).getTime() - new Date(upHistory[i].요청일).getTime()) / 86400000
  )
  return Math.round(intervals.reduce((s, v) => s + v, 0) / intervals.length)
}

function DistributionChart({ members }: { members: Member[] }) {
  const dist: Record<string, { total: number } & Record<GuildKey, number>> = {}
  members.forEach(m => {
    if (!m.승급) return
    if (!dist[m.승급]) {
      dist[m.승급] = { total: 0, ...Object.fromEntries(GUILDS.map(g => [g.key, 0])) } as { total: number } & Record<GuildKey, number>
    }
    dist[m.승급].total++
    if (GUILDS.some(g => g.key === m.길드)) dist[m.승급][m.길드 as GuildKey]++
  })
  const sorted = PROMOTION_ORDER.filter(p => dist[p]).map(p => ({ name: p, ...dist[p] })).reverse()
  const max = Math.max(...sorted.map(s => s.total), 1)

  return (
    <div className="space-y-2">
      {sorted.map((row) => {
        const lastNonZero = GUILDS.reduce((acc, g, i) => row[g.key] > 0 ? i : acc, -1)
        return (
        <div key={row.name} className="flex items-center gap-2">
          <div className="w-32 flex items-center justify-end gap-1.5 shrink-0">
            {HAS_IMAGE.has(row.name) && <Image src={`/promotion/${row.name}.webp`} alt={row.name} width={20} height={20} />}
            <span className="text-xs text-slate-500 truncate">{row.name}</span>
          </div>
          <div className="flex-1 bg-slate-100 rounded-full h-6 overflow-hidden">
            <div className="h-full flex rounded-full overflow-hidden" style={{ width: `${(row.total / max) * 100}%` }}>
              {GUILDS.map((g, i) => row[g.key] > 0 && (
                <div key={g.key} className={`h-full ${g.gradient} flex items-center justify-end`} style={{ flex: row[g.key] }}>
                  {i === lastNonZero && <span className="text-xs text-white font-bold pr-2">{row.total}</span>}
                </div>
              ))}
            </div>
          </div>
        </div>
        )
      })}
    </div>
  )
}

const PROMOTION_LIST = [
  '스톤', '브론즈', '아이언', '실버', '골드',
  '미스릴', '오리하르콘', '아케이나이트', '아다만타이트',
  '에테르', '블랙미스릴', '데몬메탈', '드라고노스',
  '라그나블러드', '워프로스트', '다크녹스', '블루어비스',
  '인피넌트', '사이클로스', '에이션트케나인', '기가로크',
  '아이젠하르트', '다이아더스트', '엘든우드', '블리츠골드',
]

function PromotionRequestModal({ members, onClose }: { members: Member[], onClose: () => void }) {
  const [닉네임, set닉네임] = useState('')
  const [idx, setIdx] = useState(0)
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')

  const current = members.find(m => m.닉네임 === 닉네임)?.승급 || ''
  const 요청승급 = PROMOTION_LIST[idx]

  const prev = () => setIdx(i => (i - 1 + PROMOTION_LIST.length) % PROMOTION_LIST.length)
  const next = () => setIdx(i => (i + 1) % PROMOTION_LIST.length)

  const handleNickname = (name: string) => {
    set닉네임(name)
    const cur = members.find(m => m.닉네임 === name)?.승급 || ''
    const curIdx = PROMOTION_LIST.indexOf(cur)
    setIdx(curIdx >= 0 ? curIdx : 0)
  }

  const submit = async () => {
    if (!닉네임 || 요청승급 === current) return
    setStatus('loading')
    const res = await fetch('/api/promotion-request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 닉네임, 현재승급: current, 요청승급 }),
    })
    setStatus(res.ok ? 'done' : 'error')
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="px-6 pt-6 pb-4">
          <h2 className="text-lg font-bold text-slate-800 mb-4 text-center">⬆️ 승급 변경 요청</h2>

          {status === 'done' ? (
            <div className="text-center py-6">
              <p className="text-2xl mb-2">🎉</p>
              <p className="text-green-600 font-medium">요청이 접수됐어요!</p>
              <p className="text-slate-400 text-sm mt-1">길드마스터 승인 후 반영됩니다</p>
              <button onClick={onClose} className="mt-5 bg-slate-100 rounded-xl px-8 py-2.5 text-sm font-medium">닫기</button>
            </div>
          ) : (
            <>
              {/* 닉네임 선택 */}
              <select
                value={닉네임}
                onChange={e => handleNickname(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm mb-5"
              >
                <option value="">닉네임을 선택하세요</option>
                {members.map(m => <option key={m.닉네임} value={m.닉네임}>{m.닉네임}</option>)}
              </select>

              {/* 승급 캐러셀 */}
              <div className="flex items-center justify-between gap-3 mb-2">
                <button onClick={prev} className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 text-lg transition shrink-0">‹</button>
                <div className="flex-1 flex flex-col items-center py-4">
                  {HAS_IMAGE.has(요청승급) ? (
                    <Image src={`/promotion/${요청승급}.webp`} alt={요청승급} width={80} height={80} />
                  ) : (
                    <div className="w-20 h-20 flex items-center justify-center bg-slate-100 rounded-full text-slate-400 text-sm">{요청승급}</div>
                  )}
                  <p className="mt-3 font-bold text-slate-800 text-base">{요청승급}</p>
                  {current && (
                    <p className="text-xs text-slate-400 mt-0.5">
                      {요청승급 === current ? '현재 승급' : `현재: ${current}`}
                    </p>
                  )}
                </div>
                <button onClick={next} className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 text-lg transition shrink-0">›</button>
              </div>

              {/* 인디케이터 */}
              <div className="flex justify-center gap-1 mb-5">
                {PROMOTION_LIST.map((_, i) => (
                  <div key={i} onClick={() => setIdx(i)}
                    className={`h-1 rounded-full cursor-pointer transition-all ${i === idx ? 'w-4 bg-purple-500' : 'w-1 bg-slate-200'}`} />
                ))}
              </div>

              <div className="flex gap-2">
                <button onClick={onClose} className="flex-1 border border-slate-200 rounded-xl py-2.5 text-sm text-slate-500">취소</button>
                <button
                  onClick={submit}
                  disabled={!닉네임 || 요청승급 === current || status === 'loading'}
                  className="flex-1 bg-purple-600 text-white rounded-xl py-2.5 text-sm font-medium disabled:opacity-40"
                >
                  {status === 'loading' ? '전송 중...' : '요청하기'}
                </button>
              </div>
              {status === 'error' && <p className="text-red-400 text-xs text-center mt-2">오류가 발생했어요</p>}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function MemberExpanded({ member, promotionHistory, onClose }: { member: Member; promotionHistory: PromotionHistoryEntry[]; onClose: () => void }) {
  const upHistory = getUpHistory(member.닉네임, promotionHistory)
  const avgDays = getAvgDays(upHistory)
  const recent = [...upHistory].reverse()

  const isOnFire = avgDays !== null && avgDays <= 14

  const guild = GUILDS.find(g => g.key === member.길드)

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl overflow-hidden max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
      <div className="flex items-center gap-2 px-4 pt-4 pb-3 border-b border-slate-100">
        {HAS_IMAGE.has(member.승급) && (
          <Image src={`/promotion/${member.승급}.webp`} alt={member.승급} width={24} height={24} />
        )}
        <span className="text-sm font-bold text-slate-800">{member.닉네임}</span>
        {guild && <span className="text-xs text-slate-400">{guild.emoji} {guild.key}</span>}
        <button onClick={onClose} className="ml-auto -m-2 p-2 text-slate-400 text-2xl leading-none">&times;</button>
      </div>
      <div className="p-4 overflow-y-auto overscroll-contain">
      <div className="grid grid-cols-2 gap-2 mb-3">
        <div className="bg-white rounded-xl p-3 text-center shadow-sm">
          <div className="text-xl font-bold text-slate-800">
            {upHistory.length}<span className="text-xs font-normal text-slate-400 ml-1">회</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">길드 가입 후 승급 횟수</div>
        </div>
        <div className={`rounded-xl p-3 text-center shadow-sm ${
          isOnFire
            ? 'bg-red-50 border-2 border-red-400 animate-pulse shadow-red-100 shadow-md'
            : 'bg-white'
        }`}>
          <div className="text-xl font-bold text-slate-800">
            {avgDays !== null
              ? <>{avgDays}<span className="text-xs font-normal text-slate-400 ml-1">일</span></>
              : <span className="text-sm text-slate-400">-</span>}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">평균 승급 주기</div>
        </div>
      </div>
      {recent.length > 0 ? (
        <div className="space-y-1.5">
          <p className="text-[10px] text-slate-400 mb-1">*정확하지 않을 수 있음!</p>
          {recent.map((p, i) => {
            const prevDate = recent[i + 1]?.요청일
            const days = prevDate
              ? Math.round((new Date(p.요청일).getTime() - new Date(prevDate).getTime()) / 86400000)
              : null
            return (
            <div key={p.id} className="flex items-center gap-2 text-xs">
              <span className="text-slate-400 shrink-0">{p.요청일.slice(5)}</span>
              <span className="text-slate-400 shrink-0">{p.현재승급}</span>
              <span className="text-slate-300">→</span>
              <span className="font-medium text-slate-700 shrink-0">{p.요청승급}</span>
              {HAS_IMAGE.has(p.요청승급) && (
                <Image src={`/promotion/${p.요청승급}.webp`} alt={p.요청승급} width={14} height={14} />
              )}
              {days !== null && (
                <span className="text-slate-500 shrink-0">({days}일)</span>
              )}
            </div>
            )
          })}
        </div>
      ) : (
        <p className="text-xs text-slate-400 text-center py-1">승급 기록 없음</p>
      )}
      </div>
      </div>
    </div>
  )
}

interface HeroImage { url: string; focalX: number; focalY: number }
const FALLBACK_IMAGES: HeroImage[] = [
  { url: '/hero.png', focalX: 50, focalY: 50 },
  { url: '/hero2.png', focalX: 50, focalY: 50 },
]

export default function Home() {
  const [members, setMembers] = useState<Member[]>([])
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [promotionHistory, setPromotionHistory] = useState<PromotionHistoryEntry[]>([])
  const [tab, setTab] = useState<'전체' | '히스토리' | '성장곡선'>('전체')
  const [sort, setSort] = useState<'기본' | '승급↓'>('기본')
  const [seasonTab, setSeasonTab] = useState<'s3' | 's4'>('s4')
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [showStats, setShowStats] = useState(false)
  const [showRequestModal, setShowRequestModal] = useState(false)
  const [expandedMember, setExpandedMember] = useState<string | null>(null)
  const [heroImage, setHeroImage] = useState<HeroImage>(FALLBACK_IMAGES[0])
  const [heroVisible, setHeroVisible] = useState(true)
  const [heroAspect, setHeroAspect] = useState<number | null>(null)
  const [selectedGuilds, setSelectedGuilds] = useState<GuildKey[] | null>(null)

  useEffect(() => {
    fetch('/api/hero-images')
      .then(r => r.json())
      .then((images: HeroImage[]) => {
        const pool = Array.isArray(images) && images.length > 0 ? images : FALLBACK_IMAGES
        const picked = pool[Math.floor(Math.random() * pool.length)]
        if (picked.url === heroImage.url) return
        setHeroVisible(false)
        setTimeout(() => {
          setHeroImage(picked)
          setHeroVisible(true)
        }, 300)
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    const open = showRequestModal || expandedMember !== null
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [showRequestModal, expandedMember])

  const loadData = () => {
    setLoading(true)
    setLoadError(false)
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 10000)
    Promise.all([
      fetch('/api/members', { signal: controller.signal }).then(r => r.json()),
      fetch('/api/history', { signal: controller.signal }).then(r => r.json()),
      fetch('/api/promotion-history', { signal: controller.signal }).then(r => r.json()),
    ]).then(([m, h, ph]) => {
      setMembers(Array.isArray(m) ? m : [])
      setHistory(Array.isArray(h) ? h : [])
      setPromotionHistory(Array.isArray(ph) ? ph : [])
      setLoading(false)
    }).catch(() => {
      setLoading(false)
      setLoadError(true)
    }).finally(() => clearTimeout(timeout))
  }

  useEffect(() => { loadData() }, [])

  const guildStats = GUILDS.map(g => {
    const list = members.filter(m => m.길드 === g.key)
    return { ...g, members: list, avg: getAvgPromotion(list), next: getNextSteps(list) }
  })
  const sorted = [...members].sort((a, b) => {
    if (sort === '승급↓') return PROMOTION_ORDER.indexOf(b.승급) - PROMOTION_ORDER.indexOf(a.승급)
    // 기본: 번호 오름차순 (길마는 번호로 이미 각 길드 최상단)
    return Number(a.번호) - Number(b.번호)
  })

  const guildCount: Record<string, number> = {}
  const numbered = sorted.map(m => {
    guildCount[m.길드] = (guildCount[m.길드] || 0) + 1
    return { ...m, idx: guildCount[m.길드] }
  })

  const growthAll = sorted.map(m => {
    const upHistory = getUpHistory(m.닉네임, promotionHistory)
    return { member: m, avgDays: getAvgDays(upHistory) }
  })
  const growthData = growthAll
    .filter((d): d is { member: Member; avgDays: number } => d.avgDays !== null)
    .map(d => ({ ...d, speed: 14 / d.avgDays }))
    .sort((a, b) => b.speed - a.speed)
  const noGrowthData = growthAll.filter(d => d.avgDays === null).map(d => d.member)

  const tabs = [
    { key: '전체' as const, emoji: '⚔️', label: '전체', count: members.length },
    { key: '히스토리' as const, emoji: '🕐', label: '히스토리', count: null },
    { key: '성장곡선' as const, emoji: '📈', label: '성장곡선', count: null },
  ]

  const SEASON_3_START = '2026-02-23'
  const SEASON_3_END   = '2026-05-18'
  const SEASON_4_START = '2026-06-01'
  const SEASON_4_END   = '2026-08-24'

  // 길드별 일자별 합산 (기록 당시 길드 기준)
  const guildDailyMap: Record<GuildKey, Record<string, number>> = Object.fromEntries(
    GUILDS.map(g => [g.key, {} as Record<string, number>])
  ) as Record<GuildKey, Record<string, number>>
  history.forEach(entry => {
    entry.weeks.forEach(w => {
      if (w.score === null) return
      const guild = w.guild
      if (!guild || !GUILDS.some(g => g.key === guild)) return
      const map = guildDailyMap[guild as GuildKey]
      map[w.date] = (map[w.date] ?? 0) + w.score!
    })
  })

  const seasonStart = seasonTab === 's3' ? SEASON_3_START : SEASON_4_START
  const seasonEnd   = seasonTab === 's3' ? SEASON_3_END   : SEASON_4_END

  // 시즌 기간 내 실제 기록이 있는 날짜 전체 (X축)
  const allDates = Array.from(new Set(GUILDS.flatMap(g => Object.keys(guildDailyMap[g.key]))))
    .filter(d => d >= seasonStart && d <= seasonEnd)
    .sort()

  // 일별 차트 데이터 (기록이 없는 날은 직전 기록값을 유지)
  const lastValue = Object.fromEntries(GUILDS.map(g => [g.key, 0])) as Record<GuildKey, number>
  const chartDataFull = allDates.map(d => {
    GUILDS.forEach(g => {
      const v = guildDailyMap[g.key][d]
      if (v !== undefined) lastValue[g.key] = v
    })
    return { fullDate: d, date: d.slice(5), ...lastValue }
  })
  const chartData = chartDataFull.map(({ fullDate, ...rest }) => rest)

  // 주차별 합산 (요약 카드의 전주대비 계산용, 현재 주까지만)
  const todayDate = new Date()
  const todayDow = todayDate.getDay()
  todayDate.setDate(todayDate.getDate() - (todayDow === 0 ? 6 : todayDow - 1))
  const currentMon = todayDate.toISOString().slice(0, 10)

  const seasonMondays: string[] = []
  const cursor = new Date(seasonStart)
  const dow = cursor.getDay()
  cursor.setDate(cursor.getDate() - (dow === 0 ? 6 : dow - 1))
  while (cursor.toISOString().slice(0, 10) <= seasonEnd && cursor.toISOString().slice(0, 10) <= currentMon) {
    seasonMondays.push(cursor.toISOString().slice(0, 10))
    cursor.setDate(cursor.getDate() + 7)
  }

  const weeklyTotals = seasonMondays
    .map(mon => {
      const endOfWeek = new Date(mon)
      endOfWeek.setDate(endOfWeek.getDate() + 6)
      const endStr = endOfWeek.toISOString().slice(0, 10)
      const upTo = chartDataFull.filter(d => d.fullDate <= endStr)
      return upTo[upTo.length - 1] ?? null
    })
    .filter((d): d is typeof chartDataFull[number] => d !== null)

  const guildsWithData = GUILDS.filter(g => chartData.some(d => d[g.key] > 0)).map(g => g.key)
  const effectiveGuilds = selectedGuilds ?? guildsWithData
  const toggleGuild = (key: GuildKey) => {
    const base = selectedGuilds ?? guildsWithData
    setSelectedGuilds(base.includes(key) ? base.filter(k => k !== key) : [...base, key])
  }
  const GRID_COLS: Record<number, string> = { 0: 'grid-cols-1', 1: 'grid-cols-1', 2: 'grid-cols-2', 3: 'grid-cols-3' }

  return (
    <div className="bg-slate-100 min-h-screen">
      {/* 히어로 + 콘텐츠가 하나의 흐름 */}
      <div className="relative">
        {/* 히어로 이미지 */}
        <div className={`relative w-full h-[45svh] md:h-[100svh] ${heroAspect !== null && heroAspect > 2 ? 'bg-slate-950' : ''}`}>
          <Image
            src={heroImage.url}
            alt="hero"
            fill
            className={`transition-opacity duration-300 ${heroAspect !== null && heroAspect > 2 ? 'object-contain' : 'object-cover'}`}
            style={{ opacity: heroVisible ? 1 : 0, objectPosition: `${heroImage.focalX}% ${heroImage.focalY}%` }}
            onLoad={e => setHeroAspect(e.currentTarget.naturalWidth / e.currentTarget.naturalHeight)}
            priority
            unoptimized
          />
          {/* 아래쪽 넓게 페이드 */}
          <div
            className="absolute inset-0"
            style={{ background: 'linear-gradient(to bottom, transparent 30%, rgba(241,245,249,0.5) 65%, #f1f5f9 85%)' }}
          />
        </div>

        {/* 콘텐츠: 히어로 안쪽 그라디언트 위에 겹침 */}
        <div
          className="relative max-w-2xl mx-auto px-3 pb-8 mt-[-12svh] md:mt-[-28svh]"
        >
          {loading ? (
            <div className="text-center text-slate-400 py-16 text-sm">불러오는 중...</div>
          ) : loadError ? (
            <div className="text-center py-16">
              <p className="text-slate-400 text-sm mb-3">불러오기 실패</p>
              <button onClick={loadData} className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm text-slate-600 shadow-sm">다시 시도</button>
            </div>
          ) : (
            <>
              {/* 승급 변경 요청 버튼 */}
              <button
                onClick={() => setShowRequestModal(true)}
                className="w-full mb-3 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-violet-500 text-white text-sm font-medium shadow-sm flex items-center justify-center gap-2"
              >
                ⬆️ 승급 변경 요청하기
              </button>

              {/* 탭 + 정렬 */}
              <div className="flex gap-2 mb-3">
                {tabs.map(t => (
                  <button
                    key={t.key}
                    onClick={() => setTab(t.key)}
                    className={`flex-1 flex items-center justify-center gap-1 py-2 rounded-xl text-xs font-medium transition-all shadow-sm whitespace-nowrap ${
                      tab === t.key
                        ? t.key === '히스토리' ? 'bg-teal-600 text-white'
                        : t.key === '성장곡선' ? 'bg-orange-500 text-white'
                        : 'bg-slate-700 text-white'
                        : 'bg-white/80 backdrop-blur-sm text-slate-600 border border-white/60'
                    }`}
                  >
                    <span>{t.emoji}</span>
                    <span>{t.label}</span>
                    {t.count !== null && <span className="opacity-60">({t.count})</span>}
                  </button>
                ))}
                {tab === '전체' && (
                  <select
                    value={sort}
                    onChange={e => setSort(e.target.value as typeof sort)}
                    className="bg-white/80 backdrop-blur-sm border border-white/60 text-slate-600 text-xs rounded-xl px-2 py-2 shadow-sm"
                  >
                    <option>기본</option>
                    <option>승급↓</option>
                  </select>
                )}
              </div>

              {tab === '히스토리' ? (
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
                  {/* 시즌 서브탭 */}
                  <div className="flex gap-2 mb-4">
                    {([
                      { key: 's3' as const, label: '시즌 3', sub: '~ 5/16' },
                      { key: 's4' as const, label: '시즌 4', sub: '6/1 ~' },
                    ]).map(s => (
                      <button
                        key={s.key}
                        onClick={() => setSeasonTab(s.key)}
                        className={`flex-1 py-2 rounded-xl text-xs font-medium transition flex flex-col items-center gap-0.5 ${
                          seasonTab === s.key
                            ? 'bg-teal-600 text-white'
                            : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        <span>{s.label}</span>
                        <span className={`text-[10px] ${seasonTab === s.key ? 'text-teal-200' : 'text-slate-400'}`}>{s.sub}</span>
                      </button>
                    ))}
                  </div>
                  {/* 길드 선택 토글 */}
                  <div className="flex gap-2 mb-4">
                    {GUILDS.map(g => {
                      const selected = effectiveGuilds.includes(g.key)
                      return (
                        <button
                          key={g.key}
                          onClick={() => toggleGuild(g.key)}
                          className={`flex-1 py-1.5 rounded-xl text-xs font-medium transition ${
                            selected ? g.active : 'bg-slate-100 text-slate-400'
                          }`}
                        >
                          {g.emoji} {g.key}
                        </button>
                      )
                    })}
                  </div>
                  {chartData.length === 0 ? (
                    <p className="text-sm text-slate-400 text-center py-16">아직 기록이 없어요</p>
                  ) : (<>
                  <p className="text-xs text-slate-400 text-center mb-4">길드 용협 합산 추이</p>
                  <ResponsiveContainer width="100%" height={280}>
                    <LineChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
                      <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                      <YAxis
                        tick={{ fontSize: 10, fill: '#94a3b8' }}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={v => Number(v).toLocaleString()}
                        width={72}
                      />
                      <Tooltip formatter={(v) => typeof v === 'number' ? v.toLocaleString() : String(v)} labelStyle={{ fontSize: 11 }} contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid #e2e8f0' }} />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                      {GUILDS.filter(g => effectiveGuilds.includes(g.key)).map(g => (
                        <Line key={g.key} type="linear" dataKey={g.key} stroke={g.line} strokeWidth={2} dot={{ r: 3, fill: g.line }} activeDot={{ r: 5 }} />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                  {weeklyTotals.length >= 1 && (() => {
                    const last = weeklyTotals[weeklyTotals.length - 1]
                    const prev = weeklyTotals.length > 1 ? weeklyTotals[weeklyTotals.length - 2] : null
                    return (
                      <div className={`grid ${GRID_COLS[effectiveGuilds.length]} gap-3 mt-4`}>
                        {GUILDS.filter(g => effectiveGuilds.includes(g.key)).map(g => {
                          const total = last[g.key]
                          const diff = prev ? last[g.key] - prev[g.key] : null
                          return (
                            <div key={g.key} className="bg-slate-50 rounded-xl p-3 text-center">
                              <div className={`text-xs font-medium mb-1 ${g.accentStrong}`}>{g.emoji} {g.key}</div>
                              <div className="text-lg font-bold text-slate-800">{total.toLocaleString()}</div>
                              {diff !== null && (
                                <div className={`text-xs mt-0.5 ${diff >= 0 ? 'text-rose-500' : 'text-blue-400'}`}>
                                  전주대비 {diff >= 0 ? '+' : ''}{diff.toLocaleString()}
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    )
                  })()}
                  </>)}
                </div>
              ) : tab === '성장곡선' ? (
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
                  <p className="text-xs text-slate-400 text-center mb-1">평균 승급 주기 기준 성장 속도</p>
                  <p className="text-[10px] text-slate-400 text-center mb-4">기준선(│) = 14일 주기(속도 1.0x) · 승급 기록 2회 이상부터 계산돼요</p>
                  {growthData.length === 0 ? (
                    <p className="text-sm text-slate-400 text-center py-16">아직 데이터가 부족해요</p>
                  ) : (
                    <div className="space-y-2">
                      {growthData.map(({ member: m, avgDays, speed }) => {
                        const g = GUILDS.find(gd => gd.key === m.길드)
                        const pct = Math.min(speed / 2, 1) * 100
                        return (
                          <div key={m.닉네임} className="flex items-center gap-2">
                            <div className="w-24 flex items-center gap-1 shrink-0">
                              {g && <span className="text-xs shrink-0">{g.emoji}</span>}
                              <span className="text-xs text-slate-700 truncate">{m.닉네임}</span>
                            </div>
                            <div className="flex-1 relative bg-slate-100 rounded-full h-2.5">
                              <div className="absolute top-0 bottom-0 left-1/2 w-px bg-slate-300" />
                              <div
                                className={`h-full rounded-full ${speed >= 1 ? 'bg-gradient-to-r from-orange-400 to-red-400' : 'bg-gradient-to-r from-sky-300 to-blue-400'}`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            <div className="w-14 text-right shrink-0 text-xs text-slate-500">{avgDays}일</div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                  {noGrowthData.length > 0 && (
                    <div className="mt-4 pt-3 border-t border-slate-100">
                      <p className="text-[11px] text-slate-400 mb-2">기록 부족 ({noGrowthData.length}명)</p>
                      <div className="flex flex-wrap gap-1">
                        {noGrowthData.map(m => (
                          <span key={m.닉네임} className="text-[10px] text-slate-400 bg-slate-50 px-2 py-0.5 rounded-full">{m.닉네임}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
              <>
              <p className="text-xs text-slate-400 text-center mb-2">매일 11시, 23시 기준으로 데이터가 수집됩니다!</p>

              {/* 멤버 리스트 (길드별) */}
              <div className="grid grid-cols-3 gap-2">
                {GUILDS.map(g => {
                  const guildMembers = numbered.filter(m => m.길드 === g.key)
                  return (
                    <div key={g.key}>
                      <div className={`text-xs font-bold mb-1.5 px-1 ${g.accentStrong}`}>{g.emoji} {g.key}</div>
                      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                        {guildMembers.map((m, i) => (
                          <div
                            key={i}
                            onClick={() => setExpandedMember(prev => prev === m.닉네임 ? null : m.닉네임)}
                            className={`flex items-center gap-1 px-1.5 py-2.5 border-b border-slate-100 last:border-b-0 cursor-pointer active:opacity-70 ${
                              m.promotion_warning_since ? 'bg-red-100/70' : g.rowBg
                            }`}
                          >
                            <span className="text-[10px] text-slate-400 shrink-0 w-3 text-center">{m.idx}</span>
                            <span className={`flex-1 truncate text-xs ${m.역할 === '길드마스터' ? 'font-bold text-slate-900' : 'font-semibold text-slate-800'}`}>
                              {(m.역할 === '길드마스터' || m.역할 === '부길드마스터') && '👑'}
                              {m.닉네임}
                            </span>
                            <span className="shrink-0">
                              {HAS_IMAGE.has(m.승급) ? (
                                <Image src={`/promotion/${m.승급}.webp`} alt={m.승급} width={20} height={20} title={m.승급} />
                              ) : m.승급 ? (
                                <span className="text-[9px] text-slate-400">{m.승급}</span>
                              ) : null}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>

              {(() => {
                const expandedData = numbered.find(m => m.닉네임 === expandedMember)
                return expandedData ? <MemberExpanded member={expandedData} promotionHistory={promotionHistory} onClose={() => setExpandedMember(null)} /> : null
              })()}

{/* 통계 토글 */}
              <button
                onClick={() => setShowStats(s => !s)}
                className="w-full mt-3 py-2.5 rounded-xl bg-white border border-slate-200 text-sm text-slate-500 flex items-center justify-center gap-2 shadow-sm"
              >
                <svg
                  className={`w-4 h-4 transition-transform ${showStats ? 'rotate-180' : ''}`}
                  fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
                승급 분포 / 통계
              </button>

              {showStats && (
                <div className="mt-2 bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-4">
                  <div className="grid grid-cols-3 gap-2">
                    {guildStats.map(g => (
                      <div key={g.key} className={`${g.statBg} border ${g.statBorder} rounded-lg p-3 text-center`}>
                        <div className={`${g.accentStrong} text-xs font-medium mb-2`}>{g.emoji} {g.key}</div>
                        {g.avg && (
                          <div className="flex flex-col items-center gap-1 mb-1">
                            {HAS_IMAGE.has(g.avg) && <Image src={`/promotion/${g.avg}.webp`} alt={g.avg} width={36} height={36} />}
                            <span className="text-sm font-bold text-slate-800">{g.avg}</span>
                          </div>
                        )}
                        {g.next && (
                          <div className="text-[11px] text-slate-500 mb-1">
                            다음({g.next.next.slice(0, 4)})까지 <span className="font-bold text-slate-700">{g.next.steps}명</span>
                          </div>
                        )}
                        <div className="mt-1">
                          <span className="text-xs text-slate-500">{g.members.length}명</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  <DistributionChart members={members} />
                </div>
              )}

              <div className="text-center mt-3">
                <a href="/admin" className="text-xs text-slate-400 hover:text-slate-500 transition">⚙️ 관리자</a>
              </div>
              {showRequestModal && (
                <PromotionRequestModal members={members} onClose={() => setShowRequestModal(false)} />
              )}
            </>
          )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
