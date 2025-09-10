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
    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get('date'); // YYYY-MM-DD

    const baseDate = dateParam ? new Date(dateParam) : new Date();
    if (isNaN(baseDate.getTime())) {
      return NextResponse.json({ error: '유효하지 않은 날짜입니다.' }, { status: 400 });
    }

    const start = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate());
    const end = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate() + 1);

    const instances = await prisma.checklistInstance.findMany({
      where: {
        tenantId,
        OR: [
          { date: { gte: start, lt: end } },
          { createdAt: { gte: start, lt: end } }
        ]
      },
      include: {
        template: {
          select: { id: true, name: true, workplace: true, timeSlot: true }
        },
        _count: {
          select: { checklistItemProgresses: true }
        },
        checklistItemProgresses: {
          where: { isCompleted: true },
          select: { id: true }
        }
      },
      orderBy: [{ timeSlot: 'asc' }]
    });

    const result = instances.map((inst) => ({
      id: inst.id,
      templateId: inst.templateId,
      templateName: inst.template?.name || '',
      workplace: inst.template?.workplace || inst.workplace,
      timeSlot: inst.template?.timeSlot || inst.timeSlot,
      itemCount: inst._count.checklistItemProgresses,
      completedCount: inst.checklistItemProgresses.length,
      isCompleted: inst.isCompleted,
      date: inst.date
    }));

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('체크리스트 인스턴스 조회 오류:', error);
    return NextResponse.json({ error: '체크리스트 인스턴스 조회 실패' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuth(request, { requireAdmin: true });
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }

    const { tenantId } = authResult;
    const body = await request.json();
    const { templateIds, date } = body;

    // 입력 검증
    if (!templateIds || !Array.isArray(templateIds) || templateIds.length === 0) {
      return NextResponse.json(
        { error: '최소 하나의 템플릿을 선택해주세요.' },
        { status: 400 }
      );
    }

    if (!date) {
      return NextResponse.json(
        { error: '날짜를 선택해주세요.' },
        { status: 400 }
      );
    }

    // 날짜 파싱
    const targetDate = new Date(date);
    if (isNaN(targetDate.getTime())) {
      return NextResponse.json(
        { error: '유효하지 않은 날짜입니다.' },
        { status: 400 }
      );
    }

    // 템플릿들이 존재하고 해당 테넌트 소유인지 확인
    const templates = await prisma.checklistTemplate.findMany({
      where: {
        id: { in: templateIds },
        tenantId,
        isActive: true
      },
      include: {
        items: {
          where: { isActive: true },
          orderBy: { order: 'asc' }
        }
      }
    });

    if (templates.length !== templateIds.length) {
      return NextResponse.json(
        { error: '일부 템플릿을 찾을 수 없거나 접근 권한이 없습니다.' },
        { status: 404 }
      );
    }

    // 이미 해당 날짜에 생성된 인스턴스가 있는지 확인
    const existingInstances = await prisma.checklistInstance.findMany({
      where: {
        tenantId,
        templateId: { in: templateIds },
        OR: [
          {
            date: {
              gte: new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate()),
              lt: new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate() + 1)
            }
          },
          {
            createdAt: {
              gte: new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate()),
              lt: new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate() + 1)
            }
          }
        ]
      },
      include: {
        template: {
          select: { name: true }
        }
      }
    });

    if (existingInstances.length > 0) {
      const duplicateNames = existingInstances.map(instance => instance.template.name);
      return NextResponse.json(
        { 
          error: `해당 날짜에 이미 생성된 체크리스트가 있습니다: ${duplicateNames.join(', ')}` 
        },
        { status: 409 }
      );
    }

    // 트랜잭션으로 인스턴스들과 진행률 데이터 생성
    const result = await prisma.$transaction(async (tx) => {
      const createdInstances = [];

      for (const template of templates) {
        // 인스턴스 생성
        const instance = await tx.checklistInstance.create({
          data: {
            tenantId,
            templateId: template.id,
            date: targetDate,
            workplace: template.workplace,
            timeSlot: template.timeSlot,
            isCompleted: false,
            isSubmitted: false
          }
        });

        // 각 체크리스트 항목에 대한 진행률 데이터 생성
        for (const item of template.items) {
          await tx.checklistItemProgress.create({
            data: {
              instanceId: instance.id,
              checklistItemId: item.id,
              isCompleted: false
            }
          });
        }

        createdInstances.push({
          id: instance.id,
          templateName: template.name,
          workplace: template.workplace,
          timeSlot: template.timeSlot,
          itemCount: template.items.length
        });
      }

      return createdInstances;
    });

    console.log(`체크리스트 인스턴스 생성 완료: ${result.length}개 (날짜: ${targetDate.toISOString().split('T')[0]})`);

    return NextResponse.json({
      message: `${result.length}개의 체크리스트가 성공적으로 생성되었습니다.`,
      instances: result,
      date: targetDate.toISOString().split('T')[0]
    });

  } catch (error: any) {
    console.error('체크리스트 인스턴스 생성 오류:', error);
    
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: '이미 해당 날짜에 동일한 체크리스트가 존재합니다.' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: error.message || '체크리스트 인스턴스 생성에 실패했습니다.' },
      { status: 500 }
    );
  }
}

