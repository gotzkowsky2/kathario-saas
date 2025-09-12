import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request, { requireAdmin: true })
    if (!auth.success) return NextResponse.json({ error: auth.error }, { status: 401 })

    const tenant = await prisma.tenant.findUnique({ where: { id: auth.tenantId }, select: { id: true, name: true, settings: true, ownerEmail: true } })
    if (!tenant) return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })

    return NextResponse.json({
      id: tenant.id,
      name: tenant.name,
      settings: tenant.settings || {},
      defaults: {
        ownerEmail: tenant.ownerEmail || null
      }
    })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || '조회 실패' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const auth = await requireAuth(request, { requireAdmin: true })
    if (!auth.success) return NextResponse.json({ error: auth.error }, { status: 401 })

    const body = await request.json().catch(()=>({})) as any
    const nextSettings = body?.settings && typeof body.settings === 'object' ? body.settings : {}

    // 간단 검증: submissionEmails는 문자열 배열
    if (nextSettings.submissionEmails) {
      if (!Array.isArray(nextSettings.submissionEmails) || nextSettings.submissionEmails.some((v:any)=> typeof v !== 'string')) {
        return NextResponse.json({ error: 'submissionEmails는 문자열 배열이어야 합니다.' }, { status: 400 })
      }
    }

    const updated = await prisma.tenant.update({ where: { id: auth.tenantId }, data: { settings: nextSettings }, select: { id: true, settings: true } })
    return NextResponse.json(updated)
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || '업데이트 실패' }, { status: 500 })
  }
}


