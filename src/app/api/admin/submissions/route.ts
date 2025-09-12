import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'crypto';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

interface SubmissionFilter {
  employeeId?: string;
  date?: string;
  startDate?: string;
  endDate?: string;
  templateId?: string;
  workplace?: string;
  timeSlot?: string;
  isCompleted?: boolean;
  isSubmitted?: boolean;
}

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(request, { requireAdmin: true });
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }
    const { tenantId } = authResult;

    const { searchParams } = new URL(request.url);
    
    // 필터 파라미터 추출
    const filters: SubmissionFilter = {
      employeeId: searchParams.get('employeeId') || undefined,
      date: searchParams.get('date') || undefined,
      startDate: searchParams.get('startDate') || undefined,
      endDate: searchParams.get('endDate') || undefined,
      templateId: searchParams.get('templateId') || undefined,
      workplace: searchParams.get('workplace') || undefined,
      timeSlot: searchParams.get('timeSlot') || undefined,
      isCompleted: searchParams.get('isCompleted') ? searchParams.get('isCompleted') === 'true' : undefined,
      isSubmitted: searchParams.get('isSubmitted') ? searchParams.get('isSubmitted') === 'true' : undefined,
    };

    // 기본 where 조건
    const where: any = {
      tenantId: tenantId
    };

    // 필터 조건 추가
    if (filters.employeeId) {
      where.employeeId = filters.employeeId;
    }

    if (filters.templateId) {
      where.templateId = filters.templateId;
    }

    if (filters.workplace) {
      where.template = {
        workplace: filters.workplace
      };
    }

    if (filters.timeSlot) {
      where.template = {
        ...where.template,
        timeSlot: filters.timeSlot
      };
    }

    if (filters.date) {
      const targetDate = new Date(filters.date);
      const nextDay = new Date(targetDate);
      nextDay.setDate(nextDay.getDate() + 1);
      
      where.createdAt = {
        gte: targetDate,
        lt: nextDay
      };
    } else if (filters.startDate || filters.endDate) {
      where.createdAt = {};
      if (filters.startDate) {
        where.createdAt.gte = new Date(filters.startDate);
      }
      if (filters.endDate) {
        const endDate = new Date(filters.endDate);
        endDate.setDate(endDate.getDate() + 1);
        where.createdAt.lt = endDate;
      }
    }

    if (filters.isCompleted !== undefined) {
      where.completedAt = filters.isCompleted ? { not: null } : null;
    }

    if (filters.isSubmitted !== undefined) {
      where.submittedAt = filters.isSubmitted ? { not: null } : null;
    }

    // 체크리스트 인스턴스 조회
    const instances = await prisma.checklistInstance.findMany({
      where,
      include: {
        template: {
          select: {
            name: true,
            workplace: true,
            timeSlot: true,
            category: true,
          }
        },
        employee: {
          select: { name: true }
        },
        checklistItemProgresses: {
          select: {
            id: true,
            isCompleted: true,
            notes: true,
            item: {
              select: { id: true, content: true, instructions: true }
            }
          }
        },
        connectedItemsProgress: {
          select: { id: true, isCompleted: true, notes: true, itemId: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // 완료자 이름 매핑 (completedBy는 문자열 ID)
    const completedByIds = Array.from(new Set(
      instances
        .map(i => i.completedBy)
        .filter((v): v is string => typeof v === 'string' && v.length > 0)
    ));
    const completedByEmployees = completedByIds.length
      ? await prisma.employee.findMany({
          where: { id: { in: completedByIds } },
          select: { id: true, name: true }
        })
      : [];
    const completedByMap = new Map(completedByEmployees.map(e => [e.id, e.name]));

    // 응답 데이터 포맷팅
    const submissions = instances.map(instance => {
      const totalMainItems = instance.checklistItemProgresses.length;
      const completedMainItems = instance.checklistItemProgresses.filter(p => p.isCompleted).length;

      const totalConnectedItems = instance.connectedItemsProgress.length;
      const completedConnectedItems = instance.connectedItemsProgress.filter(cp => cp.isCompleted).length;

      const totalItems = totalMainItems + totalConnectedItems;
      const completedItems = completedMainItems + completedConnectedItems;

      return {
        id: instance.id,
        date: instance.createdAt.toISOString().split('T')[0],
        templateId: instance.templateId,
        templateName: instance.template.name,
        employeeId: instance.employeeId || null,
        employeeName: instance.employee?.name || '미지정',
        workplace: instance.template.workplace,
        timeSlot: instance.template.timeSlot,
        category: instance.template.category,
        isCompleted: !!instance.completedAt,
        isSubmitted: !!instance.submittedAt,
        completedAt: instance.completedAt,
        submittedAt: instance.submittedAt,
        completedBy: completedByMap.get(instance.completedBy || '') || null,
        progress: {
          totalMainItems,
          mainItems: completedMainItems,
          totalConnectedItems,
          connectedItems: completedConnectedItems,
          totalItems,
          completedItems,
          percentage: totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0
        },
        details: {
          mainItems: instance.checklistItemProgresses.map(p => ({
            id: p.id,
            content: p.item?.content || '',
            instructions: p.item?.instructions || undefined,
            isCompleted: p.isCompleted,
            notes: p.notes || null,
          })),
          connectedItems: instance.connectedItemsProgress.map(cp => ({
            id: cp.id,
            title: '연결된 항목',
            isCompleted: cp.isCompleted,
            notes: cp.notes || null,
            itemType: 'ITEM',
            itemId: cp.itemId || '',
          })),
        }
      };
    });

    // ETag/마이크로캐시 적용
    try {
      const body = JSON.stringify(submissions)
      const etag = 'W/"' + createHash('sha1').update(body).digest('base64') + '"'
      const inm = request.headers.get('if-none-match')
      if (inm && inm === etag) {
        const res304 = new NextResponse(null, { status: 304 })
        res304.headers.set('ETag', etag)
        res304.headers.set('Cache-Control', 'public, s-maxage=15, stale-while-revalidate=30, max-age=0')
        return res304
      }
      const res = NextResponse.json(submissions)
      res.headers.set('ETag', etag)
      res.headers.set('Cache-Control', 'public, s-maxage=15, stale-while-revalidate=30, max-age=0')
      return res
    } catch {
      return NextResponse.json(submissions)
    }

  } catch (error) {
    console.error('Submissions fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch submissions' },
      { status: 500 }
    );
  }
}

