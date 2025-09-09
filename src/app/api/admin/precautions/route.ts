import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { requireAuth, requireAdmin } from '@/lib/auth'

// 목록 조회
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request)
    requireAdmin(user)
    const precautions = await prisma.precaution.findMany({
      where: { tenantId: user.tenantId, isActive: true },
      orderBy: [{ priority: 'asc' }, { createdAt: 'desc' }],
      select: {
        id: true,
        title: true,
        content: true,
        workplace: true,
        timeSlot: true,
        priority: true,
        tagRelations: { select: { tag: { select: { id: true, name: true, color: true } } } },
      },
    })
    const formatted = precautions.map((p) => ({
      ...p,
      tags: p.tagRelations.map((tr) => ({ id: tr.tag.id, name: tr.tag.name, color: tr.tag.color })),
    }))
    return NextResponse.json(formatted)
  } catch (error: any) {
    return NextResponse.json({ error: error.message || '조회 실패' }, { status: 500 })
  }
}

// 생성
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(request)
    requireAdmin(user)
    const body = await request.json().catch(() => ({})) as any
    const { title, content, workplace = 'COMMON', timeSlot = 'COMMON', priority = 1, tags = [] } = body
    if (!title || !content) return NextResponse.json({ error: '제목/내용 필수' }, { status: 400 })

    const precaution = await prisma.precaution.create({
      data: { tenantId: user.tenantId, title: String(title).trim(), content: String(content).trim(), workplace, timeSlot, priority, isActive: true },
    })
    if (Array.isArray(tags) && tags.length > 0) {
      const rel = tags.filter((id: string) => typeof id === 'string' && id.length > 0).map((id: string) => ({ precautionId: precaution.id, tagId: id }))
      if (rel.length > 0) await prisma.precautionTagRelation.createMany({ data: rel })
    }
    return NextResponse.json({ precaution }, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || '생성 실패' }, { status: 500 })
  }
}

// 수정
export async function PUT(request: NextRequest) {
  try {
    const user = await requireAuth(request)
    requireAdmin(user)
    const body = await request.json().catch(() => ({})) as any
    const { id, title, content, workplace, timeSlot, priority, tags } = body
    if (!id) return NextResponse.json({ error: 'ID 필수' }, { status: 400 })

    const existing = await prisma.precaution.findFirst({ where: { id, tenantId: user.tenantId } })
    if (!existing) return NextResponse.json({ error: '존재하지 않음' }, { status: 404 })

    const updated = await prisma.precaution.update({
      where: { id },
      data: {
        title: title ?? existing.title,
        content: content ?? existing.content,
        workplace: workplace ?? existing.workplace,
        timeSlot: timeSlot ?? existing.timeSlot,
        priority: priority ?? existing.priority,
      },
    })

    if (Array.isArray(tags)) {
      await prisma.precautionTagRelation.deleteMany({ where: { precautionId: id } })
      const rel = tags.filter((tid: string) => typeof tid === 'string' && tid.length > 0).map((tid: string) => ({ precautionId: id, tagId: tid }))
      if (rel.length > 0) await prisma.precautionTagRelation.createMany({ data: rel })
    }

    return NextResponse.json(updated)
  } catch (error: any) {
    return NextResponse.json({ error: error.message || '수정 실패' }, { status: 500 })
  }
}

// 삭제
export async function DELETE(request: NextRequest) {
  try {
    const user = await requireAuth(request)
    requireAdmin(user)
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id') || ''
    if (!id) return NextResponse.json({ error: 'ID 필수' }, { status: 400 })

    const existing = await prisma.precaution.findFirst({ where: { id, tenantId: user.tenantId } })
    if (!existing) return NextResponse.json({ error: '존재하지 않음' }, { status: 404 })

    // 관계 제거 후 삭제
    await prisma.precautionTagRelation.deleteMany({ where: { precautionId: id } })
    await prisma.manualPrecautionRelation.deleteMany({ where: { precautionId: id } })
    await prisma.precaution.delete({ where: { id } })
    return NextResponse.json({ message: '삭제 완료' })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || '삭제 실패' }, { status: 500 })
  }
}


