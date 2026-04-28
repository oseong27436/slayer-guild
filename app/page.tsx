'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'

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

export default function Home() {
  const [members, setMembers] = useState<Member[]>([])
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [tab, setTab] = useState<'전체' | '루나' | '별'>('전체')
  const [sort, setSort] = useState<'기본' | '용협↓' | '승급↓' | '증감↓'>('기본')
  const [loading, setLoading] = useState(true)
  const [showStats, setShowStats] = useState(false)

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

  // 닉네임 → 증감 맵 (같은 주 내 전날 대비만 표시)
  const getMonWeek = (dateStr: string) => {
    const d = new Date(dateStr)
    const day = d.getDay()
    const mon = new Date(d)
    mon.setDate(d.getDate() - (day === 0 ? 6 : day - 1))
    return mon.toISOString().slice(0, 10)
  }

  const diffMap: Record<string, number | null> = {}
  history.forEach(entry => {
    const valid = entry.weeks.filter((w): w is { date: string; score: number } => w.score !== null)
    if (valid.length >= 2) {
      const last = valid[valid.length - 1]
      const prev = valid[valid.length - 2]
      if (getMonWeek(last.date) === getMonWeek(prev.date)) {
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
    return 0
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
  ]

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
                          : 'bg-slate-700 text-white'
                        : 'bg-white/80 backdrop-blur-sm text-slate-600 border border-white/60'
                    }`}
                  >
                    <span>{t.emoji}</span>
                    <span>{t.label}</span>
                    <span className="text-xs opacity-60">({t.count})</span>
                  </button>
                ))}
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
                        const diff = hasScore ? (diffMap[m.닉네임] ?? 0) : 0
                        return (
                          <span className={`block text-xs tabular-nums font-medium ${diff < 0 ? 'text-blue-400' : diff > 0 ? 'text-rose-500' : 'text-slate-300'}`}>
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

              <p className="text-center text-slate-400 text-xs mt-4">1분마다 자동 갱신</p>

              <div className="text-center mt-3">
                <a
                  href="/admin"
                  className="text-xs text-slate-500 hover:text-slate-400 transition"
                >
                  ⚙️ 관리자
                </a>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
