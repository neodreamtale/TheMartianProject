import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: Request) {
  try {
    // 1. 获取 URL 上的开发批次号，例如 ?devBatch=【PRD-2026】财务收银台2.0重构项目
    const { searchParams } = new URL(request.url)
    const devBatch = searchParams.get('devBatch')

    if (!devBatch) {
      return NextResponse.json(
        { error: '必须提供 devBatch (批次号) 才能执行导出' },
        { status: 400 }
      )
    }

    // 2. 从库捞出这批特定的报错字典
    const exportedConfigs = await prisma.problem.findMany({
      where: { devBatch: devBatch },
      // 为了跨环境通用，我们可以只选取需要迁移的配置字段，去掉 ID 等本地私有信息
      select: {
        code: true,
        type: true,
        status: true,
        detailPage: true,
        toUser: true,
        toEngineer: true,
        cause: true,
        devBatch: true,
        comments: true,
      }
    })

    if (exportedConfigs.length === 0) {
      return NextResponse.json(
        { message: '该批次号下没有找到任何关联的异常码配置' },
        { status: 404 }
      )
    }

    // 3. ✨ 转化为可下载的 JSON 文件响应！
    return new NextResponse(JSON.stringify(exportedConfigs, null, 2), {
      status: 200,
      headers: {
        'Content-Disposition': `attachment; filename="martian-export-${encodeURIComponent(devBatch)}.json"`,
        'Content-Type': 'application/json',
      },
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
