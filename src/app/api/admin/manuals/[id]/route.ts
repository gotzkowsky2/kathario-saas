import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

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

    if (!manualId) {
      return NextResponse.json({ error: 'Manual ID is required' }, { status: 400 });
    }

    const manual = await prisma.manual.findFirst({
      where: {
        id: manualId,
        tenantId: tenantId,
      },
      include: {
        tags: {
          select: {
            id: true,
            name: true,
            color: true,
          },
        },
        precautionRelations: {
          include: {
            precaution: {
              select: {
                id: true,
                title: true,
                content: true,
                priority: true,
              },
            },
          },
          orderBy: { order: 'asc' },
        },
      },
    });

    if (!manual) {
      return NextResponse.json({ error: 'Manual not found' }, { status: 404 });
    }

    // 연결된 주의사항 정보 포함
    const formattedManual = {
      ...manual,
      precautions: manual.precautionRelations.map(relation => relation.precaution),
    };

    return NextResponse.json(formattedManual);
  } catch (error) {
    console.error('Error fetching manual:', error);
    return NextResponse.json({ error: 'Failed to fetch manual' }, { status: 500 });
  }
}

