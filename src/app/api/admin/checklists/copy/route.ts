import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    const { sourceTemplateId, newName, includeItems = true, includeConnections = true } = await req.json();

    if (!sourceTemplateId || !newName) {
      return NextResponse.json({ error: '원본 템플릿과 새 이름이 필요합니다.' }, { status: 400 });
    }

    // 인증 및 관리자 권한 확인
    const authResult = await requireAuth(req, { requireAdmin: true });
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }

    const { tenantId, user } = authResult;

    // 중복 이름 체크
    const existingTemplate = await prisma.checklistTemplate.findFirst({
      where: {
        tenantId,
        name: newName.trim()
      }
    });

    if (existingTemplate) {
      return NextResponse.json(
        { error: "이미 존재하는 템플릿 이름입니다." },
        { status: 400 }
      );
    }

    // 원본 템플릿과 하위 항목/연결 조회 (자식까지 포함)
    const source = await prisma.checklistTemplate.findFirst({
      where: { 
        id: sourceTemplateId,
        tenantId: tenantId
      },
      include: {
        items: {
          where: { parentId: null },
          include: {
            connectedItems: true,
            children: {
              include: {
                connectedItems: true,
              },
            },
          },
          orderBy: { order: 'asc' },
        },
      },
    });

    if (!source) {
      return NextResponse.json({ error: '원본 템플릿을 찾을 수 없습니다.' }, { status: 404 });
    }

    console.log('복사할 원본 템플릿:', {
      id: source.id,
      name: source.name,
      itemsCount: source.items?.length || 0,
      autoGenerateEnabled: source.autoGenerateEnabled,
      recurrenceDays: source.recurrenceDays
    });

    // 새 템플릿 생성
    const newTemplate = await prisma.checklistTemplate.create({
      data: {
        tenantId: tenantId,
        name: newName,
        content: source.content,
        workplace: source.workplace,
        category: source.category,
        timeSlot: source.timeSlot,
        isActive: source.isActive,
        inputter: user.name,
        inputDate: new Date(),
        autoGenerateEnabled: source.autoGenerateEnabled,
        recurrenceDays: source.recurrenceDays,
        generationTime: source.generationTime,
      },
    });

    console.log('includeItems:', includeItems, 'source.items.length:', source.items?.length || 0);

    if (includeItems && source.items && source.items.length > 0) {
      console.log('체크리스트 항목 복사 시작...');
      const idMap = new Map<string, string>();

      // 재귀 복제 함수: 항목 생성 → 연결 복사 → 자식 재귀
      const cloneItemTree = async (
        item: any,
        parentNewId: string | null,
      ): Promise<void> => {
        const created = await prisma.checklistItem.create({
          data: {
            templateId: newTemplate.id,
            parentId: parentNewId,
            type: item.type ?? 'check',
            content: item.content,
            instructions: item.instructions ?? null,
            order: item.order ?? 0,
            isRequired: item.isRequired ?? true,
            isActive: item.isActive ?? true,
          },
        });
        idMap.set(item.id, created.id);

        if (includeConnections) {
          console.log(`항목 ${item.content}의 연결된 항목 ${item.connectedItems?.length || 0}개 복사 중...`);
          for (const conn of item.connectedItems || []) {
            await prisma.checklistItemConnection.create({
              data: {
                checklistItemId: created.id,
                itemType: conn.itemType,
                itemId: conn.itemId,
                order: conn.order ?? 0,
              },
            });
          }
        }

        if (item.children && item.children.length > 0) {
          for (const child of item.children) {
            await cloneItemTree(child, created.id);
          }
        }
      };

      // 루트부터 복제 시작
      for (const rootItem of source.items) {
        await cloneItemTree(rootItem, null);
      }
      
      console.log('체크리스트 항목 복사 완료. 총', source.items.length, '개 항목 복사됨');
    }

    // 생성된 템플릿의 항목 개수 조회
    const itemCount = await prisma.checklistItem.count({
      where: {
        templateId: newTemplate.id,
        parentId: null // 최상위 항목만 카운트
      }
    });

    const templateWithCount = {
      ...newTemplate,
      itemCount
    };

    return NextResponse.json({ success: true, template: templateWithCount });
  } catch (error) {
    console.error('템플릿 복사 오류:', error);
    return NextResponse.json({ error: '템플릿 복사 중 오류가 발생했습니다.' }, { status: 500 });
  }
}
