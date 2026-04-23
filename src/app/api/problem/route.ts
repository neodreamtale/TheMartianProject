import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    
    if (!code) {
      return NextResponse.json({ error: '缺少错误码参数' }, { status: 400 })
    }

    const problem = await prisma.problem.findUnique({
      where: { code }
    })

    if (!problem) {
      return NextResponse.json({ found: false })
    }

    return NextResponse.json({ found: true, data: problem })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { code, type, status, detailPage, toUser, toEngineer, cause, devBatch, comments } = body

    if (!code || !devBatch) {
      return NextResponse.json({ error: '【Code】和【研发批次】是必填的核心标识' }, { status: 400 })
    }

    const result = await prisma.problem.upsert({
      where: { code },
      update: { type, status, detailPage, toUser, toEngineer, cause, devBatch, comments, updatedAt: new Date() },
      create: { code, type, status, detailPage, toUser, toEngineer, cause, devBatch, comments }
    })

    return NextResponse.json({ success: true, data: result })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
