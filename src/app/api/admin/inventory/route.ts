import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'

// GET /api/admin/inventory - 재고 아이템 목록 조회
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(request, { requireAdmin: true });
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }
    const { tenantId } = authResult;

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1') || 1
    const limit = Math.min(parseInt(searchParams.get('limit') || '50') || 50, 100)
    const search = (searchParams.get('search') || '').trim()
    const category = searchParams.get('category')
    const onlyLow = searchParams.get('onlyLow') === 'true'

    const where: any = { 
      tenantId,
      isActive: true
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { supplier: { contains: search, mode: 'insensitive' } },
      ]
    }

    if (category && category !== '전체') {
      where.category = category
    }

    const items = await prisma.inventoryItem.findMany({
      where,
      include: {
        tags: {
          select: { id: true, name: true, color: true }
        }
      },
      orderBy: { lastUpdated: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    })

    // 재고 부족 필터링 (DB에서 하기 어려우므로 메모리에서 처리)
    let filteredItems = items
    if (onlyLow) {
      filteredItems = items.filter(item => item.currentStock < item.minStock)
    }

    // 응답 형식 변환
    const formattedItems = filteredItems.map(item => ({
      id: item.id,
      name: item.name,
      category: item.category,
      unit: item.unit,
      currentStock: item.currentStock,
      minStock: item.minStock,
      supplier: item.supplier || '',
      tags: item.tags,
      updatedAt: item.lastUpdated.toISOString().slice(0, 16).replace('T', ' '),
      updatedBy: item.lastCheckedBy || '시스템',
    }))

    return NextResponse.json(formattedItems)
  } catch (error: any) {
    console.error('재고 조회 오류:', error)
    return NextResponse.json({ error: error.message || '재고 조회 실패' }, { status: 500 })
  }
}

// POST /api/admin/inventory - 새 재고 아이템 생성
export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuth(request, { requireAdmin: true });
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }
    const { tenantId, user } = authResult;

    const body = await request.json()
    const { name, category, unit, currentStock, minStock, supplier, tags } = body

    if (!name || !category || !unit || currentStock === undefined || minStock === undefined) {
      return NextResponse.json({ error: '필수 필드가 누락되었습니다.' }, { status: 400 })
    }

    // 재고 아이템 생성
    const inventoryItem = await prisma.inventoryItem.create({
      data: {
        tenantId: tenantId,
        name: name.trim(),
        category,
        unit: unit.trim(),
        currentStock: parseFloat(currentStock),
        minStock: parseFloat(minStock),
        supplier: supplier?.trim() || null,
        lastCheckedBy: user.name,
        lastUpdated: new Date(),
        // 태그 연결
        tags: tags && tags.length > 0 ? {
          connect: tags.map((tagId: string) => ({ id: tagId }))
        } : undefined
      },
      include: {
        tags: {
          select: { id: true, name: true, color: true }
        }
      }
    })

    return NextResponse.json({
      id: inventoryItem.id,
      name: inventoryItem.name,
      category: inventoryItem.category,
      unit: inventoryItem.unit,
      currentStock: inventoryItem.currentStock,
      minStock: inventoryItem.minStock,
      supplier: inventoryItem.supplier || '',
      tags: inventoryItem.tags,
      updatedAt: inventoryItem.lastUpdated.toISOString().slice(0, 16).replace('T', ' '),
      updatedBy: inventoryItem.lastCheckedBy || '시스템',
    })
  } catch (error: any) {
    console.error('재고 생성 오류:', error)
    return NextResponse.json({ error: error.message || '재고 생성 실패' }, { status: 500 })
  }
}

// PUT /api/admin/inventory - 재고 아이템 수정
export async function PUT(request: NextRequest) {
  try {
    const authResult = await requireAuth(request, { requireAdmin: true });
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }
    const { tenantId, user } = authResult;

    const body = await request.json()
    const { id, name, category, unit, currentStock, minStock, supplier, tags } = body

    if (!id) {
      return NextResponse.json({ error: 'ID가 필요합니다.' }, { status: 400 })
    }

    // 기존 아이템 확인
    const existingItem = await prisma.inventoryItem.findFirst({
      where: { id, tenantId: tenantId }
    })

    if (!existingItem) {
      return NextResponse.json({ error: '재고 아이템을 찾을 수 없습니다.' }, { status: 404 })
    }

    // 재고 아이템 수정
    const updatedItem = await prisma.inventoryItem.update({
      where: { id },
      data: {
        name: name?.trim(),
        category,
        unit: unit?.trim(),
        currentStock: currentStock !== undefined ? parseFloat(currentStock) : undefined,
        minStock: minStock !== undefined ? parseFloat(minStock) : undefined,
        supplier: supplier?.trim() || null,
        lastCheckedBy: user.name,
        lastUpdated: new Date(),
        // 태그 업데이트
        tags: tags !== undefined ? {
          set: tags.map((tagId: string) => ({ id: tagId }))
        } : undefined
      },
      include: {
        tags: {
          select: { id: true, name: true, color: true }
        }
      }
    })

    return NextResponse.json({
      id: updatedItem.id,
      name: updatedItem.name,
      category: updatedItem.category,
      unit: updatedItem.unit,
      currentStock: updatedItem.currentStock,
      minStock: updatedItem.minStock,
      supplier: updatedItem.supplier || '',
      tags: updatedItem.tags,
      updatedAt: updatedItem.lastUpdated.toISOString().slice(0, 16).replace('T', ' '),
      updatedBy: updatedItem.lastCheckedBy || '시스템',
    })
  } catch (error: any) {
    console.error('재고 수정 오류:', error)
    return NextResponse.json({ error: error.message || '재고 수정 실패' }, { status: 500 })
  }
}

// DELETE /api/admin/inventory - 재고 아이템 삭제
export async function DELETE(request: NextRequest) {
  try {
    const authResult = await requireAuth(request, { requireAdmin: true });
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }
    const { tenantId } = authResult;

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'ID가 필요합니다.' }, { status: 400 })
    }

    // 기존 아이템 확인
    const existingItem = await prisma.inventoryItem.findFirst({
      where: { id, tenantId: tenantId }
    })

    if (!existingItem) {
      return NextResponse.json({ error: '재고 아이템을 찾을 수 없습니다.' }, { status: 404 })
    }

    // 소프트 삭제 (isActive = false)
    await prisma.inventoryItem.update({
      where: { id },
      data: { isActive: false }
    })

    return NextResponse.json({ message: '재고 아이템이 삭제되었습니다.' })
  } catch (error: any) {
    console.error('재고 삭제 오류:', error)
    return NextResponse.json({ error: error.message || '재고 삭제 실패' }, { status: 500 })
  }
}
