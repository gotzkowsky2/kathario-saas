import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { sendEmailDetailed, getMailerStatus } from '@/lib/mailer'

// 테스트 엔드포인트 비활성화
export async function GET() {
  return NextResponse.json({ error: 'This endpoint is disabled.' }, { status: 403 })
}


