// Kathario SaaS - 로그아웃 API 라우트

import { NextRequest } from 'next/server'
import { createLogoutResponse } from '../../../../lib/auth'

export async function POST(request: NextRequest) {
  try {
    // 로그아웃 응답 생성 (쿠키 삭제)
    return createLogoutResponse('/login', request)
    
  } catch (error) {
    console.error('로그아웃 API 오류:', error)
    return createLogoutResponse('/login', request)
  }
}
