import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { requireAuth, requireAdmin } from '@/lib/auth'

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireAuth(request)
    requireAdmin(user)
    const body = await request.json().catch(() => ({})) as any
    const name = body?.name ? String(body.name).trim() : undefined
    const color = body?.color ? String(body.color) : undefined
    const existing = await prisma.tag.findFirst({ where: { id: params.id, tenantId: user.tenantId } })
    if (!existing) return NextResponse.json({ error: '존재하지 않음' }, { status: 404 })
    const updated = await prisma.tag.update({ where: { id: params.id }, data: { name: name ?? existing.name, color: color ?? existing.color } })
    return NextResponse.json(updated)
  } catch (error: any) {
    return NextResponse.json({ error: error.message || '수정 실패' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireAuth(request)
    requireAdmin(user)
    const existing = await prisma.tag.findFirst({ where: { id: params.id, tenantId: user.tenantId } })
    if (!existing) return NextResponse.json({ error: '존재하지 않음' }, { status: 404 })

    // 연결 관계 제거 후 태그 삭제
    await prisma.checklistTemplateTagRelation.deleteMany({ where: { tagId: params.id } })
    await prisma.inventoryItemTagRelation.deleteMany({ where: { tagId: params.id } })
    await prisma.manualTagRelation.deleteMany({ where: { tagId: params.id } })
    await prisma.precautionTagRelation.deleteMany({ where: { tagId: params.id } })
    await prisma.tag.delete({ where: { id: params.id } })
    return NextResponse.json({ message: '삭제 완료' })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || '삭제 실패' }, { status: 500 })
  }
}


