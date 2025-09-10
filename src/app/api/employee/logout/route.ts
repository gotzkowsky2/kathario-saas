import { NextRequest, NextResponse } from "next/server";
import { serialize } from "cookie";

export async function POST(req: NextRequest) {
  const resp = NextResponse.json({ message: "로그아웃 되었습니다." }, {
    headers: {
      "Cache-Control": "no-store",
      "Content-Type": "application/json; charset=utf-8",
    }
  });

  const cookieNames = [
    "employee_auth",
    "admin_auth",
    "temp_pw_auth",
  ];

  // 모든 쿠키를 삭제
  for (const name of cookieNames) {
    const cookieStr = serialize(name, "", {
      httpOnly: true,
      path: "/",
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      expires: new Date(0),
      maxAge: 0,
    });
    resp.headers.append("Set-Cookie", cookieStr);
  }

  return resp;
}

