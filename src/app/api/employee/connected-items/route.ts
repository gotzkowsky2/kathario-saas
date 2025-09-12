import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { parseAuthCookie } from '@/lib/auth'

async function getTenantId(request: NextRequest): Promise<string> {
  const cookieName = process.env.NODE_ENV === 'production' ? '__Host-kathario_auth' : 'kathario_auth'
  const token = request.cookies.get(cookieName)?.value
  if (token) {
    const p = parseAuthCookie(token)
    if (p?.tenantId) return p.tenantId
  }
  // 폴백: employee_auth/admin_auth로 조회
  const legacyId = request.cookies.get('employee_auth')?.value || request.cookies.get('admin_auth')?.value
  if (legacyId) {
    const emp = await prisma.employee.findUnique({ where: { id: legacyId }, select: { tenantId: true } })
    if (emp?.tenantId) return emp.tenantId
  }
  throw new Error('로그인이 필요합니다.')
}

export async function GET(request: NextRequest) {
  try {
    const tenantId = await getTenantId(request)
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') as 'inventory' | 'precaution' | 'manual' | null
    const id = searchParams.get('id')
    if (!type || !id) {
      return NextResponse.json({ error: 'type, id가 필요합니다.' }, { status: 400 })
    }

    if (type === 'inventory') {
      const item = await prisma.inventoryItem.findFirst({
        where: { id, tenantId },
        select: { id: true, name: true, currentStock: true, minStock: true, unit: true, lastUpdated: true }
      })
      if (!item) return NextResponse.json({ error: '재고를 찾을 수 없습니다.' }, { status: 404 })
      return NextResponse.json(item)
    }

    if (type === 'precaution') {
      const prec = await prisma.precaution.findFirst({
        where: { id, tenantId },
        select: {
          id: true,
          title: true,
          content: true,
          workplace: true,
          timeSlot: true,
          priority: true,
          createdAt: true,
          tags: { select: { id: true, name: true, color: true } }
        }
      })
      if (!prec) return NextResponse.json({ error: '주의사항을 찾을 수 없습니다.' }, { status: 404 })
      return NextResponse.json(prec)
    }

    if (type === 'manual') {
      const man = await prisma.manual.findFirst({
        where: { id, tenantId },
        select: {
          id: true,
          title: true,
          content: true,
          workplace: true,
          timeSlot: true,
          category: true,
          createdAt: true,
          tags: { select: { id: true, name: true, color: true } },
        }
      })
      if (!man) return NextResponse.json({ error: '메뉴얼을 찾을 수 없습니다.' }, { status: 404 })

      // 주의사항은 명시적 조인 테이블(ManualPrecautionRelation) 기준으로 수집한다
      const rels = await prisma.manualPrecautionRelation.findMany({
        where: {
          manualId: id,
          manual: { tenantId },
          precaution: { tenantId }
        },
        select: {
          order: true,
          precaution: {
            select: {
              id: true,
              title: true,
              content: true,
              workplace: true,
              timeSlot: true,
              priority: true,
              createdAt: true,
              tags: { select: { id: true, name: true, color: true } }
            }
          }
        },
        orderBy: { order: 'asc' }
      })

      const precautions = rels.map((r:any)=>({
        id: r.precaution.id,
        title: r.precaution.title,
        content: r.precaution.content,
        workplace: r.precaution.workplace,
        timeSlot: r.precaution.timeSlot,
        priority: r.precaution.priority,
        createdAt: r.precaution.createdAt,
        tags: r.precaution.tags
      }))

      return NextResponse.json({ ...man, precautions })
    }

    return NextResponse.json({ error: '지원하지 않는 타입입니다.' }, { status: 400 })
  } catch (e: any) {
    const msg = typeof e?.message === 'string' ? e.message : '조회 실패'
    const status = msg.includes('로그인이 필요') ? 401 : 500
    return NextResponse.json({ error: msg }, { status })
  }
}


