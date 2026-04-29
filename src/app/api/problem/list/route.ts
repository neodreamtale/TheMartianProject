import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const keyword = searchParams.get('keyword') || ''
    const type = searchParams.get('type')
    const status = searchParams.get('status')
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 20)

    const where: any = {}

    if (keyword) {
      where.OR = [
        { code: { contains: keyword, mode: 'insensitive' } },
        { toUser: { contains: keyword, mode: 'insensitive' } },
        { toEngineer: { contains: keyword, mode: 'insensitive' } },
        { devBatch: { contains: keyword, mode: 'insensitive' } },
        { cause: { contains: keyword, mode: 'insensitive' } }
      ]
    }

    if (type && type !== 'ALL') {
      where.type = type
    }

    if (status && status !== 'ALL') {
      where.status = status
    }

    const problems = await prisma.problem.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      take: limit
    })

    return NextResponse.json({ success: true, data: problems })
  } catch (err: any) {
    console.error("API /problem/list error:", err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
