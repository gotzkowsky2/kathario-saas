import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function POST(request: NextRequest) {
  try {
    console.log("=== 직원 로그인 시작 ===");
    
    const { employeeId, password } = await request.json();
    console.log("로그인 시도:", employeeId);
    
    if (!employeeId || !password) {
      return NextResponse.json({ error: "아이디와 비밀번호를 입력하세요." }, { status: 400 });
    }

    console.log("데이터베이스에서 직원 조회 중...");
    const employee = await prisma.employee.findFirst({ 
      where: { 
        employeeId: employeeId
      } 
    });
    
    console.log("직원 조회 결과:", employee ? "찾음" : "없음");
    
    if (!employee) {
      return NextResponse.json({ error: "존재하지 않는 직원 ID입니다." }, { status: 401 });
    }

    console.log("비밀번호 확인 중...");
    const isPasswordValid = await bcrypt.compare(password, employee.password);
    console.log("비밀번호 확인 결과:", isPasswordValid);
    
    if (!isPasswordValid) {
      return NextResponse.json({ error: "비밀번호가 일치하지 않습니다." }, { status: 401 });
    }

    const isProd = process.env.NODE_ENV === "production";
    const commonCookie = {
      httpOnly: true,
      path: "/",
      sameSite: "lax" as const,
      secure: isProd,
      maxAge: 60 * 60 * 24 * 7, // 7일
    };

    console.log("쿠키 설정 중...");
    
    // 임시비밀번호 여부 체크
    if (employee.isTempPassword) {
      console.log("임시 비밀번호 사용자");
      const response = NextResponse.json({ redirectTo: "/employee/change-password" });
      response.cookies.set("employee_auth", employee.id, commonCookie);
      response.cookies.set("temp_pw_auth", "1", commonCookie);
      return response;
    }

    console.log("로그인 성공 처리 중...");
    
    // 로그인 성공
    const response = NextResponse.json({
      success: true,
      redirectTo: employee.isSuperAdmin ? "/dashboard" : "/employee",
    });

    response.cookies.set("employee_auth", employee.id, commonCookie);

    if (employee.isSuperAdmin) {
      response.cookies.set("admin_auth", employee.id, commonCookie);
      console.log("관리자 쿠키 설정");
    } else {
      // 슈퍼관리자 쿠키 제거
      response.cookies.set("admin_auth", "", { ...commonCookie, maxAge: -1, expires: new Date(0) });
      console.log("일반 직원 로그인");
    }

    // 임시비밀번호 쿠키 제거
    response.cookies.set("temp_pw_auth", "", { ...commonCookie, maxAge: -1, expires: new Date(0) });

    console.log("로그인 완료");
    return response;
  } catch (error) {
    console.error("직원 로그인 오류:", error);
    return NextResponse.json({ error: "로그인 중 오류가 발생했습니다." }, { status: 500 });
  }
}
