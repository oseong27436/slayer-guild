import { NextResponse } from 'next/server'

const TOKEN = process.env.NOTION_TOKEN
const HISTORY_DB = process.env.NOTION_HISTORY_DB_ID
const MEMBERS_DB = process.env.NOTION_MEMBERS_DB_ID

interface RecordItem {
  nickname: string
  score: number
}

async function notionApi(method: string, url: string, body?: object) {
  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      'Notion-Version': '2022-06-28',
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
    cache: 'no-store',
  })
  return res.json()
}

export async function POST(req: Request) {
  try {
    const { records, date } = (await req.json()) as { records: RecordItem[]; date: string }

    // 히스토리 DB에 기록
    await Promise.all(
      records.map(({ nickname, score }) =>
        notionApi('POST', 'https://api.notion.com/v1/pages', {
          parent: { database_id: HISTORY_DB },
          properties: {
            닉네임: { title: [{ text: { content: nickname } }] },
            날짜: { date: { start: date } },
            점수: { number: score },
          },
        })
      )
    )

    // 멤버 DB 용협 필드 업데이트
    const membersRes = await notionApi(
      'POST',
      `https://api.notion.com/v1/databases/${MEMBERS_DB}/query`,
      { page_size: 100 }
    )
    const scoreMap = Object.fromEntries(records.map((r) => [r.nickname, r.score]))

    await Promise.all(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      membersRes.results
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .filter((page: any) => {
          const name = page.properties['닉네임']?.title?.[0]?.plain_text || ''
          return name in scoreMap
        })
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .map((page: any) => {
          const name = page.properties['닉네임']?.title?.[0]?.plain_text || ''
          return notionApi('PATCH', `https://api.notion.com/v1/pages/${page.id}`, {
            properties: { 용협: { number: scoreMap[name] } },
          })
        })
    )

    return NextResponse.json({ ok: true, count: records.length })
  } catch (err) {
    console.error('Record error:', err)
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}
