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
}

interface HistoryEntry {
  닉네임: string
  weeks: { date: string; score: number | null }[]
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
  const indices = members.map(m => PROMOTION_ORDER.indexOf(m.승급)).filter(i => i >= 0)
  if (!indices.length) return null
  return PROMOTION_ORDER[Math.round(indices.reduce((a, b) => a + b, 0) / indices.length)]
}

function DistributionChart({ members }: { members: Member[] }) {
  const dist: Record<string, number> = {}
  members.forEach(m => { if (m.승급) dist[m.승급] = (dist[m.승급] || 0) + 1 })
  const sorted = PROMOTION_ORDER.filter(p => dist[p]).map(p => ({ name: p, count: dist[p] })).reverse()
  const max = Math.max(...sorted.map(s => s.count), 1)
  return (
    <div className="space-y-1.5">
      {sorted.map(({ name, count }) => (
        <div key={name} className="flex items-center gap-2">
          <div className="w-24 flex items-center justify-end gap-1 shrink-0">
            {HAS_IMAGE.has(name) && <Image src={`/promotion/${name}.webp`} alt={name} width={14} height={14} />}
            <span className="text-xs text-slate-500">{name}</span>
          </div>
          <div className="flex-1 bg-slate-100 rounded-full h-4 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-purple-500 to-violet-400 rounded-full flex items-center justify-end pr-1.5"
              style={{ width: `${(count / max) * 100}%` }}
            >
              <span className="text-xs text-white font-bold">{count}</span>
            </div>
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

export default function Home() {
  const [members, setMembers] = useState<Member[]>([])
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [tab, setTab] = useState<'전체' | '루나' | '별' | '성장'>('전체')
  const [sort, setSort] = useState<'기본' | '용협↓' | '승급↓' | '증감↓'>('기본')
  const [loading, setLoading] = useState(true)
  const [showStats, setShowStats] = useState(false)
  const [showRequestModal, setShowRequestModal] = useState(false)

  useEffect(() => {
    Promise.all([
      fetch('/api/members').then(r => r.json()),
      fetch('/api/history').then(r => r.json()),
    ]).then(([m, h]) => {
      setMembers(m)
      setHistory(h)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  // 방문 추적
  useEffect(() => {
    let sessionId = localStorage.getItem('slayer_session')
    if (!sessionId) {
      sessionId = crypto.randomUUID()
      localStorage.setItem('slayer_session', sessionId)
    }
    const track = () => fetch('/api/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId }),
    }).catch(() => {})
    track()
    const interval = setInterval(track, 60_000)
    return () => clearInterval(interval)
  }, [])

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
    const valid = entry.weeks.filter((w): w is { date: string; score: number } => w.score !== null)
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
  const filtered = tab === '전체' ? members : members.filter(m => m.길드 === tab)
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
    { key: '루나' as const, emoji: '🌙', label: '루나', count: luna.length },
    { key: '별' as const, emoji: '⭐', label: '별', count: star.length },
    { key: '성장' as const, emoji: '📈', label: '성장', count: null },
  ]

  // 길드 주간 합산 시계열
  const memberGuildMap = Object.fromEntries(members.map(m => [m.닉네임, m.길드]))
  const weeklyMap: Record<string, { 루나: number; 별: number }> = {}
  history.forEach(entry => {
    const guild = memberGuildMap[entry.닉네임]
    if (!guild) return
    entry.weeks.forEach(w => {
      if (w.score === null) return
      if (!weeklyMap[w.date]) weeklyMap[w.date] = { 루나: 0, 별: 0 }
      if (guild === '루나') weeklyMap[w.date].루나 += w.score!
      if (guild === '별') weeklyMap[w.date].별 += w.score!
    })
  })
  // 최근 7주 일요일 고정
  const last7Sundays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    const day = d.getDay()
    d.setDate(d.getDate() - (day === 0 ? 0 : day) - (6 - i) * 7)
    return d.toISOString().slice(0, 10)
  })
  const chartData = last7Sundays.map(date => ({
    date: date.slice(5),
    루나: weeklyMap[date]?.루나 ?? 0,
    별: weeklyMap[date]?.별 ?? 0,
  }))

  return (
    <div className="bg-slate-100 min-h-screen">
      {/* 히어로 + 콘텐츠가 하나의 흐름 */}
      <div className="relative">
        {/* 히어로 이미지 */}
        <div className="relative w-full" style={{ height: '100svh' }}>
          <Image src="/hero.png" alt="hero" fill className="object-cover object-center" priority unoptimized />
          {/* 아래쪽 넓게 페이드 */}
          <div
            className="absolute inset-0"
            style={{ background: 'linear-gradient(to bottom, transparent 30%, rgba(241,245,249,0.5) 65%, #f1f5f9 85%)' }}
          />
        </div>

        {/* 콘텐츠: 히어로 안쪽 그라디언트 위에 겹침 */}
        <div
          className="relative max-w-2xl mx-auto px-3 pb-8"
          style={{ marginTop: 'calc(-100svh * 0.28)' }}
        >
          {loading ? (
            <div className="text-center text-slate-400 py-16 text-sm">불러오는 중...</div>
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
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-medium transition-all shadow-sm ${
                      tab === t.key
                        ? t.key === '루나' ? 'bg-purple-600 text-white'
                          : t.key === '별' ? 'bg-yellow-500 text-white'
                          : t.key === '성장' ? 'bg-emerald-600 text-white'
                          : 'bg-slate-700 text-white'
                        : 'bg-white/80 backdrop-blur-sm text-slate-600 border border-white/60'
                    }`}
                  >
                    <span>{t.emoji}</span>
                    <span>{t.label}</span>
                    {t.count !== null && <span className="text-xs opacity-60">({t.count})</span>}
                  </button>
                ))}
                {tab !== '성장' && (
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

              {tab === '성장' ? (
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
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
                </div>
              ) : (
              <>
              <p className="text-xs text-slate-400 text-center mb-2">매일 11시, 23시 기준으로 데이터가 수집됩니다!</p>

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
                      m.길드 === '루나' ? 'bg-purple-50/40' : 'bg-yellow-50/40'
                    }`}
                  >
                    <span className="w-6 text-xs text-slate-400 shrink-0">{m.idx}</span>
                    {tab === '전체' && (
                      <span className={`w-10 text-xs font-bold shrink-0 text-center ${m.길드 === '루나' ? 'text-purple-500' : 'text-yellow-500'}`}>
                        {m.길드}
                      </span>
                    )}
                    <span className="flex-1 text-sm font-medium text-slate-800 min-w-0 truncate text-center">
                      {m.역할 === '길드마스터' && <span className="mr-1">👑</span>}
                      {m.역할 === '부길드마스터' && <span className="mr-1" style={{filter:'grayscale(1) brightness(0.75)'}}>👑</span>}
                      {m.닉네임}
                    </span>
                    <div className="w-10 flex justify-center shrink-0">
                      {HAS_IMAGE.has(m.승급) ? (
                        <Image src={`/promotion/${m.승급}.webp`} alt={m.승급} width={28} height={28} title={m.승급} />
                      ) : m.승급 ? (
                        <span className="text-xs text-slate-400">{m.승급}</span>
                      ) : null}
                    </div>
                    <div className="w-28 text-center shrink-0">
                      <span className="text-sm text-slate-700 tabular-nums font-bold">
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
                <span className={`transition-transform inline-block ${showStats ? 'rotate-90' : ''}`}>▶</span>
                승급 분포 / 통계
              </button>

              {showStats && (
                <div className="mt-2 bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-4">
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { label: '🌙 루나', count: luna.length, avg: lunaAvg, bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-600' },
                      { label: '⭐ 별', count: star.length, avg: starAvg, bg: 'bg-yellow-50', border: 'border-yellow-200', text: 'text-yellow-600' },
                      { label: '⚔️ 전체', count: members.length, avg: null, bg: 'bg-slate-50', border: 'border-slate-200', text: 'text-slate-500' },
                    ].map(c => (
                      <div key={c.label} className={`${c.bg} border ${c.border} rounded-lg p-2.5 text-center`}>
                        <div className={`${c.text} text-xs font-medium mb-1`}>{c.label}</div>
                        <div className="text-xl font-bold text-slate-800">{c.count}<span className="text-xs text-slate-400 ml-0.5">명</span></div>
                        {c.avg && (
                          <div className="flex flex-col items-center mt-1.5 gap-0.5">
                            {HAS_IMAGE.has(c.avg) && <Image src={`/promotion/${c.avg}.webp`} alt={c.avg} width={28} height={28} />}
                            <span className="text-xs text-slate-500">{c.avg}</span>
                          </div>
                        )}
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
