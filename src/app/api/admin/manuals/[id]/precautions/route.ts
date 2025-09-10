import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import prisma from '@/lib/prisma';

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
    const manualId = resolvedParams.id;

    // 메뉴얼 존재 확인
    const manual = await prisma.manual.findFirst({
      where: {
        id: manualId,
        tenantId
      }
    });

    if (!manual) {
      return NextResponse.json({ error: '메뉴얼을 찾을 수 없습니다.' }, { status: 404 });
    }

    // 메뉴얼에 연결된 주의사항들 조회
    const manualPrecautionRelations = await prisma.manualPrecautionRelation.findMany({
      where: {
        manualId: manualId
      },
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
    });

    const precautions = manualPrecautionRelations.map(relation => relation.precaution);

    return NextResponse.json({
      precautions
    });
  } catch (error) {
    console.error('메뉴얼 연결 주의사항 조회 오류:', error);
    return NextResponse.json({ error: '메뉴얼 연결 주의사항 조회 중 오류가 발생했습니다.' }, { status: 500 });
  }
}

