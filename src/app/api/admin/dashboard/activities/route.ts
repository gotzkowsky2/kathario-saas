import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

interface Activity {
  id: string;
  type: 'checklist_completed' | 'checklist_created' | 'inventory_low' | 'inventory_updated' | 'employee_added' | 'notice_created';
  title: string;
  description: string;
  timestamp: Date;
  icon: string;
  color: string;
  user?: string;
}

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(request, { requireAdmin: true });
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }
    const { tenantId } = authResult;

    const activities: Activity[] = [];
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // 1. 최근 완료된 체크리스트 (최근 24시간)
    const completedChecklists = await prisma.checklistInstance.findMany({
      where: {
        tenantId: tenantId,
        completedAt: {
          gte: yesterday
        }
      },
      include: {
        template: { select: { name: true } }
      },
      orderBy: { completedAt: 'desc' },
      take: 3
    });

    // 완료자 이름 매핑 (completedBy는 문자열 ID이므로 별도 조회)
    const completedByIds = Array.from(
      new Set(
        completedChecklists
          .map(c => c.completedBy)
          .filter((v): v is string => typeof v === 'string' && v.length > 0)
      )
    );
    const completedByEmployees = completedByIds.length
      ? await prisma.employee.findMany({
          where: { tenantId, id: { in: completedByIds } },
          select: { id: true, name: true }
        })
      : [];
    const completedByMap = new Map(completedByEmployees.map(e => [e.id, e.name]));

    completedChecklists.forEach(checklist => {
      if (checklist.completedAt) {
        activities.push({
          id: `checklist_${checklist.id}`,
          type: 'checklist_completed',
          title: `${checklist.template.name} 체크리스트 완료`,
          description: `${completedByMap.get(checklist.completedBy || '') || '직원'}님이 ${getTimeAgo(checklist.completedAt)}에 완료했습니다`,
          timestamp: checklist.completedAt,
          icon: 'check-circle',
          color: 'green',
          user: completedByMap.get(checklist.completedBy || '')
        });
      }
    });

    // 2. 최근 생성된 체크리스트 (최근 24시간)
    const newChecklists = await prisma.checklistInstance.findMany({
      where: {
        tenantId: tenantId,
        createdAt: {
          gte: yesterday
        },
        completedAt: null
      },
      include: {
        template: { select: { name: true } }
      },
      orderBy: { createdAt: 'desc' },
      take: 2
    });

    newChecklists.forEach(checklist => {
      activities.push({
        id: `checklist_new_${checklist.id}`,
        type: 'checklist_created',
        title: `새 체크리스트 생성`,
        description: `${checklist.template.name} 체크리스트가 ${getTimeAgo(checklist.createdAt)}에 생성되었습니다`,
        timestamp: checklist.createdAt,
        icon: 'plus-circle',
        color: 'blue',
      });
    });

    // 3. 재고 부족 아이템 (현재 부족한 것들)
    const lowStockItems = await prisma.$queryRaw<Array<{id: string, name: string, currentStock: number, minStock: number, updatedAt: Date}>>`
      SELECT id, name, "currentStock", "minStock", "updatedAt"
      FROM "InventoryItem" 
      WHERE "tenantId" = ${tenantId} 
      AND "currentStock" <= "minStock"
      ORDER BY "updatedAt" DESC
      LIMIT 3
    `;

    lowStockItems.forEach(item => {
      activities.push({
        id: `inventory_low_${item.id}`,
        type: 'inventory_low',
        title: '재고 부족 알림',
        description: `${item.name} 재고가 부족합니다 (현재: ${item.currentStock}, 최소: ${item.minStock})`,
        timestamp: item.updatedAt,
        icon: 'exclamation-triangle',
        color: 'yellow'
      });
    });

    // 4. 최근 업데이트된 재고 (최근 24시간)
    const updatedInventory = await prisma.inventoryItem.findMany({
      where: {
        tenantId: tenantId,
        updatedAt: {
          gte: yesterday
        }
      },
      orderBy: { updatedAt: 'desc' },
      take: 2
    });

    updatedInventory.forEach(item => {
      activities.push({
        id: `inventory_updated_${item.id}`,
        type: 'inventory_updated',
        title: '재고 업데이트',
        description: `${item.name} 재고가 ${getTimeAgo(item.updatedAt)}에 업데이트되었습니다`,
        timestamp: item.updatedAt,
        icon: 'refresh',
        color: 'teal'
      });
    });

    // 5. 최근 등록된 직원 (최근 24시간)
    const newEmployees = await prisma.employee.findMany({
      where: {
        tenantId: tenantId,
        createdAt: {
          gte: yesterday
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 2
    });

    newEmployees.forEach(employee => {
      activities.push({
        id: `employee_${employee.id}`,
        type: 'employee_added',
        title: '새 직원 등록',
        description: `${employee.name}님이 ${getTimeAgo(employee.createdAt)}에 시스템에 등록되었습니다`,
        timestamp: employee.createdAt,
        icon: 'user-plus',
        color: 'blue',
        user: employee.name
      });
    });

    // 6. 최근 공지사항 (최근 24시간)
    const newNotices = await prisma.notice.findMany({
      where: {
        tenantId: tenantId,
        createdAt: {
          gte: yesterday
        }
      },
      include: {
        author: { select: { name: true } }
      },
      orderBy: { createdAt: 'desc' },
      take: 2
    });

    newNotices.forEach(notice => {
      activities.push({
        id: `notice_${notice.id}`,
        type: 'notice_created',
        title: '새 공지사항',
        description: `"${notice.title}" 공지사항이 ${getTimeAgo(notice.createdAt)}에 게시되었습니다`,
        timestamp: notice.createdAt,
        icon: 'megaphone',
        color: 'red',
        user: notice.author?.name
      });
    });

    // 시간순으로 정렬하고 최대 10개만 반환
    const sortedActivities = activities
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, 10);

    return NextResponse.json(sortedActivities);

  } catch (error) {
    console.error('Dashboard activities error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch recent activities' },
      { status: 500 }
    );
  }
}

function getTimeAgo(date: Date): string {
  const now = new Date();
  const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
  
  if (diffInMinutes < 1) return '방금 전';
  if (diffInMinutes < 60) return `${diffInMinutes}분 전`;
  
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours}시간 전`;
  
  const diffInDays = Math.floor(diffInHours / 24);
  return `${diffInDays}일 전`;
}

