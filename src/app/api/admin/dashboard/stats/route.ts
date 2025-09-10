import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(request, { requireAdmin: true });
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }
    const { tenantId } = authResult;

    // 병렬로 모든 통계 조회
    const [
      totalEmployees,
      activeChecklists,
      lowStockItems,
      pendingTasks
    ] = await Promise.all([
      // 총 직원 수 (활성 직원만)
      prisma.employee.count({
        where: {
          tenantId: tenantId,
          isActive: true
        }
      }),

      // 활성 체크리스트 템플릿 수
      prisma.checklistTemplate.count({
        where: {
          tenantId: tenantId,
          isActive: true
        }
      }),

      // 재고 부족 품목 수 (현재 재고 <= 최소 재고)
      prisma.$queryRaw`
        SELECT COUNT(*) as count 
        FROM "InventoryItem" 
        WHERE "tenantId" = ${tenantId} 
        AND "currentStock" <= "minStock"
      `.then((result: any) => Number(result[0]?.count || 0)),

      // 대기 중인 작업 수 (오늘 생성된 미완료 체크리스트 인스턴스)
      prisma.checklistInstance.count({
        where: {
          tenantId: tenantId,
          createdAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)) // 오늘 00:00부터
          },
          completedAt: null // 아직 완료되지 않음
        }
      })
    ]);

    return NextResponse.json({
      totalEmployees,
      activeChecklists,
      lowStockItems,
      pendingTasks
    });

  } catch (error) {
    console.error('Dashboard stats error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard statistics' },
      { status: 500 }
    );
  }
}
