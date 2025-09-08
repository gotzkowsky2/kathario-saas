// 현재 로그인 사용자 정보 반환
import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '../../../../lib/auth'

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json({
      name: user.name,
      email: user.email ?? '',
      role: user.isSuperAdmin ? 'superadmin' : 'employee',
      tenantName: user.tenant?.name ?? ''
    })
  } catch (error) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}


