import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

async function main() {
  const prisma = new PrismaClient()
  const employeeId = process.argv[2] || 'admin'
  const password = process.argv[3] || 'demo123'
  const tenantDomain = process.argv[4] || (process.env.DEFAULT_TENANT_DOMAIN || 'demo')

  console.log(`Bootstrapping superadmin: tenant=${tenantDomain} employeeId=${employeeId}`)

  // 1) Ensure tenant exists
  const tenant = await prisma.tenant.upsert({
    where: { domain: tenantDomain },
    update: {},
    create: {
      name: `${tenantDomain} tenant`,
      domain: tenantDomain,
      isActive: true,
      subscriptionTier: 'PRO',
      subscriptionStart: new Date(),
    },
  })

  // 2) Upsert superadmin employee
  const hashed = await bcrypt.hash(password, 12)
  const admin = await prisma.employee.upsert({
    where: { tenantId_employeeId: { tenantId: tenant.id, employeeId } },
    update: { isSuperAdmin: true, isActive: true, password: hashed },
    create: {
      tenantId: tenant.id,
      employeeId,
      password: hashed,
      name: '관리자',
      email: `${employeeId}@${tenantDomain}.local`,
      department: '관리',
      position: '관리자',
      isSuperAdmin: true,
      isActive: true,
    },
  })

  console.log('✅ Superadmin ready:', { tenant: tenant.domain, employeeId: admin.employeeId })
  await prisma.$disconnect()
}

main().catch(async (e) => {
  console.error(e)
  process.exit(1)
})


