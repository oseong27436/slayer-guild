import { NextResponse } from 'next/server'

export interface Member {
  번호: string
  길드: string
  닉네임: string
  승급: string
  역할: string
  용협: string
}

const NOTION_TOKEN = process.env.NOTION_TOKEN
const MEMBERS_DB_ID = process.env.NOTION_MEMBERS_DB_ID

export async function GET() {
  const res = await fetch(`https://api.notion.com/v1/databases/${MEMBERS_DB_ID}/query`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${NOTION_TOKEN}`,
      'Notion-Version': '2022-06-28',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      sorts: [{ property: '번호', direction: 'ascending' }],
      page_size: 100,
    }),
    cache: 'no-store',
  })

  if (!res.ok) return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 })

  const data = await res.json()
  const results = data.results || []

  const members: Member[] = results.map((page: any) => {
    const props = page.properties
    return {
      번호: props['번호']?.number?.toString() || '',
      길드: props['길드']?.select?.name || '',
      닉네임: props['닉네임']?.title?.[0]?.plain_text || '',
      승급: props['승급']?.select?.name || '',
      역할: props['역할']?.select?.name || '',
      용협: props['용협']?.number != null ? props['용협'].number.toString() : '-',
    }
  }).filter((m: Member) => m.닉네임)

  return NextResponse.json(members)
}
