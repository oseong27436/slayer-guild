'use client'

import { useState, useEffect } from 'react'

interface PromotionRequest {
  id: string
  닉네임: string
  현재승급: string
  요청승급: string
  요청일: string
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

const ROLE_OPTIONS = ['', '부길드마스터', '길드마스터'] as const
type Role = typeof ROLE_OPTIONS[number]
const ROLE_LABELS: Record<Role, string> = { '': '없음', '부길드마스터': '부길마', '길드마스터': '길드마스터' }

function AddMemberModal({ onClose }: { onClose: () => void }) {
  const [닉네임, set닉네임] = useState('')
  const [길드, set길드] = useState<'루나' | '별'>('루나')
  const [idx, setIdx] = useState(PROMOTION_ORDER.length - 1) // 블리츠골드부터
  const [역할, set역할] = useState<Role>('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')

  const 승급 = PROMOTION_ORDER[idx]
  const prev = () => setIdx(i => (i - 1 + PROMOTION_ORDER.length) % PROMOTION_ORDER.length)
  const next = () => setIdx(i => (i + 1) % PROMOTION_ORDER.length)

  const submit = async () => {
    if (!닉네임.trim()) return
    setStatus('loading')
    const res = await fetch('/api/add-member', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 닉네임: 닉네임.trim(), 길드, 승급, 역할 }),
    })
    if (!res.ok) { setStatus('error'); return }
    setStatus('done')
    setTimeout(onClose, 1200)
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 px-4" onClick={onClose}>
      <div className="bg-slate-800 rounded-2xl w-full max-w-sm shadow-xl overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="px-5 pt-5 pb-5">
          <h2 className="text-base font-bold text-white mb-4 text-center">👤 길드원 추가</h2>

          {status === 'done' ? (
            <div className="text-center py-6">
              <p className="text-green-400 font-medium text-lg">✅ 추가 완료!</p>
            </div>
          ) : (
            <>
              <input
                value={닉네임}
                onChange={e => set닉네임(e.target.value)}
                placeholder="닉네임"
                autoFocus
                className="w-full bg-slate-700 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-purple-500 mb-3"
              />

              {/* 길드 선택 */}
              <div className="flex gap-2 mb-4">
                {(['루나', '별'] as const).map(g => (
                  <button
                    key={g}
                    onClick={() => set길드(g)}
                    className={`flex-1 py-2 rounded-xl text-sm font-medium transition ${
                      길드 === g
                        ? g === '루나' ? 'bg-purple-600 text-white' : 'bg-yellow-500 text-white'
                        : 'bg-slate-700 text-slate-400'
                    }`}
                  >
                    {g === '루나' ? '🌙' : '⭐'} {g}
                  </button>
                ))}
              </div>

              {/* 승급 이미지 선택 */}
              <div className="flex items-center justify-between gap-2 mb-2">
                <button onClick={prev} className="w-9 h-9 flex items-center justify-center rounded-full bg-slate-700 hover:bg-slate-600 text-slate-300 text-lg shrink-0">‹</button>
                <div className="flex-1 flex flex-col items-center py-3">
                  {HAS_IMAGE.has(승급) ? (
                    <img src={`/promotion/${승급}.webp`} alt={승급} className="w-16 h-16 object-contain" />
                  ) : (
                    <div className="w-16 h-16 flex items-center justify-center bg-slate-700 rounded-full text-slate-400 text-xs">{승급}</div>
                  )}
                  <p className="mt-2 font-bold text-white text-sm">{승급}</p>
                </div>
                <button onClick={next} className="w-9 h-9 flex items-center justify-center rounded-full bg-slate-700 hover:bg-slate-600 text-slate-300 text-lg shrink-0">›</button>
              </div>

              {/* 인디케이터 */}
              <div className="flex justify-center gap-0.5 mb-4">
                {PROMOTION_ORDER.map((_, i) => (
                  <div key={i} onClick={() => setIdx(i)}
                    className={`h-1 rounded-full cursor-pointer transition-all ${i === idx ? 'w-4 bg-purple-500' : 'w-1 bg-slate-600'}`} />
                ))}
              </div>

              <div className="flex gap-1.5 mb-4">
                {ROLE_OPTIONS.map(r => (
                  <button
                    key={r}
                    onClick={() => set역할(r)}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition ${
                      역할 === r ? 'bg-purple-600 text-white' : 'bg-slate-700 text-slate-400'
                    }`}
                  >
                    {ROLE_LABELS[r]}
                  </button>
                ))}
              </div>

              <div className="flex gap-2">
                <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm text-slate-400 bg-slate-700">취소</button>
                <button
                  onClick={submit}
                  disabled={!닉네임.trim() || status === 'loading'}
                  className="flex-1 py-2.5 rounded-xl text-sm font-medium bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white"
                >
                  {status === 'loading' ? '추가 중...' : '추가'}
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

interface MemberWithId {
  id: string
  닉네임: string
  길드: string
  승급: string
  역할: string
  용협?: number | null
}

function EditMemberModal({ onClose }: { onClose: () => void }) {
  const [members, setMembers] = useState<MemberWithId[]>([])
  const [selected, setSelected] = useState<MemberWithId | null>(null)
  const [닉네임, set닉네임] = useState('')
  const [길드, set길드] = useState<'루나' | '별'>('루나')
  const [idx, setIdx] = useState(0)
  const [역할, set역할] = useState<Role>('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [confirmDelete, setConfirmDelete] = useState(false)

  useEffect(() => {
    fetch('/api/edit-member').then(r => r.json()).then(setMembers).catch(() => {})
  }, [])

  const select = (m: MemberWithId) => {
    setSelected(m)
    set닉네임(m.닉네임)
    set길드(m.길드 as '루나' | '별')
    setIdx(Math.max(0, PROMOTION_ORDER.indexOf(m.승급)))
    set역할((m.역할 as Role) || '')
    setStatus('idle')
    setConfirmDelete(false)
  }

  const 승급 = PROMOTION_ORDER[idx]
  const prev = () => setIdx(i => (i - 1 + PROMOTION_ORDER.length) % PROMOTION_ORDER.length)
  const next = () => setIdx(i => (i + 1) % PROMOTION_ORDER.length)

  const save = async () => {
    if (!selected) return
    setStatus('loading')
    const res = await fetch('/api/edit-member', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: selected.id,
        닉네임: 닉네임.trim(),
        길드,
        승급,
        역할,
      }),
    })
    setStatus(res.ok ? 'done' : 'error')
    if (res.ok) setTimeout(onClose, 1000)
  }

  const remove = async () => {
    if (!selected) return
    setStatus('loading')
    const res = await fetch('/api/edit-member', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: selected.id, 닉네임: selected.닉네임 }),
    })
    setStatus(res.ok ? 'done' : 'error')
    if (res.ok) setTimeout(onClose, 1000)
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 px-4" onClick={onClose}>
      <div className="bg-slate-800 rounded-2xl w-full max-w-sm shadow-xl overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="px-5 pt-5 pb-5">
          <h2 className="text-base font-bold text-white mb-4 text-center">✏️ 길드원 수정</h2>

          {status === 'done' ? (
            <div className="text-center py-6">
              <p className="text-green-400 font-medium text-lg">✅ 완료!</p>
            </div>
          ) : (
            <>
              {/* 멤버 선택 */}
              <select
                value={selected?.id || ''}
                onChange={e => { const m = members.find(m => m.id === e.target.value); if (m) select(m) }}
                className="w-full bg-slate-700 rounded-xl px-3 py-2.5 text-sm text-white mb-4 focus:outline-none focus:ring-1 focus:ring-purple-500"
              >
                <option value="">멤버를 선택하세요</option>
                {members.map(m => (
                  <option key={m.id} value={m.id}>{m.닉네임} ({m.길드} · {m.승급})</option>
                ))}
              </select>

              {selected && (
                <>
                  {/* 닉네임 */}
                  <input
                    value={닉네임}
                    onChange={e => set닉네임(e.target.value)}
                    placeholder="닉네임"
                    className="w-full bg-slate-700 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-purple-500 mb-3"
                  />

                  {/* 길드 */}
                  <div className="flex gap-2 mb-4">
                    {(['루나', '별'] as const).map(g => (
                      <button
                        key={g}
                        onClick={() => set길드(g)}
                        className={`flex-1 py-2 rounded-xl text-sm font-medium transition ${
                          길드 === g
                            ? g === '루나' ? 'bg-purple-600 text-white' : 'bg-yellow-500 text-white'
                            : 'bg-slate-700 text-slate-400'
                        }`}
                      >
                        {g === '루나' ? '🌙' : '⭐'} {g}
                      </button>
                    ))}
                  </div>

                  {/* 승급 이미지 캐러셀 */}
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <button onClick={prev} className="w-9 h-9 flex items-center justify-center rounded-full bg-slate-700 hover:bg-slate-600 text-slate-300 text-lg shrink-0">‹</button>
                    <div className="flex-1 flex flex-col items-center py-2">
                      {HAS_IMAGE.has(승급) ? (
                        <img src={`/promotion/${승급}.webp`} alt={승급} className="w-14 h-14 object-contain" />
                      ) : (
                        <div className="w-14 h-14 flex items-center justify-center bg-slate-700 rounded-full text-slate-400 text-xs">{승급}</div>
                      )}
                      <p className="mt-1.5 font-bold text-white text-sm">{승급}</p>
                    </div>
                    <button onClick={next} className="w-9 h-9 flex items-center justify-center rounded-full bg-slate-700 hover:bg-slate-600 text-slate-300 text-lg shrink-0">›</button>
                  </div>
                  <div className="flex justify-center gap-0.5 mb-4">
                    {PROMOTION_ORDER.map((_, i) => (
                      <div key={i} onClick={() => setIdx(i)}
                        className={`h-1 rounded-full cursor-pointer transition-all ${i === idx ? 'w-4 bg-purple-500' : 'w-1 bg-slate-600'}`} />
                    ))}
                  </div>

                  {/* 역할 */}
                  <div className="flex gap-1.5 mb-4">
                    {ROLE_OPTIONS.map(r => (
                      <button
                        key={r}
                        onClick={() => set역할(r)}
                        className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition ${
                          역할 === r ? 'bg-purple-600 text-white' : 'bg-slate-700 text-slate-400'
                        }`}
                      >
                        {ROLE_LABELS[r]}
                      </button>
                    ))}
                  </div>

                  {/* 저장 / 삭제 */}
                  {!confirmDelete ? (
                    <div className="flex gap-2">
                      <button onClick={() => setConfirmDelete(true)} className="px-3 py-2.5 rounded-xl text-xs text-red-400 bg-red-900/30 hover:bg-red-900/50">삭제</button>
                      <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm text-slate-400 bg-slate-700">취소</button>
                      <button
                        onClick={save}
                        disabled={!닉네임.trim() || status === 'loading'}
                        className="flex-1 py-2.5 rounded-xl text-sm font-medium bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white"
                      >
                        {status === 'loading' ? '저장 중...' : '저장'}
                      </button>
                    </div>
                  ) : (
                    <div className="bg-red-900/30 rounded-xl p-3">
                      <p className="text-red-300 text-sm text-center mb-3">{닉네임}을 정말 삭제할까요?</p>
                      <div className="flex gap-2">
                        <button onClick={() => setConfirmDelete(false)} className="flex-1 py-2 rounded-xl text-sm text-slate-400 bg-slate-700">취소</button>
                        <button onClick={remove} className="flex-1 py-2 rounded-xl text-sm font-medium bg-red-700 hover:bg-red-600 text-white">삭제</button>
                      </div>
                    </div>
                  )}
                  {status === 'error' && <p className="text-red-400 text-xs text-center mt-2">오류가 발생했어요</p>}
                </>
              )}

              {!selected && (
                <button onClick={onClose} className="w-full py-2.5 rounded-xl text-sm text-slate-400 bg-slate-700">닫기</button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function ReorderModal({ onClose }: { onClose: () => void }) {
  const [members, setMembers] = useState<MemberWithId[]>([])
  const [order, setOrder] = useState<MemberWithId[]>([])
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)

  useEffect(() => {
    fetch('/api/edit-member').then(r => r.json()).then((data: MemberWithId[]) => {
      setMembers(data)
      setOrder(data)
    }).catch(() => {})
  }, [])

  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir
    if (j < 0 || j >= order.length) return
    setOrder(prev => {
      const next = [...prev]
      ;[next[i], next[j]] = [next[j], next[i]]
      return next
    })
  }

  const save = async () => {
    setSaving(true)
    const updates = order.map((m, i) => ({ id: m.id, 번호: i + 1 }))
    await fetch('/api/reorder-member', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    })
    setDone(true)
    setTimeout(onClose, 1000)
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 px-4" onClick={onClose}>
      <div className="bg-slate-800 rounded-2xl w-full max-w-sm shadow-xl flex flex-col max-h-[85vh]" onClick={e => e.stopPropagation()}>
        <div className="px-5 pt-5 pb-3 shrink-0">
          <h2 className="text-base font-bold text-white text-center">🔢 기본 탭 순서 정렬</h2>
          <p className="text-xs text-slate-500 text-center mt-1">↑ ↓ 으로 순서를 조정하세요</p>
        </div>

        {done ? (
          <div className="text-center py-8"><p className="text-green-400 font-medium">✅ 저장 완료!</p></div>
        ) : (
          <>
            <div className="overflow-y-auto flex-1 px-5">
              <div className="divide-y divide-slate-700">
                {order.map((m, i) => (
                  <div key={m.id} className="flex items-center gap-2 py-2">
                    <span className="text-xs text-slate-500 w-5 text-right shrink-0">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <span className={`text-xs font-bold mr-1.5 ${m.길드 === '루나' ? 'text-purple-400' : 'text-yellow-400'}`}>{m.길드}</span>
                      <span className="text-sm text-white">
                        {m.역할 === '길드마스터' ? '👑 ' : m.역할 === '부길드마스터' ? <span style={{filter:'grayscale(1) brightness(1.8)'}}>👑 </span> : ''}
                        {m.닉네임}
                      </span>
                      <span className="text-xs text-slate-500 ml-1.5">{m.승급}</span>
                    </div>
                    <div className="flex flex-col gap-0.5 shrink-0">
                      <button onClick={() => move(i, -1)} disabled={i === 0} className="w-6 h-5 flex items-center justify-center rounded bg-slate-700 hover:bg-slate-600 disabled:opacity-20 text-slate-300 text-xs">↑</button>
                      <button onClick={() => move(i, 1)} disabled={i === order.length - 1} className="w-6 h-5 flex items-center justify-center rounded bg-slate-700 hover:bg-slate-600 disabled:opacity-20 text-slate-300 text-xs">↓</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="px-5 py-4 shrink-0 flex gap-2 border-t border-slate-700">
              <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm text-slate-400 bg-slate-700">취소</button>
              <button onClick={save} disabled={saving} className="flex-1 py-2.5 rounded-xl text-sm font-medium bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white">
                {saving ? '저장 중...' : '저장'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default function AdminPage() {
  const [role, setRole] = useState<'master' | 'manager'>('master')
  const [date, setDate] = useState(new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' }))
  const [members, setMembers] = useState<MemberWithId[]>([])
  const [todayScores, setTodayScores] = useState<Record<string, string>>({})
  const [loadingScores, setLoadingScores] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [requests, setRequests] = useState<PromotionRequest[]>([])
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showReorderModal, setShowReorderModal] = useState(false)

  useEffect(() => {
    const match = document.cookie.split(';').find(c => c.trim().startsWith('admin_role='))
    if (match?.split('=')[1] === 'manager') setRole('manager')
  }, [])

  useEffect(() => {
    fetch('/api/promotion-request').then(r => r.json()).then(setRequests).catch(() => {})
  }, [])

  useEffect(() => {
    fetch('/api/edit-member')
      .then(r => r.json())
      .then((data: MemberWithId[]) => { setMembers(data); setLoadingScores(false) })
      .catch(() => setLoadingScores(false))
  }, [])

  const handleAction = async (req: PromotionRequest, action: 'approve' | 'reject') => {
    setActionLoading(req.id)
    await fetch('/api/promotion-request', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: req.id, action, 닉네임: req.닉네임, 요청승급: req.요청승급 }),
    })
    setRequests(prev => prev.filter(r => r.id !== req.id))
    setActionLoading(null)
  }

  const handleSave = async () => {
    const records = members
      .filter(m => todayScores[m.닉네임] && todayScores[m.닉네임] !== '')
      .map(m => ({ nickname: m.닉네임, score: Number(todayScores[m.닉네임]) }))
    if (!records.length) return
    setSaving(true)
    setError('')
    try {
      const res = await fetch('/api/record', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ records, date }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || '오류')
      setSaved(true)
      setMembers(prev => prev.map(m =>
        todayScores[m.닉네임] ? { ...m, 용협: Number(todayScores[m.닉네임]) } : m
      ))
      setTodayScores({})
    } catch (e) {
      setError(e instanceof Error ? e.message : '오류 발생')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-6">
      <div className="max-w-xl mx-auto">
        <h1 className="text-2xl font-bold mb-4">
          {role === 'manager' ? '⚔️ 길드 관리자 툴' : '⚔️ 길드 마스터 툴'}
        </h1>

        {/* 접속 현황 대시보드 — 마스터만 */}

        {/* 길드원 관리 버튼 */}
        <div className="grid grid-cols-3 gap-2 mb-6">
          <button onClick={() => setShowAddModal(true)} className="py-2.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs font-medium transition">👤 추가</button>
          <button onClick={() => setShowEditModal(true)} className="py-2.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs font-medium transition">✏️ 수정</button>
          <button onClick={() => setShowReorderModal(true)} className="py-2.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs font-medium transition">🔢 순서</button>
        </div>
        {showAddModal && <AddMemberModal onClose={() => setShowAddModal(false)} />}
        {showEditModal && <EditMemberModal onClose={() => setShowEditModal(false)} />}
        {showReorderModal && <ReorderModal onClose={() => setShowReorderModal(false)} />}

        {/* 승급 변경 요청 */}
        {requests.length > 0 && (
          <div className="mb-6 bg-yellow-900/30 border border-yellow-700/50 rounded-xl p-4">
            <h2 className="text-sm font-bold text-yellow-400 mb-3">⬆️ 승급 변경 요청 ({requests.length}건)</h2>
            <div className="space-y-2">
              {requests.map(req => (
                <div key={req.id} className="flex items-center gap-2 bg-slate-800 rounded-lg px-3 py-2">
                  <div className="flex-1 text-sm">
                    <span className="font-medium text-white">{req.닉네임}</span>
                    <span className="text-slate-400 mx-1">·</span>
                    <span className="text-slate-400 text-xs">{req.현재승급} → </span>
                    <span className="text-yellow-300 text-xs font-medium">{req.요청승급}</span>
                  </div>
                  <button
                    onClick={() => handleAction(req, 'approve')}
                    disabled={actionLoading === req.id}
                    className="text-xs bg-green-700 hover:bg-green-600 text-white rounded-lg px-3 py-1.5 disabled:opacity-40"
                  >
                    승인
                  </button>
                  <button
                    onClick={() => handleAction(req, 'reject')}
                    disabled={actionLoading === req.id}
                    className="text-xs bg-red-800 hover:bg-red-700 text-white rounded-lg px-3 py-1.5 disabled:opacity-40"
                  >
                    거절
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mb-6" />

        {/* 날짜 */}
        <div className="mb-4 flex items-center gap-3">
          <div>
            <label className="text-xs text-slate-400 block mb-1">기록 날짜</label>
            <input
              type="date"
              value={date}
              onChange={(e) => { setDate(e.target.value); setSaved(false) }}
              className="bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm"
            />
          </div>
          {saved && (
            <span className="text-green-400 text-sm mt-4">✅ 저장 완료!</span>
          )}
        </div>

        {/* 에러 */}
        {error && (
          <div className="bg-red-900/30 border border-red-700 rounded-lg px-4 py-3 text-red-300 text-sm mb-4">
            {error}
          </div>
        )}

        {/* 점수 입력 — 루나 / 별 */}
        {loadingScores ? (
          <div className="text-slate-500 text-sm text-center py-8">불러오는 중...</div>
        ) : (
          <>
            {(['루나', '별'] as const).map(guild => {
              const guildMembers = members.filter(m => m.길드 === guild)
              return (
                <div key={guild} className="mb-6 bg-slate-800 rounded-xl overflow-hidden">
                  <div className="px-4 py-3 border-b border-slate-700 flex items-center gap-2">
                    <span className="text-sm font-bold text-slate-300">
                      {guild === '루나' ? '🌙' : '⭐'} {guild}
                    </span>
                    <span className="text-xs text-slate-500">({guildMembers.length}명)</span>
                  </div>
                  <div className="divide-y divide-slate-700/50">
                    <div className="flex items-center gap-2 px-4 py-1.5 text-xs text-slate-500">
                      <span className="flex-1">닉네임</span>
                      <span className="w-24 text-right">기존점수</span>
                      <span className="w-28 text-right">오늘점수</span>
                    </div>
                    {guildMembers.map(m => (
                      <div key={m.id} className="flex items-center gap-2 px-4 py-2">
                        <span className="flex-1 text-sm text-white">
                          {m.역할 === '길드마스터' ? '👑 ' : m.역할 === '부길드마스터' ? '⚜️ ' : ''}{m.닉네임}
                        </span>
                        <span className="w-24 text-right text-sm text-slate-400 tabular-nums">
                          {m.용협 != null ? m.용협.toLocaleString() : '—'}
                        </span>
                        <input
                          type="number"
                          value={todayScores[m.닉네임] ?? ''}
                          onChange={e => {
                            setSaved(false)
                            setTodayScores(prev => ({ ...prev, [m.닉네임]: e.target.value }))
                          }}
                          placeholder="0"
                          className="w-28 bg-slate-700 rounded px-2 py-1.5 text-sm text-right focus:outline-none focus:ring-1 focus:ring-purple-500 tabular-nums placeholder-slate-600"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}

            {/* 저장 버튼 */}
            {(() => {
              const cnt = members.filter(m => todayScores[m.닉네임] && todayScores[m.닉네임] !== '').length
              return (
                <button
                  onClick={handleSave}
                  disabled={saving || cnt === 0}
                  className="w-full rounded-xl py-3 font-medium transition text-sm bg-green-700 hover:bg-green-600 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {saving ? '저장 중...' : `💾 DB 저장 (${cnt}명)`}
                </button>
              )
            })()}
          </>
        )}
      </div>
    </div>
  )
}
