'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts'

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

function DistributionChart({ members, tab }: { members: Member[]; tab: string }) {
  const dist: Record<string, { total: number; luna: number; star: number }> = {}
  members.forEach(m => {
    if (!m.승급) return
    if (!dist[m.승급]) dist[m.승급] = { total: 0, luna: 0, star: 0 }
    dist[m.승급].total++
    if (m.길드 === '루나') dist[m.승급].luna++
    else if (m.길드 === '별') dist[m.승급].star++
  })
  const sorted = PROMOTION_ORDER.filter(p => dist[p]).map(p => ({ name: p, ...dist[p] })).reverse()
  const max = Math.max(...sorted.map(s => s.total), 1)

  const barColor = tab === '루나'
    ? 'bg-gradient-to-r from-purple-500 to-violet-400'
    : tab === '별'
    ? 'bg-gradient-to-r from-yellow-400 to-amber-400'
    : null

  return (
    <div className="space-y-2">
      {sorted.map(({ name, total, luna, star }) => (
        <div key={name} className="flex items-center gap-2">
          <div className="w-32 flex items-center justify-end gap-1.5 shrink-0">
            {HAS_IMAGE.has(name) && <Image src={`/promotion/${name}.webp`} alt={name} width={20} height={20} />}
            <span className="text-xs text-slate-500 truncate">{name}</span>
          </div>
          <div className="flex-1 bg-slate-100 rounded-full h-6 overflow-hidden">
            {barColor ? (
              <div
                className={`h-full ${barColor} rounded-full flex items-center justify-end pr-2`}
                style={{ width: `${(total / max) * 100}%` }}
              >
                <span className="text-xs text-white font-bold">{total}</span>
              </div>
            ) : (
              <div className="h-full flex rounded-full overflow-hidden" style={{ width: `${(total / max) * 100}%` }}>
                {luna > 0 && (
                  <div className="h-full bg-gradient-to-r from-purple-500 to-violet-400 flex items-center justify-end" style={{ flex: luna }}>
                    {star === 0 && <span className="text-xs text-white font-bold pr-2">{total}</span>}
                  </div>
                )}
                {star > 0 && (
                  <div className="h-full bg-gradient-to-r from-yellow-400 to-amber-400 flex items-center justify-end" style={{ flex: star }}>
                    <span className="text-xs text-white font-bold pr-2">{total}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      ))}
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

function GrowthTab({ promotionHistory, members }: { promotionHistory: PromotionHistoryEntry[]; members: Member[] }) {
  const guildMap: Record<string, string> = {}
  const currentNames = new Set<string>()
  members.forEach(m => { if (m.닉네임) { guildMap[m.닉네임] = m.길드; currentNames.add(m.닉네임) } })

  const growthMap: Record<string, { start: string; current: string; levels: number }> = {}
  ;[...promotionHistory].reverse().forEach(p => {
    if (!currentNames.has(p.닉네임)) return
    const fromIdx = PROMOTION_ORDER.indexOf(p.현재승급)
    const toIdx = PROMOTION_ORDER.indexOf(p.요청승급)
    if (toIdx <= fromIdx) return
    if (!growthMap[p.닉네임]) {
      growthMap[p.닉네임] = { start: p.현재승급, current: p.요청승급, levels: toIdx - fromIdx }
    } else {
      growthMap[p.닉네임].current = p.요청승급
      growthMap[p.닉네임].levels += toIdx - fromIdx
    }
  })

  const growthList = Object.entries(growthMap)
    .map(([name, d]) => ({ name, guild: guildMap[name] || '', ...d }))
    .sort((a, b) => b.levels - a.levels)

  const luna = growthList.filter(g => g.guild === '루나')
  const star = growthList.filter(g => g.guild === '별')
  const maxLevels = Math.max(...growthList.map(g => g.levels), 1)

  const renderBars = (list: typeof growthList, barClass: string) => (
    <div className="px-4 py-3 space-y-2.5">
      {list.map((g, i) => (
        <div key={g.name} className="flex items-center gap-2">
          <span className="text-[11px] text-slate-400 w-4 shrink-0 text-right">{i + 1}</span>
          <span className="text-xs font-medium text-slate-700 w-16 shrink-0 truncate">{g.name}</span>
          <div className="flex-1 bg-slate-100 rounded-full h-5 overflow-hidden">
            <div
              className={`h-full ${barClass} rounded-full flex items-center justify-end pr-2`}
              style={{ width: `${Math.max((g.levels / maxLevels) * 100, 8)}%` }}
            >
              <span className="text-[10px] text-white font-bold">+{g.levels}</span>
            </div>
          </div>
          {HAS_IMAGE.has(g.current) && (
            <Image src={`/promotion/${g.current}.webp`} alt={g.current} width={18} height={18} className="shrink-0" />
          )}
        </div>
      ))}
    </div>
  )

  return (
    <div className="space-y-3">
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-4 py-2.5 bg-purple-50 border-b border-purple-100 flex items-center justify-between">
          <span className="text-sm font-bold text-purple-600">🌙 루나</span>
          <span className="text-xs text-purple-400">{luna.length}명</span>
        </div>
        {luna.length === 0
          ? <p className="text-xs text-slate-400 text-center py-6">기록 없음</p>
          : renderBars(luna, 'bg-gradient-to-r from-purple-500 to-violet-400')}
      </div>
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-4 py-2.5 bg-yellow-50 border-b border-yellow-100 flex items-center justify-between">
          <span className="text-sm font-bold text-yellow-600">⭐ 별</span>
          <span className="text-xs text-yellow-400">{star.length}명</span>
        </div>
        {star.length === 0
          ? <p className="text-xs text-slate-400 text-center py-6">기록 없음</p>
          : renderBars(star, 'bg-gradient-to-r from-yellow-400 to-amber-400')}
      </div>
    </div>
  )
}

function WarningTimer({ since }: { since: string }) {
  const DEADLINE = 7 * 24 * 60 * 60 * 1000
  const [remaining, setRemaining] = useState(() => {
    const elapsed = Date.now() - new Date(since).getTime()
    return Math.max(0, DEADLINE - elapsed)
  })

  useEffect(() => {
    const timer = setInterval(() => {
      const elapsed = Date.now() - new Date(since).getTime()
      setRemaining(Math.max(0, DEADLINE - elapsed))
    }, 1000)
    return () => clearInterval(timer)
  }, [since])

  const totalSec = Math.floor(remaining / 1000)
  const days = Math.floor(totalSec / 86400)
  const hours = Math.floor((totalSec % 86400) / 3600)
  const mins = Math.floor((totalSec % 3600) / 60)
  const secs = totalSec % 60

  const pad = (n: number) => n.toString().padStart(2, '0')

  if (remaining <= 0) return <span className="text-xs font-bold text-red-500">방출 대상</span>

  return (
    <span className="text-xs font-mono text-red-500 tabular-nums">
      {days > 0 ? `${days}일 ` : ''}{pad(hours)}:{pad(mins)}:{pad(secs)}
    </span>
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
  const [tab, setTab] = useState<'전체' | '성장' | '히스토리'>('전체')
  const [sort, setSort] = useState<'기본' | '용협↓' | '승급↓' | '증감↓'>('기본')
  const [seasonTab, setSeasonTab] = useState<'s3' | 's4'>('s4')
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [showStats, setShowStats] = useState(false)
  const [showRequestModal, setShowRequestModal] = useState(false)
  const [heroImage, setHeroImage] = useState<HeroImage>(FALLBACK_IMAGES[0])
  const [heroVisible, setHeroVisible] = useState(true)

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


  // 닉네임 → 증감 맵 (오늘 기록이 있을 때만, 같은 주 내 전날 대비)
  const getMonWeek = (dateStr: string) => {
    const d = new Date(dateStr)
    const day = d.getDay()
    const mon = new Date(d)
    mon.setDate(d.getDate() - (day === 0 ? 6 : day - 1))
    return mon.toISOString().slice(0, 10)
  }

  const today = new Date().toLocaleDateString('sv-SE')  // YYYY-MM-DD (로컬 날짜)
  const isFriday = new Date().getDay() === 5
  const FRIDAY_THRESHOLD = 21000

  const diffMap: Record<string, number | null> = {}
  history.forEach(entry => {
    const valid = entry.weeks.filter((w): w is { date: string; score: number; guild: string | null } => w.score !== null)
    if (valid.length >= 2) {
      const last = valid[valid.length - 1]
      const prev = valid[valid.length - 2]
      if (last.date === today && getMonWeek(last.date) === getMonWeek(prev.date)) {
        diffMap[entry.닉네임] = last.score - prev.score
      } else {
        diffMap[entry.닉네임] = null
      }
    } else {
      diffMap[entry.닉네임] = null
    }
  })

  const luna = members.filter(m => m.길드 === '루나')
  const star = members.filter(m => m.길드 === '별')
  const lunaTotal = luna.reduce((s, m) => s + (Number(m.용협) || 0), 0)
  const starTotal = star.reduce((s, m) => s + (Number(m.용협) || 0), 0)
  const lunaDone = luna.filter(m => {
    const diff = diffMap[m.닉네임]
    if (diff === null || diff === undefined) return false
    return isFriday ? diff > FRIDAY_THRESHOLD : diff > 0
  }).length
  const starDone = star.filter(m => {
    const diff = diffMap[m.닉네임]
    if (diff === null || diff === undefined) return false
    return isFriday ? diff > FRIDAY_THRESHOLD : diff > 0
  }).length
  const filtered = members
  const lunaAvg = getAvgPromotion(luna)
  const starAvg = getAvgPromotion(star)

  const sorted = [...filtered].sort((a, b) => {
    if (sort === '용협↓') return (Number(b.용협) || 0) - (Number(a.용협) || 0)
    if (sort === '승급↓') return PROMOTION_ORDER.indexOf(b.승급) - PROMOTION_ORDER.indexOf(a.승급)
    if (sort === '증감↓') return (diffMap[b.닉네임] ?? 0) - (diffMap[a.닉네임] ?? 0)
    // 기본: 번호 오름차순 (길마는 번호로 이미 각 길드 최상단)
    return Number(a.번호) - Number(b.번호)
  })

  const guildCount: Record<string, number> = {}
  const numbered = sorted.map(m => {
    guildCount[m.길드] = (guildCount[m.길드] || 0) + 1
    return { ...m, idx: guildCount[m.길드] }
  })

  const tabs = [
    { key: '전체' as const, emoji: '⚔️', label: '전체', count: members.length },
    { key: '성장' as const, emoji: '📈', label: '성장', count: null },
    { key: '히스토리' as const, emoji: '🕐', label: '히스토리', count: null },
  ]

  const SEASON_3_START = '2026-02-23'
  const SEASON_3_END   = '2026-05-18'
  const SEASON_4_START = '2026-06-01'
  const SEASON_4_END   = '2026-08-24'

  // 길드 일별 합산 시계열 (기록 당시 길드 기준)
  const weeklyMap: Record<string, { 루나: number; 별: number }> = {}
  history.forEach(entry => {
    entry.weeks.forEach(w => {
      if (w.score === null) return
      const guild = w.guild
      if (!guild) return
      if (!weeklyMap[w.date]) weeklyMap[w.date] = { 루나: 0, 별: 0 }
      if (guild === '루나') weeklyMap[w.date].루나 += w.score!
      if (guild === '별') weeklyMap[w.date].별 += w.score!
    })
  })

  // 시즌 전체 주 목록 생성 (데이터 없는 주도 0으로 포함)
  const allDates = Object.keys(weeklyMap).sort()
  const seasonStart = seasonTab === 's3' ? SEASON_3_START : SEASON_4_START
  const seasonEnd   = seasonTab === 's3' ? SEASON_3_END   : SEASON_4_END

  const seasonMondays: string[] = []
  const cursor = new Date(seasonStart)
  const dow = cursor.getDay()
  cursor.setDate(cursor.getDate() - (dow === 0 ? 6 : dow - 1))
  while (cursor.toISOString().slice(0, 10) <= seasonEnd) {
    seasonMondays.push(cursor.toISOString().slice(0, 10))
    cursor.setDate(cursor.getDate() + 7)
  }

  const chartData = seasonMondays.map(mon => {
    const endOfWeek = new Date(mon)
    endOfWeek.setDate(endOfWeek.getDate() + 6)
    const endStr = endOfWeek.toISOString().slice(0, 10)
    const weekDates = allDates.filter(d => d >= mon && d <= endStr)
    const best = weekDates[weekDates.length - 1]
    return {
      date: endStr.slice(5),
      루나: best ? (weeklyMap[best]?.루나 ?? 0) : 0,
      별: best ? (weeklyMap[best]?.별 ?? 0) : 0,
    }
  })

  return (
    <div className="bg-slate-100 min-h-screen">
      {/* 히어로 + 콘텐츠가 하나의 흐름 */}
      <div className="relative">
        {/* 히어로 이미지 */}
        <div className="relative w-full h-[45svh] md:h-[100svh]">
          <Image
            src={heroImage.url}
            alt="hero"
            fill
            className="object-cover transition-opacity duration-300"
            style={{ opacity: heroVisible ? 1 : 0, objectPosition: `${heroImage.focalX}% ${heroImage.focalY}%` }}
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
                        ? t.key === '성장' ? 'bg-emerald-600 text-white'
                          : t.key === '히스토리' ? 'bg-teal-600 text-white'
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
                    <option>용협↓</option>
                    <option>승급↓</option>
                    <option>증감↓</option>
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
                  {chartData.length === 0 ? (
                    <p className="text-sm text-slate-400 text-center py-16">아직 기록이 없어요</p>
                  ) : (<>
                  <p className="text-xs text-slate-400 text-center mb-4">길드 용협 합산 추이</p>
                  <ResponsiveContainer width="100%" height={280}>
                    <LineChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
                      <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                      <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} tickFormatter={v => Number(v).toLocaleString()} width={72} />
                      <Tooltip formatter={(v) => typeof v === 'number' ? v.toLocaleString() : String(v)} labelStyle={{ fontSize: 11 }} contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid #e2e8f0' }} />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                      <Line type="linear" dataKey="루나" stroke="#9333ea" strokeWidth={2} dot={{ r: 3, fill: '#9333ea' }} activeDot={{ r: 5 }} />
                      <Line type="linear" dataKey="별" stroke="#eab308" strokeWidth={2} dot={{ r: 3, fill: '#eab308' }} activeDot={{ r: 5 }} />
                    </LineChart>
                  </ResponsiveContainer>
                  {chartData.length > 1 && (() => {
                    const last = chartData[chartData.length - 1]
                    const prev = chartData[chartData.length - 2]
                    const lunaDiff = last.루나 - prev.루나
                    const starDiff = last.별 - prev.별
                    return (
                      <div className="grid grid-cols-2 gap-3 mt-4">
                        {[
                          { label: '🌙 루나', total: last.루나, diff: lunaDiff, color: 'text-purple-600' },
                          { label: '⭐ 별', total: last.별, diff: starDiff, color: 'text-yellow-500' },
                        ].map(g => (
                          <div key={g.label} className="bg-slate-50 rounded-xl p-3 text-center">
                            <div className={`text-xs font-medium mb-1 ${g.color}`}>{g.label}</div>
                            <div className="text-lg font-bold text-slate-800">{g.total.toLocaleString()}</div>
                            <div className={`text-xs mt-0.5 ${g.diff >= 0 ? 'text-rose-500' : 'text-blue-400'}`}>
                              전주대비 {g.diff >= 0 ? '+' : ''}{g.diff.toLocaleString()}
                            </div>
                          </div>
                        ))}
                      </div>
                    )
                  })()}
                  </>)}
                </div>
              ) : tab === '성장' ? (
                <GrowthTab promotionHistory={promotionHistory} members={members} />
              ) : (
              <>
              <p className="text-xs text-slate-400 text-center mb-2">매일 11시, 23시 기준으로 데이터가 수집됩니다!</p>

              {/* 길드 합산 카드 */}
              <div className="mb-3 grid grid-cols-2 gap-2">
                <div className="rounded-xl px-4 py-3 shadow-sm bg-white border-2 border-purple-400">
                  <div className="text-xs text-purple-400 mb-1 whitespace-nowrap">🌙 루나 · {lunaDone}/{luna.length}명 완료</div>
                  <div className="text-xl font-bold text-purple-600 tabular-nums">{lunaTotal.toLocaleString()}</div>
                </div>
                <div className="rounded-xl px-4 py-3 shadow-sm bg-white border-2 border-yellow-400">
                  <div className="text-xs text-yellow-500 mb-1 whitespace-nowrap">⭐ 별 · {starDone}/{star.length}명 완료</div>
                  <div className="text-xl font-bold text-yellow-500 tabular-nums">{starTotal.toLocaleString()}</div>
                </div>
              </div>

              {/* 멤버 리스트 */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                {/* 헤더 */}
                <div className="flex items-center px-4 py-2 bg-slate-50 border-b-2 border-slate-200 text-xs text-slate-400 font-medium">
                  <span className="w-6 shrink-0 text-center">#</span>
                  {tab === '전체' && <span className="w-10 shrink-0 text-center">길드</span>}
                  <span className="flex-1 text-center">닉네임</span>
                  <span className="w-10 text-center shrink-0">승급</span>
                  <span className="w-28 text-center shrink-0 leading-tight">용협<br/><span className="text-slate-300 font-normal" style={{fontSize:'10px'}}>전날대비</span></span>
                </div>
                {numbered.map((m, i) => (
                  <div
                    key={i}
                    className={`flex items-center px-4 py-3.5 border-b border-slate-100 last:border-0 ${
                      m.promotion_warning_since
                        ? 'bg-red-100/70'
                        : m.길드 === '루나' ? 'bg-purple-50/40' : 'bg-yellow-50/40'
                    }`}
                  >
                    <span className="w-6 text-xs text-slate-400 shrink-0">{m.idx}</span>
                    {tab === '전체' && (
                      <span className={`w-10 text-xs font-bold shrink-0 text-center ${m.promotion_warning_since ? 'text-red-500' : m.길드 === '루나' ? 'text-purple-500' : 'text-yellow-500'}`}>
                        {m.길드}
                      </span>
                    )}
                    <div className="flex-1 flex flex-col items-center min-w-0">
                      <span className={`text-[15px] truncate ${
                        m.역할 === '길드마스터'
                          ? 'font-bold text-slate-900'
                          : 'font-semibold text-slate-800'
                      }`}>
                        {m.역할 === '길드마스터' && <span className="mr-1">👑</span>}
                        {m.역할 === '부길드마스터' && <span className="mr-1" style={{filter:'grayscale(1) brightness(0.75)'}}>👑</span>}
                        {m.닉네임}
                      </span>
                      {m.promotion_warning_since && (
                        <WarningTimer since={m.promotion_warning_since} />
                      )}
                    </div>
                    <div className="w-10 flex justify-center shrink-0">
                      {HAS_IMAGE.has(m.승급) ? (
                        <Image src={`/promotion/${m.승급}.webp`} alt={m.승급} width={28} height={28} title={m.승급} />
                      ) : m.승급 ? (
                        <span className="text-xs text-slate-400">{m.승급}</span>
                      ) : null}
                    </div>
                    <div className="w-28 text-center shrink-0">
                      <span className="text-sm text-slate-900 tabular-nums font-bold">
                        {(() => { const n = Number(m.용협); return (!m.용협 || isNaN(n)) ? '-' : n.toLocaleString() })()}
                      </span>
                      {(() => {
                        const hasScore = m.용협 && !isNaN(Number(m.용협))
                        const diff = hasScore ? diffMap[m.닉네임] : null
                        if (diff === null || diff === undefined) return null
                        return (
                          <span className={`block text-xs tabular-nums font-medium ${isFriday && diff <= FRIDAY_THRESHOLD ? 'text-slate-900' : diff < 0 ? 'text-blue-400' : diff > 0 ? 'text-rose-500' : 'text-slate-300'}`}>
                            ({diff > 0 ? '+' : ''}{diff.toLocaleString()})
                          </span>
                        )
                      })()}
                    </div>
                  </div>
                ))}
              </div>

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
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { label: '🌙 루나', count: luna.length, avg: lunaAvg, bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-600' },
                      { label: '⭐ 별', count: star.length, avg: starAvg, bg: 'bg-yellow-50', border: 'border-yellow-200', text: 'text-yellow-600' },
                    ].map(c => (
                      <div key={c.label} className={`${c.bg} border ${c.border} rounded-lg p-3 text-center`}>
                        <div className={`${c.text} text-xs font-medium mb-2`}>{c.label}</div>
                        {c.avg && (
                          <div className="flex flex-col items-center gap-1 mb-2">
                            {HAS_IMAGE.has(c.avg) && <Image src={`/promotion/${c.avg}.webp`} alt={c.avg} width={40} height={40} />}
                            <span className="text-sm font-bold text-slate-800">{c.avg}</span>
                          </div>
                        )}
                        <div className="text-sm text-slate-500">{c.count}<span className="text-xs ml-0.5">명</span></div>
                      </div>
                    ))}
                  </div>
                  <DistributionChart members={members} tab={tab} />
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
