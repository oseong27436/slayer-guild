import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic()

export async function POST(req: Request) {
  try {
    const formData = await req.formData()
    const images = formData.getAll('images') as File[]

    if (!images.length) {
      return NextResponse.json({ error: '이미지가 없습니다' }, { status: 400 })
    }

    const imageBlocks = await Promise.all(
      images.map(async (file) => {
        const buffer = Buffer.from(await file.arrayBuffer())
        return {
          type: 'image' as const,
          source: {
            type: 'base64' as const,
            media_type: file.type as 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif',
            data: buffer.toString('base64'),
          },
        }
      })
    )

    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: [
            ...imageBlocks,
            {
              type: 'text',
              text: '이 스크린샷들은 게임의 용사협력(용협) 순위 화면입니다. 보이는 모든 닉네임과 점수를 추출해주세요. 점수는 쉼표 없는 숫자로 반환하세요.',
            },
          ],
        },
      ],
      output_config: {
        format: {
          type: 'json_schema',
          schema: {
            type: 'object',
            properties: {
              records: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    nickname: { type: 'string' },
                    score: { type: 'number' },
                  },
                  required: ['nickname', 'score'],
                  additionalProperties: false,
                },
              },
            },
            required: ['records'],
            additionalProperties: false,
          },
        },
      },
    })

    const textBlock = response.content.find((b) => b.type === 'text')
    if (!textBlock || textBlock.type !== 'text') {
      return NextResponse.json({ error: '추출 실패' }, { status: 500 })
    }

    const data = JSON.parse(textBlock.text) as { records: { nickname: string; score: number }[] }
    return NextResponse.json(data.records)
  } catch (err) {
    console.error('OCR error:', err)
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}
