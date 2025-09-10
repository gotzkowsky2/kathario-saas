import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(request, { requireAdmin: true });
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }

    const { tenantId } = authResult;
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'ACTIVE';

    let whereClause: any = { tenantId };
    
    if (status === 'ACTIVE') {
      whereClause.isActive = true;
    } else if (status === 'INACTIVE') {
      whereClause.isActive = false;
    }
    // 'ALL'인 경우 isActive 조건 없음

    const templates = await prisma.checklistTemplate.findMany({
      where: whereClause,
      include: {
        _count: {
          select: {
            items: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    const formattedTemplates = templates.map(template => ({
      id: template.id,
      name: template.name,
      workplace: template.workplace,
      category: template.category,
      timeSlot: template.timeSlot,
      inputter: template.inputter || "관리자",
      inputDate: template.createdAt.toISOString(),
      isActive: template.isActive,
      itemCount: template._count.items,
      autoGenerateEnabled: template.autoGenerateEnabled,
      recurrenceDays: template.recurrenceDays,
      generationTime: template.generationTime
    }));

    return NextResponse.json(formattedTemplates);
  } catch (error) {
    console.error("체크리스트 템플릿 조회 오류:", error);
    return NextResponse.json(
      { error: "템플릿 목록을 불러오는데 실패했습니다." },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuth(request, { requireAdmin: true });
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }

    const { tenantId, user } = authResult;
    const body = await request.json();
    const { name, workplace, category, timeSlot, autoGenerateEnabled, recurrenceDays, generationTime } = body;

    if (!name || !workplace || !category || !timeSlot) {
      return NextResponse.json(
        { error: "필수 필드가 누락되었습니다." },
        { status: 400 }
      );
    }

    // 중복 이름 체크
    const existingTemplate = await prisma.checklistTemplate.findFirst({
      where: {
        tenantId,
        name: name.trim()
      }
    });

    if (existingTemplate) {
      return NextResponse.json(
        { error: "이미 존재하는 템플릿 이름입니다." },
        { status: 400 }
      );
    }

    const template = await prisma.checklistTemplate.create({
      data: {
        tenantId,
        name: name.trim(),
        content: name.trim(), // content 필드 추가 (템플릿 이름과 동일하게 설정)
        workplace,
        category,
        timeSlot,
        inputter: user.name,
        isActive: true,
        autoGenerateEnabled: autoGenerateEnabled || false,
        recurrenceDays: recurrenceDays || [],
        generationTime: generationTime || null
      }
    });

    return NextResponse.json({
      id: template.id,
      name: template.name,
      workplace: template.workplace,
      category: template.category,
      timeSlot: template.timeSlot,
      inputter: template.inputter,
      inputDate: template.createdAt.toISOString(),
      isActive: template.isActive,
      itemCount: 0,
      autoGenerateEnabled: template.autoGenerateEnabled,
      recurrenceDays: template.recurrenceDays,
      generationTime: template.generationTime
    });
  } catch (error) {
    console.error("체크리스트 템플릿 생성 오류:", error);
    return NextResponse.json(
      { error: "템플릿 등록에 실패했습니다." },
      { status: 500 }
    );
  }
}
