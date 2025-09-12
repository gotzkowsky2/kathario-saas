import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { parseAuthCookie } from '@/lib/auth';

async function verifyEmployee(request: NextRequest) {
  // 1) 새 kathario_auth 토큰 우선 (admin/employee 공통)
  const cookieName = process.env.NODE_ENV === 'production' ? '__Host-kathario_auth' : 'kathario_auth';
  const katharioToken = request.cookies.get(cookieName)?.value;
  if (katharioToken) {
    const payload = parseAuthCookie(katharioToken);
    if (payload?.userId) {
      const employee = await prisma.employee.findUnique({
        where: { id: payload.userId },
        select: { id: true, name: true, tenantId: true }
      });
      if (employee) return employee;
    }
  }

  // 2) 레거시 폴백: employee_auth/admin_auth에 사용자 ID가 직접 들어있는 경우
  const employeeAuth = request.cookies.get('employee_auth')?.value;
  const adminAuth = request.cookies.get('admin_auth')?.value;
  const fallbackId = employeeAuth || adminAuth;
  if (fallbackId) {
    const employee = await prisma.employee.findUnique({
      where: { id: fallbackId },
      select: { id: true, name: true, tenantId: true }
    });
    if (employee) return employee;
  }

  throw new Error('로그인이 필요합니다.');
}

export async function GET(request: NextRequest) {
  try {
    const employee = await verifyEmployee(request);
    const { searchParams } = new URL(request.url);
    const noticeLimit = parseInt(searchParams.get('noticeLimit') || '3');
    const manualLimit = parseInt(searchParams.get('manualLimit') || '5');
    const precautionLimit = parseInt(searchParams.get('precautionLimit') || '5');

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const [notices, manuals, precautions] = await Promise.all([
      prisma.notice.findMany({
        where: { 
          isActive: true,
          tenantId: employee.tenantId
        },
        select: { 
          id: true, 
          title: true, 
          createdAt: true, 
          author: { select: { name: true } } 
        },
        orderBy: { createdAt: 'desc' },
        take: noticeLimit,
      }),
      prisma.manual.findMany({
        where: { 
          isActive: true, 
          updatedAt: { gte: sevenDaysAgo },
          tenantId: employee.tenantId
        },
        select: { 
          id: true, 
          title: true, 
          updatedAt: true 
        },
        orderBy: { updatedAt: 'desc' },
        take: manualLimit,
      }),
      prisma.precaution.findMany({
        where: { 
          isActive: true, 
          OR: [
            { createdAt: { gte: sevenDaysAgo } }, 
            { updatedAt: { gte: sevenDaysAgo } }
          ],
          tenantId: employee.tenantId
        },
        select: { 
          id: true, 
          title: true, 
          priority: true, 
          updatedAt: true, 
          createdAt: true 
        },
        orderBy: { updatedAt: 'desc' },
        take: precautionLimit,
      }),
    ]);

    // 재고 업데이트 필요(상위 5개)까지 함께 제공하여 추가 네트워크 요청 제거
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 2);
    const inventoryStale = await prisma.inventoryItem.findMany({
      where: {
        tenantId: employee.tenantId,
        OR: [
          { lastUpdated: { lt: cutoff } },
          { checks: { none: {} } },
        ],
        isActive: true,
      },
      orderBy: [{ lastUpdated: 'asc' }, { updatedAt: 'asc' }],
      take: 5,
      select: {
        id: true,
        name: true,
        category: true,
        currentStock: true,
        minStock: true,
        unit: true,
        lastUpdated: true,
        // createdAt, lastCheckedBy 필드는 선택적 – 존재 시 클라이언트에서 사용
      },
    });

    const payload = {
      notices,
      updatedManuals: manuals,
      newPrecautions: precautions,
      inventoryStale,
      metadata: { cutoffDate: sevenDaysAgo.toISOString() }
    }
    // ETag + 초단기 캐시
    try {
      const body = JSON.stringify(payload)
      const etag = 'W/"' + require('crypto').createHash('sha1').update(body).digest('base64') + '"'
      const inm = request.headers.get('if-none-match')
      if (inm && inm === etag) {
        const res304 = new NextResponse(null, { status: 304 })
        res304.headers.set('ETag', etag)
        res304.headers.set('Cache-Control', 'public, s-maxage=15, stale-while-revalidate=30, max-age=0')
        return res304
      }
      const res = NextResponse.json(payload)
      res.headers.set('ETag', etag)
      res.headers.set('Cache-Control', 'public, s-maxage=15, stale-while-revalidate=30, max-age=0')
      return res
    } catch {
      const res = NextResponse.json(payload)
      res.headers.set('Cache-Control', 'public, s-maxage=15, stale-while-revalidate=30, max-age=0')
      return res
    }
  } catch (e: any) {
    console.error('피드 조회 오류:', e);
    return NextResponse.json({ error: e.message || '조회 실패' }, { status: 500 });
  }
}

