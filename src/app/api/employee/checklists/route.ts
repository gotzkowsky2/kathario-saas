import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

async function verifyEmployee(request: NextRequest) {
  // 우선 순위: employee_auth → admin_auth → kathario_auth
  const employeeAuth = request.cookies.get('employee_auth')?.value;
  const adminAuth = request.cookies.get('admin_auth')?.value;
  const katharioCookieName = process.env.NODE_ENV === 'production' ? '__Host-kathario_auth' : 'kathario_auth'
  const katharioAuth = request.cookies.get(katharioCookieName)?.value

  let userId: string | null = employeeAuth || adminAuth || null

  // kathario_auth를 통해 userId 복원 (base64 JSON)
  if (!userId && katharioAuth) {
    try {
      const payload = JSON.parse(Buffer.from(katharioAuth, 'base64').toString())
      if (payload?.userId) {
        userId = payload.userId as string
      }
    } catch {}
  }

  if (!userId) throw new Error('로그인이 필요합니다.');

  const employee = await prisma.employee.findUnique({ 
    where: { id: userId }, 
    select: { id: true, name: true, tenantId: true, isSuperAdmin: true } 
  });
  
  if (!employee) throw new Error('유효하지 않은 인증');
  return employee;
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
        _count: {
          select: {
            items: {
              where: { parentId: null }
            }
          }
        },
        instances: {
          where: {
            createdAt: {
              gte: today,
              lt: tomorrow
            }
          },
          include: {
            _count: {
              select: {
                checklistItemProgresses: true
              }
            },
            checklistItemProgresses: {
              where: { isCompleted: true },
              select: { id: true }
            }
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
    const checklists = templates.map(template => {
      const instance = template.instances[0]; // 오늘의 인스턴스
      const itemCount = template._count.items;
      const completedCount = instance ? instance.checklistItemProgresses.length : 0;
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
        createdAt: template.createdAt
      };
    });

    return NextResponse.json(checklists);
  } catch (error: any) {
    console.error('체크리스트 조회 오류:', error);
    return NextResponse.json({ error: error.message || '조회 실패' }, { status: 500 });
  }
}

