import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: Request) {
  try {
    // 1. 读取传进来的整盘 JSON 数据
    const importedProblems = await request.json()

    if (!Array.isArray(importedProblems)) {
      return NextResponse.json({ error: '无效的数据格式，期望收到一个对象数组' }, { status: 400 })
    }

    let successCount = 0

    // 2. 核心：遍历这个 JSON 并在当前环境进行 Upsert 应用！
    for (const item of importedProblems) {
      if (!item.code) continue // 防御性编程：跳过没有 code 的脏数据

      await prisma.problem.upsert({
        where: { code: item.code }, // 永远以唯一错误码为标识准星
        update: {
          toUser: item.toUser,     
          toEngineer: item.toEngineer,
          cause: item.cause,
          comments: item.comments,
          status: item.status,     // 同步线上启用/停用状态
          type: item.type,
          detailPage: item.detailPage,
          devBatch: item.devBatch, // 可能会更新批次归属
          updatedAt: new Date()
        },
        create: {
          // 如果是本环境没见过的新错误码，则全量插入
          code: item.code,
          type: item.type || 'BUSINESS',
          status: item.status || 'ACTIVE',
          toUser: item.toUser,
          toEngineer: item.toEngineer || '',
          cause: item.cause || '',
          comments: item.comments || '',
          devBatch: item.devBatch || 'MIGRATION',
          detailPage: item.detailPage,
        }
      })
      successCount++
    }

    return NextResponse.json({ 
      success: true, 
      message: `太棒了！已成功将 ${successCount} 条 Martian 规则同步到了当前环境数据库！` 
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
