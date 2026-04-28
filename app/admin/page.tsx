'use client'

import { useState, useRef, useCallback } from 'react'

interface Row {
  nickname: string
  score: number
}

export default function AdminPage() {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [images, setImages] = useState<File[]>([])
  const [dragging, setDragging] = useState(false)
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const addFiles = useCallback((files: FileList | null) => {
    if (!files) return
    setImages((prev) => [...prev, ...Array.from(files)])
    setRows([])
    setSaved(false)
    setError('')
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setDragging(false)
      addFiles(e.dataTransfer.files)
    },
    [addFiles]
  )

  const handleOCR = async () => {
    setLoading(true)
    setError('')
    try {
      const formData = new FormData()
      images.forEach((img) => formData.append('images', img))
      const res = await fetch('/api/ocr', { method: 'POST', body: formData })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || '오류')
      setRows(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : '오류 발생')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    setError('')
    try {
      const res = await fetch('/api/record', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ records: rows, date }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || '오류')
      setSaved(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : '오류 발생')
    } finally {
      setSaving(false)
    }
  }

  const updateRow = (i: number, field: keyof Row, value: string | number) =>
    setRows((prev) => prev.map((r, j) => (j === i ? { ...r, [field]: value } : r)))

  const removeRow = (i: number) => setRows((prev) => prev.filter((_, j) => j !== i))

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-6">
      <div className="max-w-xl mx-auto">
        <h1 className="text-2xl font-bold mb-1">⚔️ 길드 마스터 툴</h1>
        <p className="text-slate-400 text-sm mb-6">용협 스크린샷 → Claude OCR → 노션 자동 기록</p>

        {/* 날짜 */}
        <div className="mb-4">
          <label className="text-xs text-slate-400 block mb-1">기록 날짜</label>
          <input
            type="date"
            value={date}
            onChange={(e) => { setDate(e.target.value); setSaved(false) }}
            className="bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm"
          />
        </div>

        {/* 이미지 업로드 */}
        <div
          onClick={() => fileInputRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition mb-2 ${
            dragging ? 'border-purple-400 bg-purple-900/20' : 'border-slate-600 hover:border-slate-500'
          }`}
        >
          {images.length ? (
            <div>
              <p className="text-purple-400 font-medium">{images.length}장 선택됨</p>
              <p className="text-slate-500 text-xs mt-1">{images.map((f) => f.name).join(', ')}</p>
            </div>
          ) : (
            <>
              <p className="text-slate-400">스크린샷을 드래그하거나 클릭해서 업로드</p>
              <p className="text-slate-600 text-xs mt-1">여러 장 동시 가능</p>
            </>
          )}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*"
            className="hidden"
            onChange={(e) => addFiles(e.target.files)}
          />
        </div>

        {images.length > 0 && (
          <button
            onClick={() => { setImages([]); setRows([]); setSaved(false) }}
            className="text-xs text-slate-500 hover:text-slate-300 mb-4 block"
          >
            × 초기화
          </button>
        )}

        {/* OCR 버튼 */}
        <button
          onClick={handleOCR}
          disabled={!images.length || loading}
          className="w-full bg-purple-700 hover:bg-purple-600 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl py-3 font-medium mb-6 transition text-sm"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
              Claude가 분석 중...
            </span>
          ) : (
            '🔍 Claude로 점수 추출'
          )}
        </button>

        {/* 에러 */}
        {error && (
          <div className="bg-red-900/30 border border-red-700 rounded-lg px-4 py-3 text-red-300 text-sm mb-4">
            {error}
          </div>
        )}

        {/* 결과 테이블 */}
        {rows.length > 0 && (
          <div className="bg-slate-800 rounded-xl overflow-hidden mb-4">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700">
              <span className="text-sm font-medium text-slate-300">
                추출 결과 <span className="text-purple-400">{rows.length}명</span>
              </span>
              <button
                onClick={() => setRows((r) => [...r, { nickname: '', score: 0 }])}
                className="text-xs text-purple-400 hover:text-purple-300 transition"
              >
                + 행 추가
              </button>
            </div>
            <div className="divide-y divide-slate-700/50">
              {rows.map((row, i) => (
                <div key={i} className="flex items-center gap-2 px-4 py-2">
                  <span className="text-xs text-slate-500 w-5 text-right shrink-0">{i + 1}</span>
                  <input
                    value={row.nickname}
                    onChange={(e) => updateRow(i, 'nickname', e.target.value)}
                    placeholder="닉네임"
                    className="flex-1 bg-slate-700 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-purple-500"
                  />
                  <input
                    type="number"
                    value={row.score}
                    onChange={(e) => updateRow(i, 'score', Number(e.target.value))}
                    className="w-28 bg-slate-700 rounded px-2 py-1.5 text-sm text-right focus:outline-none focus:ring-1 focus:ring-purple-500 tabular-nums"
                  />
                  <button
                    onClick={() => removeRow(i)}
                    className="text-slate-600 hover:text-red-400 text-lg leading-none transition shrink-0"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 저장 버튼 */}
        {rows.length > 0 && (
          <button
            onClick={handleSave}
            disabled={saving || saved}
            className={`w-full rounded-xl py-3 font-medium transition text-sm ${
              saved
                ? 'bg-green-800 text-green-300 cursor-default'
                : 'bg-green-700 hover:bg-green-600 disabled:opacity-40 disabled:cursor-not-allowed'
            }`}
          >
            {saved
              ? `✅ ${rows.length}명 저장 완료 — 웹사이트에서 확인하세요`
              : saving
                ? '저장 중...'
                : `💾 노션에 저장 (히스토리 + 용협 점수, ${rows.length}명)`}
          </button>
        )}
      </div>
    </div>
  )
}
