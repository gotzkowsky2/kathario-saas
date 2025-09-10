import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import prisma from '@/lib/prisma';

// PUT: 체크리스트 항목의 연결 항목들 업데이트
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  try {
    const authResult = await requireAuth(request, { requireAdmin: true });
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }

    const { tenantId } = authResult;
    const resolvedParams = await params;
    const { id: templateId, itemId } = resolvedParams;
    const { connectedItems } = await request.json();

    // 템플릿 존재 확인 및 테넌트 검증
    const template = await prisma.checklistTemplate.findFirst({
      where: { 
        id: templateId,
        tenantId: tenantId
      }
    });

    if (!template) {
      return NextResponse.json({ error: "템플릿을 찾을 수 없습니다." }, { status: 404 });
    }

    // 체크리스트 항목 존재 확인
    const existingItem = await prisma.checklistItem.findFirst({
      where: { 
        id: itemId,
        templateId: templateId
      }
    });

    if (!existingItem) {
      return NextResponse.json({ error: "항목을 찾을 수 없습니다." }, { status: 404 });
    }

    // 트랜잭션으로 연결 항목들 업데이트
    await prisma.$transaction(async (tx) => {
      // 기존 연결 항목들 삭제
      await tx.checklistItemConnection.deleteMany({
        where: { checklistItemId: itemId }
      });

      // 새로운 연결 항목들 생성
      if (connectedItems && connectedItems.length > 0) {
        const connectionData = connectedItems.map((item: any, index: number) => ({
          checklistItemId: itemId,
          itemType: item.type,
          itemId: item.id,
          order: index + 1
        }));

        await tx.checklistItemConnection.createMany({
          data: connectionData
        });
      }
    });

    // 업데이트된 항목 조회 (연결된 항목들 포함)
    const updatedItem = await prisma.checklistItem.findFirst({
      where: { id: itemId },
      include: {
        connectedItems: {
          orderBy: { order: 'asc' }
        }
      }
    });

    // 연결된 항목들의 실제 데이터 조회
    const connectedItemsWithData = await Promise.all(
      (updatedItem?.connectedItems || []).map(async (connection) => {
        let connectedItem = null;
        
        switch (connection.itemType) {
          case 'inventory':
            connectedItem = await prisma.inventoryItem.findFirst({
              where: { 
                id: connection.itemId,
                tenantId: tenantId
              },
              include: { tags: true }
            });
            break;
          case 'precaution':
            connectedItem = await prisma.precaution.findFirst({
              where: { 
                id: connection.itemId,
                tenantId: tenantId
              },
              include: { tags: true }
            });
            break;
          case 'manual':
            connectedItem = await prisma.manual.findFirst({
              where: { 
                id: connection.itemId,
                tenantId: tenantId
              },
              include: { tags: true }
            });
            break;
        }

        return {
          id: connection.id,
          itemType: connection.itemType,
          itemId: connection.itemId,
          order: connection.order,
          connectedItem: connectedItem ? {
            id: connectedItem.id,
            name: 'name' in connectedItem ? connectedItem.name : connectedItem.title,
            type: connection.itemType,
            tags: connectedItem.tags.map(tag => tag.name)
          } : null
        };
      })
    );

    const result = {
      id: updatedItem?.id,
      content: updatedItem?.content,
      instructions: updatedItem?.instructions,
      order: updatedItem?.order,
      isRequired: updatedItem?.isRequired,
      isActive: updatedItem?.isActive,
      connectedItems: connectedItemsWithData.filter(ci => ci.connectedItem !== null)
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error updating checklist item connections:', error);
    return NextResponse.json({ error: "연결 항목 업데이트 중 오류가 발생했습니다." }, { status: 500 });
  }
}
