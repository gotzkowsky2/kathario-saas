import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { requireAuth, requireAdmin } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request)
    requireAdmin(user)

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1') || 1
    const limit = Math.min(parseInt(searchParams.get('limit') || '20') || 20, 100)
    const search = (searchParams.get('search') || '').trim()
    const isActiveParam = searchParams.get('isActive')

    const where: any = { tenantId: user.tenantId }
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { content: { contains: search, mode: 'insensitive' } },
      ]
    }
    if (isActiveParam !== null && isActiveParam !== '') {
      where.isActive = isActiveParam === 'true'
    }

    const [notices, total] = await Promise.all([
      prisma.notice.findMany({
        where,
        include: { author: { select: { name: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.notice.count({ where }),
    ])

    return NextResponse.json({
      notices,
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || '조회 실패' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(request)
    requireAdmin(user)

    const body = await request.json().catch(() => ({})) as any
    const { title, content, isActive = true } = body || {}
    if (!title || !content) {
      return NextResponse.json({ error: '제목/내용 필수' }, { status: 400 })
    }

    const notice = await prisma.notice.create({
      data: {
        tenantId: user.tenantId,
        title: String(title).trim(),
        content: String(content).trim(),
        isActive: Boolean(isActive),
        createdBy: user.id,
      },
      include: { author: { select: { name: true } } },
    })
    return NextResponse.json(notice, { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || '생성 실패' }, { status: 500 })
  }
}


