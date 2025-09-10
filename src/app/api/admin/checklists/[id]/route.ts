import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

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
    const templateId = resolvedParams.id;

    const template = await prisma.checklistTemplate.findFirst({
      where: {
        id: templateId,
        tenantId
      },
      include: {
        _count: {
          select: {
            items: true
          }
        }
      }
    });

    if (!template) {
      return NextResponse.json(
        { error: "템플릿을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      id: template.id,
      name: template.name,
      workplace: template.workplace,
      category: template.category,
      timeSlot: template.timeSlot,
      inputter: template.inputter,
      inputDate: template.createdAt.toISOString(),
      isActive: template.isActive,
      itemCount: template._count.items,
      autoGenerateEnabled: template.autoGenerateEnabled,
      recurrenceDays: template.recurrenceDays,
      generationTime: template.generationTime
    });
  } catch (error) {
    console.error("체크리스트 템플릿 조회 오류:", error);
    return NextResponse.json(
      { error: "템플릿 조회에 실패했습니다." },
      { status: 500 }
    );
  }
}

export async function PUT(
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
    const templateId = resolvedParams.id;
    const body = await request.json();
    const { name, workplace, category, timeSlot, isActive, autoGenerateEnabled, recurrenceDays, generationTime } = body;

    // 템플릿 존재 확인
    const existingTemplate = await prisma.checklistTemplate.findFirst({
      where: {
        id: templateId,
        tenantId
      }
    });

    if (!existingTemplate) {
      return NextResponse.json(
        { error: "템플릿을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // 이름이 변경된 경우 중복 체크
    if (name && name.trim() !== existingTemplate.name) {
      const duplicateTemplate = await prisma.checklistTemplate.findFirst({
        where: {
          tenantId,
          name: name.trim(),
          id: { not: templateId }
        }
      });

      if (duplicateTemplate) {
        return NextResponse.json(
          { error: "이미 존재하는 템플릿 이름입니다." },
          { status: 400 }
        );
      }
    }

    const updateData: any = {};
    if (name !== undefined) updateData.name = name.trim();
    if (workplace !== undefined) updateData.workplace = workplace;
    if (category !== undefined) updateData.category = category;
    if (timeSlot !== undefined) updateData.timeSlot = timeSlot;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (autoGenerateEnabled !== undefined) updateData.autoGenerateEnabled = autoGenerateEnabled;
    if (recurrenceDays !== undefined) updateData.recurrenceDays = recurrenceDays;
    if (generationTime !== undefined) updateData.generationTime = generationTime;

    const updatedTemplate = await prisma.checklistTemplate.update({
      where: { id: templateId },
      data: updateData,
      include: {
        _count: {
          select: {
            items: true
          }
        }
      }
    });

    return NextResponse.json({
      id: updatedTemplate.id,
      name: updatedTemplate.name,
      workplace: updatedTemplate.workplace,
      category: updatedTemplate.category,
      timeSlot: updatedTemplate.timeSlot,
      inputter: updatedTemplate.inputter,
      inputDate: updatedTemplate.createdAt.toISOString(),
      isActive: updatedTemplate.isActive,
      itemCount: updatedTemplate._count.items,
      autoGenerateEnabled: updatedTemplate.autoGenerateEnabled,
      recurrenceDays: updatedTemplate.recurrenceDays,
      generationTime: updatedTemplate.generationTime
    });
  } catch (error) {
    console.error("체크리스트 템플릿 수정 오류:", error);
    return NextResponse.json(
      { error: "템플릿 수정에 실패했습니다." },
      { status: 500 }
    );
  }
}

export async function DELETE(
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
    const templateId = resolvedParams.id;

    // 템플릿 존재 확인
    const existingTemplate = await prisma.checklistTemplate.findFirst({
      where: {
        id: templateId,
        tenantId
      }
    });

    if (!existingTemplate) {
      return NextResponse.json(
        { error: "템플릿을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // 관련된 항목들도 함께 삭제 (CASCADE)
    await prisma.checklistTemplate.delete({
      where: { id: templateId }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("체크리스트 템플릿 삭제 오류:", error);
    return NextResponse.json(
      { error: "템플릿 삭제에 실패했습니다." },
      { status: 500 }
    );
  }
}
