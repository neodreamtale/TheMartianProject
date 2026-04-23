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
        update: {
            updatedAt: new Date()
        },
        create: {
            code: 'ORDER_TIMEOUT_001',
            type: 'BUSINESS',
            toUser: '当前排队人数较多，请稍后刷新重试哦~',
            toEngineer: '【网关超时拦截】上游订单接口调用响应耗时突破P99阈值（>5s），熔断降级生效。',
            cause: 'Redis集群瞬时并发压力超过预设的 QPS 上限导致拥堵。',
            devBatch: '【PRD-2026】火星救援基建一期：限流与熔断系统',
            comments: '这是一个经典的降级安抚策略，务必在触发时引导用户重试。不要擅自修改这句面向用户的软提示文案！—— Mark Watney',
            detailPage: '/help/order-timeout'
        },
    })

    // 2. 一条支付相关的业务拦截（BUSINESS）
    const problem2 = await prisma.problem.upsert({
        where: { code: 'PAY_BALANCE_NO_ENOUGH' },
        update: {
            updatedAt: new Date()
        },
        create: {
            code: 'PAY_BALANCE_NO_ENOUGH',
            type: 'BUSINESS',
            toUser: '您当前的钱包余额似乎不太够啦，可以考虑换个支付方式哦',
            toEngineer: '【非异常常态阻断】调用财务中台查询用户主钱包余额时，发现可用余额(available)小于需扣减极金额。',
            cause: '纯纯的业务前置规则验证不通过，穷病。',
            devBatch: '【PRD-2026】财务收银台2.0重构项目',
            comments: '这是最高频的业务阻断之一。前端在拿到这个错误码（Action）后，后续应被指派唤起支付切换面板弹窗。',
        },
    })

    // 3. 一条严重的系统级崩溃（SYSTEM）
    const problem3 = await prisma.problem.upsert({
        where: { code: 'SYS_DB_CONN_LOST_999' },
        update: {
            updatedAt: new Date()
        },
        create: {
            code: 'SYS_DB_CONN_LOST_999',
            type: 'SYSTEM',
            toUser: '糟糕，火星人好像把我们的服务器电缆拔了，工程师正在抢修中！',
            toEngineer: '【FATAL极危】核心账本数据库 (Postgres-Master) 出现无法建立连接、TCP探活连续3次失败的极端物理故障！！！',
            cause: '机房底层光缆被挖断，或是单点实例CPU被瞬间死锁被打挂。',
            devBatch: '【PRD-2026】P0级灾备降级与兜底方案建设',
            comments: '遇到这个码，后台系统应当直接拨打 DBA（数据库运维）的手机并拉响最高 P0 警报。前端必须渲染脱网兜底的 /maintenance 页。',
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
