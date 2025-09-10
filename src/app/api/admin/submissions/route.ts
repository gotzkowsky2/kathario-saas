import { NextRequest, NextResponse } from 'next/server';
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
      where.assignedToId = filters.employeeId;
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
            category: true
          }
        },
        assignedTo: {
          select: {
            name: true
          }
        },
        completedBy: {
          select: {
            name: true
          }
        },
        items: {
          include: {
            progress: {
              include: {
                connectedItemProgress: true
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // 응답 데이터 포맷팅
    const submissions = instances.map(instance => {
      const totalMainItems = instance.items.length;
      const completedMainItems = instance.items.filter(item => 
        item.progress && item.progress.length > 0 && item.progress[0].isCompleted
      ).length;

      const totalConnectedItems = instance.items.reduce((sum, item) => 
        sum + (item.progress?.[0]?.connectedItemProgress?.length || 0), 0
      );
      
      const completedConnectedItems = instance.items.reduce((sum, item) => 
        sum + (item.progress?.[0]?.connectedItemProgress?.filter(cp => cp.isCompleted).length || 0), 0
      );

      const totalItems = totalMainItems + totalConnectedItems;
      const completedItems = completedMainItems + completedConnectedItems;

      return {
        id: instance.id,
        date: instance.createdAt.toISOString().split('T')[0],
        templateId: instance.templateId,
        templateName: instance.template.name,
        employeeId: instance.assignedToId,
        employeeName: instance.assignedTo?.name || '미지정',
        workplace: instance.template.workplace,
        timeSlot: instance.template.timeSlot,
        category: instance.template.category,
        isCompleted: !!instance.completedAt,
        isSubmitted: !!instance.submittedAt,
        completedAt: instance.completedAt,
        submittedAt: instance.submittedAt,
        completedBy: instance.completedBy?.name,
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
          mainItems: instance.items.map(item => ({
            id: item.id,
            content: item.content,
            instructions: item.instructions,
            isCompleted: item.progress && item.progress.length > 0 ? item.progress[0].isCompleted : false,
            notes: item.progress && item.progress.length > 0 ? item.progress[0].notes : null
          })),
          connectedItems: instance.items.flatMap(item => 
            item.progress?.[0]?.connectedItemProgress?.map(cp => ({
              id: cp.id,
              title: `연결된 항목 ${cp.itemType}`,
              isCompleted: cp.isCompleted,
              notes: cp.notes,
              itemType: cp.itemType,
              itemId: cp.itemId
            })) || []
          )
        }
      };
    });

    return NextResponse.json(submissions);

  } catch (error) {
    console.error('Submissions fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch submissions' },
      { status: 500 }
    );
  }
}

