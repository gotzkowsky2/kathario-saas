import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(request, { requireAdmin: true });
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }

    const { tenantId } = authResult;
    const { searchParams } = new URL(request.url);
    
    const query = searchParams.get('query') || '';
    const type = searchParams.get('type') || 'all';
    const tagIds = searchParams.getAll('tagIds');

    const results: Array<{ type: string; id: string; name: string }> = [];

    // 재고 항목 검색
    if (type === 'all' || type === 'inventory') {
      const inventoryWhere: any = {
        tenantId: tenantId,
        name: {
          contains: query,
          mode: 'insensitive'
        }
      };

      // 태그 필터링
      if (tagIds.length > 0) {
        inventoryWhere.tags = {
          some: {
            id: {
              in: tagIds
            }
          }
        };
      }

      const inventoryItems = await prisma.inventoryItem.findMany({
        where: inventoryWhere,
        select: {
          id: true,
          name: true
        },
        take: 20
      });

      results.push(...inventoryItems.map(item => ({
        type: 'inventory',
        id: item.id,
        name: item.name
      })));
    }

    // 주의사항 검색
    if (type === 'all' || type === 'precaution') {
      const precautionWhere: any = {
        tenantId: tenantId,
        title: {
          contains: query,
          mode: 'insensitive'
        }
      };

      // 태그 필터링
      if (tagIds.length > 0) {
        precautionWhere.tags = {
          some: {
            id: {
              in: tagIds
            }
          }
        };
      }

      const precautions = await prisma.precaution.findMany({
        where: precautionWhere,
        select: {
          id: true,
          title: true
        },
        take: 20
      });

      results.push(...precautions.map(item => ({
        type: 'precaution',
        id: item.id,
        name: item.title
      })));
    }

    // 메뉴얼 검색
    if (type === 'all' || type === 'manual') {
      const manualWhere: any = {
        tenantId: tenantId,
        title: {
          contains: query,
          mode: 'insensitive'
        }
      };

      // 태그 필터링
      if (tagIds.length > 0) {
        manualWhere.tags = {
          some: {
            id: {
              in: tagIds
            }
          }
        };
      }

      const manuals = await prisma.manual.findMany({
        where: manualWhere,
        select: {
          id: true,
          title: true
        },
        take: 20
      });

      results.push(...manuals.map(item => ({
        type: 'manual',
        id: item.id,
        name: item.title
      })));
    }

    // 결과를 타입별로 정렬
    results.sort((a, b) => {
      const typeOrder = { inventory: 0, precaution: 1, manual: 2 };
      const aOrder = typeOrder[a.type as keyof typeof typeOrder] || 3;
      const bOrder = typeOrder[b.type as keyof typeof typeOrder] || 3;
      
      if (aOrder !== bOrder) {
        return aOrder - bOrder;
      }
      
      return a.name.localeCompare(b.name);
    });

    return NextResponse.json({
      results: results.slice(0, 50) // 최대 50개 결과
    });
  } catch (error) {
    console.error('Error searching connections:', error);
    return NextResponse.json({ error: "연결 항목 검색 중 오류가 발생했습니다." }, { status: 500 });
  }
}

