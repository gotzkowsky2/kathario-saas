import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireAuth(request, { requireAdmin: true });
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }
    const { tenantId } = authResult;
    const resolvedParams = await params;
    const itemId = resolvedParams.id;

    if (!itemId) {
      return NextResponse.json({ error: 'Item ID is required' }, { status: 400 });
    }

    const item = await prisma.inventoryItem.findFirst({
      where: {
        id: itemId,
        tenantId: tenantId,
      },
      include: {
        tags: {
          select: {
            id: true,
            name: true,
            color: true,
          },
        },
      },
    });

    if (!item) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    // 한국어 카테고리 변환
    const categoryLabels: { [key: string]: string } = {
      'INGREDIENTS': '식자재',
      'SUPPLIES': '소모품'
    };

    const formattedItem = {
      ...item,
      category: categoryLabels[item.category] || item.category,
      updatedAt: item.updatedAt.toLocaleString('ko-KR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      }),
      updatedBy: item.lastCheckedBy || '관리자'
    };

    return NextResponse.json(formattedItem);
  } catch (error) {
    console.error('Error fetching inventory item:', error);
    return NextResponse.json({ error: 'Failed to fetch inventory item' }, { status: 500 });
  }
}

