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
        select: { id: true, tenantId: true, name: true }
      })
      if (employee) return employee
    }
  }

  const legacyId = request.cookies.get('employee_auth')?.value || request.cookies.get('admin_auth')?.value
  if (legacyId) {
    const employee = await prisma.employee.findUnique({
      where: { id: legacyId },
      select: { id: true, tenantId: true, name: true }
    })
    if (employee) return employee
  }

  throw new Error('로그인이 필요합니다.')
}

// PUT /api/employee/inventory - 직원 재고 수량 업데이트(기록 포함)
export async function PUT(request: NextRequest) {
  try {
    const employee = await getCurrentEmployee(request)
    const body = await request.json()
    const { itemId, currentStock, notes } = body || {}

    if (!itemId || typeof currentStock !== 'number') {
      return NextResponse.json({ error: 'itemId, currentStock가 필요합니다.' }, { status: 400 })
    }

    const item = await prisma.inventoryItem.findFirst({ where: { id: itemId, tenantId: employee.tenantId } })
    if (!item) {
      return NextResponse.json({ error: '재고 아이템을 찾을 수 없습니다.' }, { status: 404 })
    }

    const previousStock = Math.round(item.currentStock)
    const newStock = Math.round(currentStock)

    // 재고 업데이트 + 최근 점검자 기록
    const updated = await prisma.inventoryItem.update({
      where: { id: item.id },
      data: {
        currentStock: newStock,
        lastCheckedBy: employee.name,
        lastUpdated: new Date()
      }
    })

    // 점검 기록 저장
    await prisma.inventoryCheck.create({
      data: {
        itemId: item.id,
        checkedBy: employee.id,
        currentStock: newStock,
        notes: notes || undefined
      }
    })

    return NextResponse.json({
      previousStock,
      stockChange: newStock - previousStock,
      item: {
        id: updated.id,
        name: updated.name,
        unit: updated.unit,
        currentStock: Math.round(updated.currentStock),
        minStock: Math.round(updated.minStock)
      }
    })
  } catch (e: any) {
    const msg = typeof e?.message === 'string' ? e.message : '업데이트 실패'
    const status = msg.includes('로그인이 필요') ? 401 : 500
    return NextResponse.json({ error: msg }, { status })
  }
}


