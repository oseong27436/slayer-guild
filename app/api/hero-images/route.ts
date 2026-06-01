import { NextResponse } from 'next/server'

const SUPABASE_URL = process.env.SUPABASE_URL!
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY!

export interface HeroImage {
  url: string
  focalX: number
  focalY: number
}

async function getMeta(): Promise<Record<string, { focalX: number; focalY: number }>> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/hero_image_metadata?select=filename,focal_x,focal_y`, {
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
    cache: 'no-store',
  })
  if (!res.ok) return {}
  const rows: { filename: string; focal_x: number; focal_y: number }[] = await res.json()
  return Object.fromEntries(rows.map(r => [r.filename, { focalX: r.focal_x, focalY: r.focal_y }]))
}

export async function GET() {
  const [listRes, meta] = await Promise.all([
    fetch(`${SUPABASE_URL}/storage/v1/object/list/hero-images`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ limit: 100, offset: 0, prefix: '' }),
      cache: 'no-store',
    }),
    getMeta(),
  ])
  if (!listRes.ok) return NextResponse.json([])
  const files: { name: string }[] = await listRes.json()
  const images: HeroImage[] = files
    .filter(f => f.name)
    .map(f => ({
      url: `${SUPABASE_URL}/storage/v1/object/public/hero-images/${f.name}`,
      focalX: meta[f.name]?.focalX ?? 50,
      focalY: meta[f.name]?.focalY ?? 50,
    }))
  return NextResponse.json(images)
}

export async function POST(req: Request) {
  const formData = await req.formData()
  const file = formData.get('file') as File | null
  const focalX = parseFloat((formData.get('focalX') as string) ?? '50')
  const focalY = parseFloat((formData.get('focalY') as string) ?? '50')
  if (!file) return NextResponse.json({ error: '파일 없음' }, { status: 400 })

  const buffer = await file.arrayBuffer()
  const uploadRes = await fetch(`${SUPABASE_URL}/storage/v1/object/hero-images/${encodeURIComponent(file.name)}`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': file.type || 'image/png',
    },
    body: buffer,
  })
  if (!uploadRes.ok) return NextResponse.json({ error: '업로드 실패' }, { status: 500 })

  await fetch(`${SUPABASE_URL}/rest/v1/hero_image_metadata`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates',
    },
    body: JSON.stringify({ filename: file.name, focal_x: focalX, focal_y: focalY }),
  })

  return NextResponse.json({ ok: true })
}

export async function PATCH(req: Request) {
  const { filename, focalX, focalY } = await req.json()
  await fetch(`${SUPABASE_URL}/rest/v1/hero_image_metadata?filename=eq.${encodeURIComponent(filename)}`, {
    method: 'PATCH',
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates',
    },
    body: JSON.stringify({ filename, focal_x: focalX, focal_y: focalY }),
  })
  // upsert if not exist
  await fetch(`${SUPABASE_URL}/rest/v1/hero_image_metadata`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates',
    },
    body: JSON.stringify({ filename, focal_x: focalX, focal_y: focalY }),
  })
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: Request) {
  const { name } = await req.json()
  const [delFile] = await Promise.all([
    fetch(`${SUPABASE_URL}/storage/v1/object/hero-images/${encodeURIComponent(name)}`, {
      method: 'DELETE',
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
    }),
    fetch(`${SUPABASE_URL}/rest/v1/hero_image_metadata?filename=eq.${encodeURIComponent(name)}`, {
      method: 'DELETE',
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
    }),
  ])
  if (!delFile.ok) return NextResponse.json({ error: '삭제 실패' }, { status: 500 })
  return NextResponse.json({ ok: true })
}
