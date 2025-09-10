import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import prisma from '@/lib/prisma';

// GET: 템플릿의 체크리스트 항목들 조회
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
    const templateId = resolvedParams.id;

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

    // 체크리스트 항목들 조회 (연결된 항목들 포함)
    const items = await prisma.checklistItem.findMany({
      where: { 
        templateId: templateId,
        parentId: null // 최상위 항목들만
      },
      include: {
        connectedItems: {
          include: {
            // 연결된 항목의 실제 데이터는 별도로 조회해야 함
          }
        }
      },
      orderBy: { order: 'asc' }
    });

    // 연결된 항목들의 실제 데이터 조회
    const itemsWithConnections = await Promise.all(
      items.map(async (item) => {
        const connectedItems = await Promise.all(
          item.connectedItems.map(async (connection) => {
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
                  include: { 
                    tags: true,
                    precautionRelations: {
                      include: {
                        precaution: {
                          select: {
                            id: true,
                            title: true,
                            content: true,
                            priority: true
                          }
                        }
                      }
                    }
                  }
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
                tags: connectedItem.tags.map(tag => tag.name),
                // 메뉴얼인 경우 연결된 주의사항들도 포함
                ...(connection.itemType === 'manual' && 'precautionRelations' in connectedItem ? {
                  precautions: connectedItem.precautionRelations.map(relation => ({
                    id: relation.precaution.id,
                    title: relation.precaution.title,
                    content: relation.precaution.content,
                    priority: relation.precaution.priority
                  }))
                } : {})
              } : null
            };
          })
        );

        return {
          id: item.id,
          content: item.content,
          instructions: item.instructions,
          order: item.order,
          isRequired: item.isRequired,
          isActive: item.isActive,
          connectedItems: connectedItems.filter(ci => ci.connectedItem !== null)
        };
      })
    );

    return NextResponse.json(itemsWithConnections);
  } catch (error) {
    console.error('Error fetching checklist items:', error);
    return NextResponse.json({ error: "체크리스트 항목을 조회하는 중 오류가 발생했습니다." }, { status: 500 });
  }
}

// POST: 새로운 체크리스트 항목 추가
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireAuth(request, { requireAdmin: true });
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }

    const { tenantId } = authResult;
    const { id: templateId } = await params;
    const { content, instructions, isRequired = true } = await request.json();

    if (!content || !content.trim()) {
      return NextResponse.json({ error: "항목 내용은 필수입니다." }, { status: 400 });
    }

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

    // 현재 최대 order 값 조회
    const maxOrder = await prisma.checklistItem.aggregate({
      where: { templateId: templateId },
      _max: { order: true }
    });

    const newOrder = (maxOrder._max.order || 0) + 1;

    // 새로운 체크리스트 항목 생성
    const newItem = await prisma.checklistItem.create({
      data: {
        templateId: templateId,
        type: 'check',
        content: content.trim(),
        instructions: instructions?.trim() || null,
        order: newOrder,
        isRequired: isRequired,
        isActive: true
      }
    });

    return NextResponse.json(newItem, { status: 201 });
  } catch (error) {
    console.error('Error creating checklist item:', error);
    return NextResponse.json({ error: "체크리스트 항목을 생성하는 중 오류가 발생했습니다." }, { status: 500 });
  }
}
