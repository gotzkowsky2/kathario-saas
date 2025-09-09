import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { requireAuth, requireAdmin } from '@/lib/auth'

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  try {
    const notice = await prisma.notice.findUnique({
      where: { id: params.id },
      include: { author: { select: { name: true } } },
    })
    if (!notice) return NextResponse.json({ error: '없음' }, { status: 404 })
    return NextResponse.json(notice)
  } catch (e: any) {
    return NextResponse.json({ error: e.message || '조회 실패' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireAuth(request)
    requireAdmin(user)

    const body = await request.json().catch(() => ({})) as any
    const { title, content, isActive } = body || {}
    if (!title || !content) {
      return NextResponse.json({ error: '제목/내용 필수' }, { status: 400 })
    }

    const existing = await prisma.notice.findUnique({ where: { id: params.id } })
    if (!existing || existing.tenantId !== user.tenantId) {
      return NextResponse.json({ error: '권한 없음 또는 존재하지 않음' }, { status: 404 })
    }

    const notice = await prisma.notice.update({
      where: { id: params.id },
      data: {
        title: String(title).trim(),
        content: String(content).trim(),
        ...(isActive === undefined ? {} : { isActive: Boolean(isActive) }),
      },
      include: { author: { select: { name: true } } },
    })
    return NextResponse.json(notice)
  } catch (e: any) {
    return NextResponse.json({ error: e.message || '수정 실패' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireAuth(request)
    requireAdmin(user)

    const existing = await prisma.notice.findUnique({ where: { id: params.id } })
    if (!existing || existing.tenantId !== user.tenantId) {
      return NextResponse.json({ error: '권한 없음 또는 존재하지 않음' }, { status: 404 })
    }
    await prisma.notice.delete({ where: { id: params.id } })
    return NextResponse.json({ message: '삭제 완료' })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || '삭제 실패' }, { status: 500 })
  }
}


