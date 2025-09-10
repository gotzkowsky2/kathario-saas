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
    const precautionId = resolvedParams.id;

    if (!precautionId) {
      return NextResponse.json({ error: 'Precaution ID is required' }, { status: 400 });
    }

    const precaution = await prisma.precaution.findFirst({
      where: {
        id: precautionId,
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
      },
    });

    if (!precaution) {
      return NextResponse.json({ error: 'Precaution not found' }, { status: 404 });
    }

    return NextResponse.json(precaution);
  } catch (error) {
    console.error('Error fetching precaution:', error);
    return NextResponse.json({ error: 'Failed to fetch precaution' }, { status: 500 });
  }
}

