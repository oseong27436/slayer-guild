import { NextResponse } from 'next/server'

const SUPABASE_URL = process.env.SUPABASE_URL!
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY!

export async function GET() {
  const res = await fetch(`${SUPABASE_URL}/storage/v1/object/list/hero-images`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ limit: 100, offset: 0, prefix: '' }),
    cache: 'no-store',
  })
  if (!res.ok) return NextResponse.json([])
  const files: { name: string }[] = await res.json()
  const urls = files
    .filter(f => f.name)
    .map(f => `${SUPABASE_URL}/storage/v1/object/public/hero-images/${f.name}`)
  return NextResponse.json(urls)
}

export async function POST(req: Request) {
  const formData = await req.formData()
  const file = formData.get('file') as File | null
  if (!file) return NextResponse.json({ error: '파일 없음' }, { status: 400 })

  const buffer = await file.arrayBuffer()
  const res = await fetch(`${SUPABASE_URL}/storage/v1/object/hero-images/${encodeURIComponent(file.name)}`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': file.type || 'image/png',
    },
    body: buffer,
  })
  if (!res.ok) return NextResponse.json({ error: '업로드 실패' }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: Request) {
  const { name } = await req.json()
  const res = await fetch(`${SUPABASE_URL}/storage/v1/object/hero-images/${encodeURIComponent(name)}`, {
    method: 'DELETE',
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
    },
  })
  if (!res.ok) return NextResponse.json({ error: '삭제 실패' }, { status: 500 })
  return NextResponse.json({ ok: true })
}
