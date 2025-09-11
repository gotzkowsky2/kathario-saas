import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { parseAuthCookie } from '@/lib/auth'

async function getCurrentEmployee(request: NextRequest) {
  const cookieName = process.env.NODE_ENV === 'production' ? '__Host-kathario_auth' : 'kathario_auth'
  const token = request.cookies.get(cookieName)?.value
  if (token) {
    const payload = parseAuthCookie(token)
    if (payload?.userId) {
      const employee = await prisma.employee.findUnique({
        where: { id: payload.userId },
        select: { id: true, name: true, tenantId: true }
      })
      if (employee) return employee
    }
  }

  const legacyId = request.cookies.get('employee_auth')?.value || request.cookies.get('admin_auth')?.value
  if (legacyId) {
    const employee = await prisma.employee.findUnique({
      where: { id: legacyId },
      select: { id: true, name: true, tenantId: true }
    })
    if (employee) return employee
  }

  throw new Error('로그인이 필요합니다.')
}

export async function GET(request: NextRequest) {
  try {
    const employee = await getCurrentEmployee(request)
    const { searchParams } = new URL(request.url)
    const days = Math.max(1, parseInt(searchParams.get('days') || '2', 10))

    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - days)

    // 최근 업데이트가 없거나(days 이상) 재고가 최소치 이하인 항목을 상위 20개 반환
    const items = await prisma.inventoryItem.findMany({
      where: {
        tenantId: employee.tenantId,
        OR: [
          { lastUpdated: { lt: cutoff } },
          { checks: { none: {} } },
        ],
        isActive: true,
      },
      orderBy: [
        { lastUpdated: 'asc' },
        { updatedAt: 'asc' },
      ],
      take: 20,
    })

    const enriched = items.map((it) => {
      const baseDate = (it as any).lastUpdated || (it as any).updatedAt
      const last = baseDate ? new Date(baseDate) : new Date(0)
      const diffMs = Date.now() - last.getTime()
      const daysSinceUpdate = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)))
      return {
        id: it.id,
        name: it.name,
        category: it.category,
        currentStock: it.currentStock,
        minStock: it.minStock,
        unit: it.unit,
        lastUpdated: it.lastUpdated,
        createdAt: (it as any).createdAt,
        lastCheckedBy: (it as any).lastCheckedBy || null,
        daysSinceUpdate,
      }
    })

    const res = NextResponse.json({ items: enriched })
    res.headers.set('Cache-Control', 'public, s-maxage=15, stale-while-revalidate=30')
    return res
  } catch (e: any) {
    const message = typeof e?.message === 'string' ? e.message : '조회 실패'
    const status = message.includes('로그인이 필요') ? 401 : 500
    return NextResponse.json({ error: message }, { status })
  }
}


