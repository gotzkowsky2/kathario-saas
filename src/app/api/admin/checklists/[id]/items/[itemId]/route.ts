import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import prisma from '@/lib/prisma';

// GET: 특정 체크리스트 항목 조회
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  try {
    const authResult = await requireAuth(request, { requireAdmin: true });
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }

    const { tenantId } = authResult;
    const resolvedParams = await params;
    const { id: templateId, itemId } = resolvedParams;

    // 템플릿 존재 확인 및 테넌트 검증
    const template = await prisma.checklistTemplate.findFirst({
      where: { 
        id: templateId,
        tenantId: tenantId
      }
    });

    if (!template) {
      return NextResponse.json({ error: "템플릿을 찾을 수 없습니다." }, { status: 404 });
    }

    // 체크리스트 항목 조회
    const item = await prisma.checklistItem.findFirst({
      where: { 
        id: itemId,
        templateId: templateId
      },
      include: {
        connectedItems: true
      }
    });

    if (!item) {
      return NextResponse.json({ error: "항목을 찾을 수 없습니다." }, { status: 404 });
    }

    return NextResponse.json(item);
  } catch (error) {
    console.error('Error fetching checklist item:', error);
    return NextResponse.json({ error: "체크리스트 항목을 조회하는 중 오류가 발생했습니다." }, { status: 500 });
  }
}

// PUT: 체크리스트 항목 수정
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  try {
    const authResult = await requireAuth(request, { requireAdmin: true });
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }

    const { tenantId } = authResult;
    const resolvedParams = await params;
    const { id: templateId, itemId } = resolvedParams;
    const body = await request.json();

    // 템플릿 존재 확인 및 테넌트 검증
    const template = await prisma.checklistTemplate.findFirst({
      where: { 
        id: templateId,
        tenantId: tenantId
      }
    });

    if (!template) {
      return NextResponse.json({ error: "템플릿을 찾을 수 없습니다." }, { status: 404 });
    }

    // 체크리스트 항목 존재 확인
    const existingItem = await prisma.checklistItem.findFirst({
      where: { 
        id: itemId,
        templateId: templateId
      }
    });

    if (!existingItem) {
      return NextResponse.json({ error: "항목을 찾을 수 없습니다." }, { status: 404 });
    }

    // 업데이트할 데이터 준비
    const updateData: any = {};
    
    if (body.content !== undefined) {
      if (!body.content.trim()) {
        return NextResponse.json({ error: "항목 내용은 필수입니다." }, { status: 400 });
      }
      updateData.content = body.content.trim();
    }
    
    if (body.instructions !== undefined) {
      updateData.instructions = body.instructions?.trim() || null;
    }
    
    if (body.order !== undefined) {
      updateData.order = body.order;
    }
    
    if (body.isRequired !== undefined) {
      updateData.isRequired = body.isRequired;
    }
    
    if (body.isActive !== undefined) {
      updateData.isActive = body.isActive;
    }

    // 체크리스트 항목 업데이트
    const updatedItem = await prisma.checklistItem.update({
      where: { id: itemId },
      data: updateData,
      include: {
        connectedItems: true
      }
    });

    return NextResponse.json(updatedItem);
  } catch (error) {
    console.error('Error updating checklist item:', error);
    return NextResponse.json({ error: "체크리스트 항목을 수정하는 중 오류가 발생했습니다." }, { status: 500 });
  }
}

// DELETE: 체크리스트 항목 삭제
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  try {
    const authResult = await requireAuth(request, { requireAdmin: true });
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }

    const { tenantId } = authResult;
    const resolvedParams = await params;
    const { id: templateId, itemId } = resolvedParams;

    // 템플릿 존재 확인 및 테넌트 검증
    const template = await prisma.checklistTemplate.findFirst({
      where: { 
        id: templateId,
        tenantId: tenantId
      }
    });

    if (!template) {
      return NextResponse.json({ error: "템플릿을 찾을 수 없습니다." }, { status: 404 });
    }

    // 체크리스트 항목 존재 확인
    const existingItem = await prisma.checklistItem.findFirst({
      where: { 
        id: itemId,
        templateId: templateId
      }
    });

    if (!existingItem) {
      return NextResponse.json({ error: "항목을 찾을 수 없습니다." }, { status: 404 });
    }

    // 연결된 항목들 먼저 삭제
    await prisma.checklistItemConnection.deleteMany({
      where: { checklistItemId: itemId }
    });

    // 체크리스트 항목 삭제
    await prisma.checklistItem.delete({
      where: { id: itemId }
    });

    return NextResponse.json({ message: "항목이 삭제되었습니다." });
  } catch (error) {
    console.error('Error deleting checklist item:', error);
    return NextResponse.json({ error: "체크리스트 항목을 삭제하는 중 오류가 발생했습니다." }, { status: 500 });
  }
}
