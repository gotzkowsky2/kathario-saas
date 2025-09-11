import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'

// Create Manual
export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuth(request, { requireAdmin: true });
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }
    const { tenantId } = authResult;

    const body = await request.json().catch(() => ({})) as any
    const { title, content, workplace = 'COMMON', timeSlot = 'COMMON', category = 'MANUAL', version = '1.0', mediaUrls = [], tags = [], precautions = [], selectedPrecautions = [] } = body

    if (!title || !content) {
      return NextResponse.json({ error: '제목과 내용은 필수입니다.' }, { status: 400 })
    }

    // 1) Create manual
    const manual = await prisma.manual.create({
      data: {
        tenantId,
        title: String(title).trim(),
        content: String(content).trim(),
        workplace,
        timeSlot,
        category,
        version,
        mediaUrls,
        isActive: true,
      },
    })

    // 2) Attach tags
    if (Array.isArray(tags) && tags.length > 0) {
      const tagRelations = tags
        .filter((tagId: string) => typeof tagId === 'string' && tagId.length > 0)
        .map((tagId: string) => ({ manualId: manual.id, tagId }))
      if (tagRelations.length > 0) {
        await prisma.manualTagRelation.createMany({ data: tagRelations })
      }
    }

    // 3) Create new precautions and link
    if (Array.isArray(precautions) && precautions.length > 0) {
      for (let i = 0; i < precautions.length; i++) {
        const p = precautions[i]
        if (!p || !p.title || !p.content) continue
        const newPrecaution = await prisma.precaution.create({
          data: {
            tenantId,
            title: String(p.title).trim(),
            content: String(p.content).trim(),
            workplace: p.workplace || 'COMMON',
            timeSlot: p.timeSlot || 'COMMON',
            priority: p.priority || 1,
            isActive: true,
          },
        })
        await prisma.manualPrecautionRelation.create({
          data: { manualId: manual.id, precautionId: newPrecaution.id, order: i },
        })
      }
    }

    // 4) Link existing precautions
    if (Array.isArray(selectedPrecautions) && selectedPrecautions.length > 0) {
      const relData = selectedPrecautions
        .filter((id: string) => typeof id === 'string' && id.length > 0)
        .map((id: string, idx: number) => ({ manualId: manual.id, precautionId: id, order: (precautions?.length || 0) + idx }))
      if (relData.length > 0) {
        await prisma.manualPrecautionRelation.createMany({ data: relData })
      }
    }

    return NextResponse.json(manual, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || '메뉴얼 생성 실패' }, { status: 500 })
  }
}

// Read Manuals
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(request, { requireAdmin: true });
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }
    const { tenantId } = authResult;

    const { searchParams } = new URL(request.url)
    const workplace = searchParams.get('workplace')
    const timeSlot = searchParams.get('timeSlot')
    const category = searchParams.get('category')
    const search = searchParams.get('search')

    const where: any = { tenantId, isActive: true }
    if (workplace && workplace !== 'ALL') where.workplace = workplace
    if (timeSlot && timeSlot !== 'ALL') where.timeSlot = timeSlot
    if (category && category !== 'ALL') where.category = category
    if (search) where.OR = [
      { title: { contains: search, mode: 'insensitive' } },
      { content: { contains: search, mode: 'insensitive' } },
    ]

    const manuals = await prisma.manual.findMany({
      where,
      select: {
        id: true,
        title: true,
        content: true,
        workplace: true,
        timeSlot: true,
        category: true,
        version: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        tagRelations: { select: { tag: { select: { id: true, name: true, color: true } } } },
        precautionRelations: {
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
                tagRelations: { select: { tag: { select: { id: true, name: true, color: true } } } },
              },
            },
          },
        },
      },
      orderBy: [{ createdAt: 'desc' }],
    })

    const formatted = manuals.map((m) => ({
      ...m,
      tags: m.tagRelations.map((tr) => ({ id: tr.tag.id, name: tr.tag.name, color: tr.tag.color })),
      precautions: m.precautionRelations.map((pr) => ({
        id: pr.precaution.id,
        title: pr.precaution.title,
        content: pr.precaution.content,
        workplace: pr.precaution.workplace,
        timeSlot: pr.precaution.timeSlot,
        priority: pr.precaution.priority,
        order: pr.order,
        tags: pr.precaution.tagRelations.map((tr) => ({ id: tr.tag.id, name: tr.tag.name, color: tr.tag.color })),
      })),
    }))

    return NextResponse.json(formatted)
  } catch (error: any) {
    return NextResponse.json({ error: error.message || '메뉴얼 조회 실패' }, { status: 500 })
  }
}

// Update Manual
export async function PUT(request: NextRequest) {
  try {
    const authResult = await requireAuth(request, { requireAdmin: true });
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }
    const { tenantId } = authResult;

    const body = await request.json().catch(() => ({})) as any
    const { id, title, content, workplace, timeSlot, category, version, mediaUrls, tags = [], precautions = [], selectedPrecautions = [] } = body
    if (!id) return NextResponse.json({ error: '메뉴얼 ID가 필요합니다.' }, { status: 400 })

    const existing = await prisma.manual.findFirst({ where: { id, tenantId } })
    if (!existing) return NextResponse.json({ error: '존재하지 않거나 권한이 없습니다.' }, { status: 404 })

    const updated = await prisma.manual.update({
      where: { id },
      data: {
        title: title ?? existing.title,
        content: content ?? existing.content,
        workplace: workplace ?? existing.workplace,
        timeSlot: timeSlot ?? existing.timeSlot,
        category: category ?? existing.category,
        version: version ?? existing.version,
        mediaUrls: mediaUrls ?? existing.mediaUrls,
      },
    })

    // reset and recreate tag relations
    await prisma.manualTagRelation.deleteMany({ where: { manualId: id } })
    if (Array.isArray(tags) && tags.length > 0) {
      const tagRelations = tags
        .filter((tagId: string) => typeof tagId === 'string' && tagId.length > 0)
        .map((tagId: string) => ({ manualId: id, tagId }))
      if (tagRelations.length > 0) await prisma.manualTagRelation.createMany({ data: tagRelations })
    }

    // reset and recreate precaution relations
    await prisma.manualPrecautionRelation.deleteMany({ where: { manualId: id } })
    let orderIndex = 0
    if (Array.isArray(precautions) && precautions.length > 0) {
      for (let i = 0; i < precautions.length; i++) {
        const p = precautions[i]
        if (!p || !p.title || !p.content) continue
        const newPrecaution = await prisma.precaution.create({
          data: {
            tenantId,
            title: String(p.title).trim(),
            content: String(p.content).trim(),
            workplace: p.workplace || 'COMMON',
            timeSlot: p.timeSlot || 'COMMON',
            priority: p.priority || 1,
            isActive: true,
          },
        })
        await prisma.manualPrecautionRelation.create({ data: { manualId: id, precautionId: newPrecaution.id, order: orderIndex++ } })
      }
    }
    if (Array.isArray(selectedPrecautions) && selectedPrecautions.length > 0) {
      const relData = selectedPrecautions
        .filter((pid: string) => typeof pid === 'string' && pid.length > 0)
        .map((pid: string) => ({ manualId: id, precautionId: pid, order: orderIndex++ }))
      if (relData.length > 0) await prisma.manualPrecautionRelation.createMany({ data: relData })
    }

    return NextResponse.json(updated)
  } catch (error: any) {
    return NextResponse.json({ error: error.message || '메뉴얼 수정 실패' }, { status: 500 })
  }
}

// Delete Manual
export async function DELETE(request: NextRequest) {
  try {
    const user = await requireAuth(request)
    requireAdmin(user)
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id') || ''
    if (!id) return NextResponse.json({ error: '메뉴얼 ID가 필요합니다.' }, { status: 400 })

    const existing = await prisma.manual.findFirst({ where: { id, tenantId } })
    if (!existing) return NextResponse.json({ error: '존재하지 않거나 권한이 없습니다.' }, { status: 404 })

    await prisma.manualTagRelation.deleteMany({ where: { manualId: id } })
    await prisma.manualPrecautionRelation.deleteMany({ where: { manualId: id } })
    await prisma.checklistItemConnection.deleteMany({ where: { itemType: 'manual', itemId: id } })
    await prisma.manual.delete({ where: { id } })

    return NextResponse.json({ message: '삭제 완료' })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || '메뉴얼 삭제 실패' }, { status: 500 })
  }
}


