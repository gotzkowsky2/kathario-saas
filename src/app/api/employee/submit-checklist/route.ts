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

export async function POST(request: NextRequest) {
  try {
    const employee = await getCurrentEmployee(request)
    const body = await request.json()
    const { instanceId, notes, requireConnectedComplete } = body || {}
    if (!instanceId) {
      return NextResponse.json({ error: 'instanceId가 필요합니다.' }, { status: 400 })
    }

    const instance = await prisma.checklistInstance.findUnique({ where: { id: instanceId } })
    if (!instance || instance.tenantId !== employee.tenantId) {
      return NextResponse.json({ error: '체크리스트를 찾을 수 없습니다.' }, { status: 404 })
    }

    // 모든 메인 항목 완료 확인
    const counts = await prisma.checklistItemProgress.groupBy({
      by: ['isCompleted'],
      where: { instanceId },
      _count: { _all: true }
    })
    const total = counts.reduce((s, r) => s + r._count._all, 0)
    const done = counts.find(r => r.isCompleted)?._count._all || 0
    if (total === 0 || done < total) {
      return NextResponse.json({ error: '모든 항목을 완료해야 제출할 수 있습니다.' }, { status: 400 })
    }

    // 옵션: 연결항목까지 모두 완료 강제
    if (requireConnectedComplete) {
      const connCounts = await prisma.connectedItemProgress.groupBy({
        by: ['isCompleted'],
        where: { instanceId },
        _count: { _all: true }
      })
      const connTotal = connCounts.reduce((s, r) => s + r._count._all, 0)
      const connDone = connCounts.find(r => r.isCompleted)?._count._all || 0
      if (connTotal > 0 && connDone < connTotal) {
        return NextResponse.json({ error: '연결 항목까지 완료해야 제출할 수 있습니다.' }, { status: 400 })
      }
    }

    await prisma.checklistInstance.update({
      where: { id: instanceId },
      data: {
        isSubmitted: true,
        submittedAt: new Date(),
        notes: notes ?? undefined,
      }
    })

    return NextResponse.json({ success: true })
  } catch (e: any) {
    const msg = typeof e?.message === 'string' ? e.message : '제출 실패'
    const status = msg.includes('로그인이 필요') ? 401 : 500
    return NextResponse.json({ error: msg }, { status })
  }
}


