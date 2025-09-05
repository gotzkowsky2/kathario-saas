// Kathario SaaS - 인증 관련 타입 정의

import { Employee, Tenant, SubscriptionTier } from '../generated/prisma'

export interface AuthUser {
  id: string
  employeeId: string
  name: string
  email?: string
  department: string
  position: string
  isSuperAdmin: boolean
  tenantId: string
  tenant: {
    id: string
    name: string
    domain: string
    subscriptionTier: SubscriptionTier
  }
}

export interface AuthCookie {
  userId: string
  tenantId: string
  role: 'employee' | 'superadmin'
  iat: number
  exp: number
}

export interface LoginCredentials {
  employeeId: string
  password: string
  tenantDomain?: string
}

export interface SignupData {
  employeeId: string
  password: string
  name: string
  email?: string
  department: string
  position: string
  tenantDomain: string
}

export interface TenantContext {
  tenant: Tenant
  user?: AuthUser
  isAuthenticated: boolean
  subscriptionLimits: {
    maxEmployees: number
    maxInventoryItems: number
    maxChecklistTemplates: number
    hasAdvancedReports: boolean
    hasApiAccess: boolean
  }
}
