import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'

// GET /api/admin/tags - 테넌트 태그 목록
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(request, { requireAdmin: true });
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }

    const { tenantId } = authResult;
    const tags = await prisma.tag.findMany({
      where: { tenantId: tenantId },
      orderBy: { createdAt: 'desc' },
      select: { id: true, name: true, color: true }
    })
    return NextResponse.json(tags)
  } catch (error: any) {
    console.error('태그 조회 오류:', error);
    return NextResponse.json({ error: error.message || '태그 조회 실패' }, { status: 500 })
  }
}

// POST /api/admin/tags - 태그 생성
export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuth(request, { requireAdmin: true });
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }

    const { tenantId } = authResult;
    const body = await request.json().catch(() => ({})) as any
    const name = String(body?.name || '').trim()
    const color = String(body?.color || '#3B82F6')
    if (!name) return NextResponse.json({ error: '태그 이름은 필수입니다.' }, { status: 400 })

    // 테넌트 내 고유 보장
    const exists = await prisma.tag.findFirst({ where: { tenantId: tenantId, name } })
    if (exists) return NextResponse.json({ error: '이미 존재하는 태그입니다.' }, { status: 409 })

    const tag = await prisma.tag.create({
      data: { tenantId: tenantId, name, color }
    })
    return NextResponse.json(tag, { status: 201 })
  } catch (error: any) {
    console.error('태그 생성 오류:', error);
    return NextResponse.json({ error: error.message || '태그 생성 실패' }, { status: 500 })
  }
}


