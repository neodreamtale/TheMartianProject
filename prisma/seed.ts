import { PrismaClient } from '../src/generated/prisma/client'
import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'

// 如果在 node 里没有自动读区到 .env，可以用 dotenv 加载环境变量
import 'dotenv/config'

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

async function main() {
  console.log(`开始向数据库灌入初始 Martian 异常元数据 ...\n`)

  // 1. 一条常规的业务报错（BUSINESS）
  const problem1 = await prisma.problem.upsert({
    where: { code: 'ORDER_TIMEOUT_001' },
    update: {},
    create: {
      code: 'ORDER_TIMEOUT_001',
      type: 'BUSINESS',
      toUser: '当前排队人数较多，请稍后刷新重试哦~',
      description: '用户下单时网关响应超过了5秒未成功，触发的降级安抚策略。',
      detailPage: '/help/order-timeout'
    },
  })

  // 2. 一条支付相关的业务拦截（BUSINESS）
  const problem2 = await prisma.problem.upsert({
    where: { code: 'PAY_BALANCE_NO_ENOUGH' },
    update: {},
    create: {
      code: 'PAY_BALANCE_NO_ENOUGH',
      type: 'BUSINESS',
      toUser: '您当前的钱包余额似乎不太够啦，可以考虑换个支付方式哦',
      description: '支付链路中查询到用户内部钱包余额 ＜ 订单需要扣减的值。',
    },
  })

  // 3. 一条严重的系统级崩溃（SYSTEM）
  const problem3 = await prisma.problem.upsert({
    where: { code: 'SYS_DB_CONN_LOST_999' },
    update: {},
    create: {
      code: 'SYS_DB_CONN_LOST_999',
      type: 'SYSTEM',
      toUser: '糟糕，火星人好像把我们的服务器电缆拔了，工程师正在抢修中！',
      description: '出现了致命的核心业务数据库连接中断（如Postgres服务宕机）。',
      detailPage: '/maintenance' 
    },
  })

  console.log('Seed 数据注入完成：')
  console.log({ problem1, problem2, problem3 })
}

main()
  .catch((e) => {
    console.error('Seed 执行失败：', e)
    process.exit(1)
  })
  .finally(async () => {
    // 运行完了必须断开数据库连接
    await prisma.$disconnect()
  })
