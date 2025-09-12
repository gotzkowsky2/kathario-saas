import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { parseAuthCookie } from '@/lib/auth';

async function verifyEmployee(request: NextRequest) {
  const cookieName = process.env.NODE_ENV === 'production' ? '__Host-kathario_auth' : 'kathario_auth'
  const katharioAuth = request.cookies.get(cookieName)?.value

  if (katharioAuth) {
    const payload = parseAuthCookie(katharioAuth || '')
    if (payload?.userId) {
      const employee = await prisma.employee.findUnique({
        where: { id: payload.userId },
        select: { id: true, name: true, tenantId: true, isSuperAdmin: true }
      })
      if (employee) return employee
    }
  }

  // 레거시 폴백
  const employeeAuth = request.cookies.get('employee_auth')?.value
  const adminAuth = request.cookies.get('admin_auth')?.value
  const userId = employeeAuth || adminAuth || null

  if (userId) {
    const employee = await prisma.employee.findUnique({
      where: { id: userId },
      select: { id: true, name: true, tenantId: true, isSuperAdmin: true }
    })
    if (employee) return employee
  }

  throw new Error('로그인이 필요합니다.')
}

export async function GET(request: NextRequest) {
  try {
    const employee = await verifyEmployee(request);
    const { searchParams } = new URL(request.url);
    
    // 필터 파라미터
    const workplace = searchParams.get('workplace');
    const timeSlot = searchParams.get('timeSlot');
    const category = searchParams.get('category');
    
    // 오늘 날짜
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // 체크리스트 템플릿 조회 (활성화된 것만)
    const whereClause: any = {
      tenantId: employee.tenantId,
      isActive: true
    };

    if (workplace) whereClause.workplace = workplace;
    if (timeSlot) whereClause.timeSlot = timeSlot;
    if (category) whereClause.category = category;

    const templates = await prisma.checklistTemplate.findMany({
      where: whereClause,
      include: {
        items: {
          where: { isActive: true },
          include: { connectedItems: true },
          orderBy: { order: 'asc' }
        },
        instances: {
          where: {
            OR: [
              {
                date: {
                  gte: today,
                  lt: tomorrow
                }
              },
              {
                createdAt: {
                  gte: today,
                  lt: tomorrow
                }
              }
            ]
          },
          include: {
            checklistItemProgresses: { where: { isCompleted: true }, select: { id: true, itemId: true } },
            connectedItemsProgress: { where: { isCompleted: true }, select: { id: true } },
          }
        }
      },
      orderBy: [
        { timeSlot: 'asc' },
        { workplace: 'asc' },
        { name: 'asc' }
      ]
    });

    // 응답 데이터 구성
    const checklists = await Promise.all(templates.map(async (template) => {
      const instance = (template as any).instances[0]; // 오늘의 인스턴스
      const templateItems = (template as any).items as Array<any>;
      // V2 규칙과 일치: 메인은 리프(자식 X, 연결 X)만 카운트. 연결항목은 전부 카운트
      // 1) 템플릿의 모든 활성 아이템 평면 조회
      const flatItems = await prisma.checklistItem.findMany({
        where: { templateId: template.id, isActive: true },
        select: { id: true, parentId: true }
      })
      const itemIds = flatItems.map(i => i.id)
      // 2) 연결항목 일괄 조회(카운트용)
      const flatConns = await prisma.checklistItemConnection.findMany({
        where: { checklistItemId: { in: itemIds } },
        select: { id: true, checklistItemId: true }
      })
      // 3) children map
      const hasChild = new Set<string>()
      for (const it of flatItems) {
        if (it.parentId) hasChild.add(it.parentId)
      }
      // 4) connections map
      const connCountByItem: Record<string, number> = {}
      for (const c of flatConns) {
        connCountByItem[c.checklistItemId] = (connCountByItem[c.checklistItemId] || 0) + 1
      }
      // 5) leaf 메인 개수(자식 X, 연결 X)
      const leafItemIds = flatItems.filter(i => !hasChild.has(i.id) && !(connCountByItem[i.id] > 0)).map(i => i.id)
      const totalMain = leafItemIds.length
      const totalConnected = flatConns.length
      const itemCount = totalMain + totalConnected

      // 완료 수: 리프 메인 완료 + 연결항목 완료
      const completedMain = instance ? ((instance.checklistItemProgresses||[]).filter((p:any)=> leafItemIds.includes(p.itemId)).length) : 0
      const completedConnected = instance ? (instance.connectedItemsProgress?.length || 0) : 0
      // 매뉴얼에 연결된 주의사항 총합(배지용)
      const manualIds = templateItems.flatMap((it:any)=> (it.connectedItems||[])
        .filter((c:any)=>c.itemType==='manual')
        .map((c:any)=>c.itemId))
      let manualConnectedPrecautions = 0
      if (manualIds.length > 0) {
        const rels = await prisma.manualPrecautionRelation.findMany({
          where: {
            manualId: { in: manualIds },
            manual: { tenantId: employee.tenantId },
            precaution: { tenantId: employee.tenantId }
          },
          select: { manualId: true }
        })
        manualConnectedPrecautions = rels.length
      }
      const completedCount = completedMain + completedConnected;
      const totalProgress = itemCount > 0 ? Math.round((completedCount / itemCount) * 100) : 0;
      
      let status = 'pending';
      if (instance) {
        if (instance.completedAt) {
          status = 'completed';
        } else if (completedCount > 0) {
          status = 'in_progress';
        }
      }

      return {
        id: template.id,
        name: template.name,
        workplace: template.workplace,
        category: template.category,
        timeSlot: template.timeSlot,
        itemCount,
        completedCount,
        totalProgress,
        status,
        instanceId: instance?.id || null,
        isCompleted: !!instance?.completedAt,
        createdAt: template.createdAt,
        manualConnectedPrecautions
      };
    }));

    return NextResponse.json(checklists);
  } catch (error: any) {
    console.error('체크리스트 조회 오류:', error);
    return NextResponse.json({ error: error.message || '조회 실패' }, { status: 500 });
  }
}

