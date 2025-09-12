import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { parseAuthCookie } from '@/lib/auth'
import { sendEmail, getMailerStatus, sendEmailDetailed } from '@/lib/mailer'

async function getCurrentEmployee(request: NextRequest) {
  const cookieName = process.env.NODE_ENV === 'production' ? '__Host-kathario_auth' : 'kathario_auth'
  const token = request.cookies.get(cookieName)?.value
  if (token) {
    const payload = parseAuthCookie(token)
    if (payload?.userId) {
      const employee = await prisma.employee.findUnique({
        where: { id: payload.userId },
        select: { id: true, tenantId: true, name: true }
      })
      if (employee) return employee
    }
  }
  const legacyId = request.cookies.get('employee_auth')?.value || request.cookies.get('admin_auth')?.value
  if (legacyId) {
    const employee = await prisma.employee.findUnique({
      where: { id: legacyId },
      select: { id: true, tenantId: true, name: true }
    })
    if (employee) return employee
  }
  throw new Error('로그인이 필요합니다.')
}

export async function POST(request: NextRequest) {
  try {
    const employee = await getCurrentEmployee(request)
    const body = await request.json()
    const { instanceId, notes, requireConnectedComplete } = body || {}
    if (!instanceId) {
      return NextResponse.json({ error: 'instanceId가 필요합니다.' }, { status: 400 })
    }

    const instance = await prisma.checklistInstance.findUnique({ where: { id: instanceId } })
    if (!instance || instance.tenantId !== employee.tenantId) {
      return NextResponse.json({ error: '체크리스트를 찾을 수 없습니다.' }, { status: 404 })
    }

    // 모든 메인 항목 완료 확인
    const counts = await prisma.checklistItemProgress.groupBy({
      by: ['isCompleted'],
      where: { instanceId },
      _count: { _all: true }
    })
    const total = counts.reduce((s, r) => s + r._count._all, 0)
    const done = counts.find(r => r.isCompleted)?._count._all || 0
    if (total === 0 || done < total) {
      return NextResponse.json({ error: '모든 항목을 완료해야 제출할 수 있습니다.' }, { status: 400 })
    }

    // 옵션: 연결항목까지 모두 완료 강제
    if (requireConnectedComplete) {
      const connCounts = await prisma.connectedItemProgress.groupBy({
        by: ['isCompleted'],
        where: { instanceId },
        _count: { _all: true }
      })
      const connTotal = connCounts.reduce((s, r) => s + r._count._all, 0)
      const connDone = connCounts.find(r => r.isCompleted)?._count._all || 0
      if (connTotal > 0 && connDone < connTotal) {
        return NextResponse.json({ error: '연결 항목까지 완료해야 제출할 수 있습니다.' }, { status: 400 })
      }
    }

    const updated = await prisma.checklistInstance.update({
      where: { id: instanceId },
      data: {
        isSubmitted: true,
        submittedAt: new Date(),
        notes: notes ?? undefined,
      }
    })
    // 비동기 메일 알림 (베스트에포트)
    let emailSent = false
    let emailRecipientCount = 0
    let tenantName: string | undefined
    let mailError: string | undefined
    try {
      const tenant = await prisma.tenant.findUnique({ where: { id: instance.tenantId }, select: { name: true, ownerEmail: true, settings: true } })
      const settings = (tenant?.settings as any) || {}
      tenantName = tenant?.name || undefined
      const recipients: string[] = Array.isArray(settings.submissionEmails) && settings.submissionEmails.length > 0
        ? settings.submissionEmails
        : (tenant?.ownerEmail ? [tenant.ownerEmail] : [])
      emailRecipientCount = recipients.length
      if (recipients.length > 0) {
        const template = await prisma.checklistTemplate.findUnique({ where: { id: instance.templateId }, select: { name: true, workplace: true, timeSlot: true } })

        // 진행률 및 완료 정보 수집(안전한 groupBy로 집계)
        const mainCounts = await prisma.checklistItemProgress.groupBy({
          by: ['isCompleted'],
          where: { instanceId },
          _count: { _all: true }
        })
        const connectedCounts = await prisma.connectedItemProgress.groupBy({
          by: ['isCompleted'],
          where: { instanceId },
          _count: { _all: true }
        })

        const totalMain = mainCounts.reduce((s, r) => s + r._count._all, 0)
        const completedMain = mainCounts.find(r => r.isCompleted)?._count._all || 0
        const totalConnected = connectedCounts.reduce((s, r) => s + r._count._all, 0)
        const completedConnected = connectedCounts.find(r => r.isCompleted)?._count._all || 0
        const totalItems = totalMain + totalConnected
        const completedItems = completedMain + completedConnected
        const progressPercent = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0

        // Basak 스타일: 트리 재구성 후 HTML 렌더
        // 1) 평면 아이템/연결/프로그레스 로드
        const flatItems = await prisma.checklistItem.findMany({
          where: { templateId: instance.templateId, isActive: true },
          select: { id: true, content: true, instructions: true, parentId: true, order: true },
          orderBy: { order: 'asc' }
        })
        const itemIds = flatItems.map(i => i.id)
        const flatConns = await prisma.checklistItemConnection.findMany({
          where: { checklistItemId: { in: itemIds } },
          select: { id: true, checklistItemId: true, itemType: true, itemId: true, order: true },
          orderBy: { order: 'asc' }
        })
        const itemProgresses = await prisma.checklistItemProgress.findMany({
          where: { instanceId },
          select: { itemId: true, isCompleted: true, notes: true, completedBy: true, completedAt: true }
        })
        const connProgresses = await prisma.connectedItemProgress.findMany({
          where: { instanceId },
          select: { connectionId: true, isCompleted: true, notes: true, completedBy: true, completedAt: true }
        })

        const progressMap = new Map<string, { isCompleted: boolean; notes: string | null; completedBy: string | null; completedAt: Date | null }>()
        itemProgresses.forEach(p => progressMap.set(p.itemId, { isCompleted: p.isCompleted, notes: p.notes || null, completedBy: p.completedBy || null, completedAt: p.completedAt || null }))
        const connectedProg = new Map<string, { isCompleted: boolean; notes: string | null; completedBy: string | null; completedAt: Date | null }>()
        connProgresses.forEach(p => connectedProg.set(p.connectionId!, { isCompleted: p.isCompleted, notes: p.notes || null, completedBy: p.completedBy || null, completedAt: p.completedAt || null }))

        const childrenByParent = new Map<string, any[]>()
        const connsByItem = new Map<string, any[]>()
        for (const it of flatItems) {
          if (it.parentId) {
            const arr = childrenByParent.get(it.parentId) || []
            arr.push(it)
            childrenByParent.set(it.parentId, arr)
          }
        }
        for (const c of flatConns) {
          const arr = connsByItem.get(c.checklistItemId) || []
          arr.push(c)
          connsByItem.set(c.checklistItemId, arr)
        }

        const buildNode = (it: any): any => {
          const prog = progressMap.get(it.id)
          const rawConns = (connsByItem.get(it.id) || []).sort((a:any,b:any)=> (a.order??0)-(b.order??0))
          const connections = rawConns.map((c: any) => ({
            connectionId: c.id,
            itemType: c.itemType,
            itemId: c.itemId,
            isCompleted: connectedProg.get(c.id)?.isCompleted || false,
            notes: connectedProg.get(c.id)?.notes || null,
            completedBy: connectedProg.get(c.id)?.completedBy || null,
            completedAt: connectedProg.get(c.id)?.completedAt || null,
          }))
          const rawChildren = (childrenByParent.get(it.id) || []).sort((a:any,b:any)=> (a.order??0)-(b.order??0))
          const children = rawChildren.map((ch: any) => buildNode(ch))

          const derivedCompletedFromConnections = (prog ? prog.isCompleted : undefined) === undefined && connections.length > 0
            ? connections.every((c: any) => !!c.isCompleted)
            : undefined
          const derivedCompletedFromChildren = children.length > 0
            ? children.every((ch: any) => !!ch.isCompleted)
            : undefined
          const isCompleted = prog?.isCompleted
            ?? derivedCompletedFromConnections
            ?? derivedCompletedFromChildren
            ?? false

          return {
            id: it.id,
            content: it.content,
            instructions: it.instructions || undefined,
            isCompleted,
            notes: prog ? prog.notes : null,
            completedBy: prog ? (prog as any).completedBy : null,
            completedAt: prog ? (prog as any).completedAt : null,
            connections,
            children
          }
        }

        const roots = flatItems.filter((i: any) => !i.parentId).sort((a:any,b:any)=> (a.order??0)-(b.order??0))
        const itemsTree = roots.map((r: any) => buildNode(r))

        const escape = (s: any) => String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
        
        const renderChecklistSection = (itemsTree: any[], connDetails: Map<string, any>): string => {
          const truncateText = (text: string, maxLength: number = 80) => {
            if (!text || text.length <= maxLength) return escape(text || '')
            return escape(text.substring(0, maxLength)) + '<span style="color: #9ca3af;">...</span>'
          }
          
          const renderItem = (item: any, depth: number = 0): string => {
            const indent = depth * 12
            const nonInventoryConns = (item.connections || []).filter((c: any) => c.itemType !== 'inventory')
            const itemContent = truncateText(item.content, 60)
            const itemInstructions = item.instructions ? truncateText(item.instructions, 50) : ''
            
            return `
              <div style="margin-left: ${indent}px; margin-bottom: 12px; padding: 12px; background: #ffffff; border: 1px solid #e5e7eb; border-radius: 6px;">
                <div style="display: flex; align-items: flex-start; gap: 8px;">
                  <span style="font-size: 16px; margin-top: 2px;">${item.isCompleted ? '✅' : '⬜'}</span>
                  <div style="flex: 1; min-width: 0;">
                    <div style="font-weight: 600; color: #1f2937; margin-bottom: 4px; word-wrap: break-word;">
                      ${itemContent}
                    </div>
                    ${itemInstructions ? `<div style="color: #6b7280; font-size: 12px; margin-bottom: 6px; word-wrap: break-word;">${itemInstructions}</div>` : ''}
                    ${item.completedBy || item.completedAt ? `
                      <div style="font-size: 11px; color: #9ca3af; margin-bottom: 8px;">
                        ${item.completedBy ? `👤 ${escape(item.completedBy)}` : ''} 
                        ${item.completedAt ? `🕒 ${new Date(item.completedAt).toLocaleString('ko-KR')}` : ''}
                      </div>
                    ` : ''}
                    ${nonInventoryConns.length > 0 ? `
                      <div style="margin-top: 8px;">
                        ${nonInventoryConns.map((c: any) => {
                          const detail = connDetails.get(`${c.itemType}_${c.itemId}`)
                          const bgColor = c.itemType === 'precaution' ? '#fef3c7' : '#e0e7ff'
                          const borderColor = c.itemType === 'precaution' ? '#f59e0b' : '#6366f1'
                          const textColor = c.itemType === 'precaution' ? '#92400e' : '#3730a3'
                          const icon = c.itemType === 'precaution' ? '⚠️' : '📖'
                          const title = truncateText(detail?.title || '제목 없음', 30)
                          const content = detail?.content ? truncateText(detail.content, 60) : ''
                          
                          return `
                            <div style="margin: 6px 0; padding: 8px; background: ${bgColor}; border: 1px solid ${borderColor}; border-radius: 4px;">
                              <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 4px;">
                                <span style="font-size: 14px;">${c.isCompleted ? '✅' : '⬜'}</span>
                                <span>${icon}</span>
                                <span style="font-weight: 600; color: ${textColor}; font-size: 13px; flex: 1; word-wrap: break-word;">${title}</span>
                              </div>
                              ${content ? `<div style="color: ${textColor}; font-size: 11px; line-height: 1.3; margin-left: 20px; word-wrap: break-word;">${content}</div>` : ''}
                              ${c.completedBy ? `<div style="font-size: 10px; color: ${textColor}; margin-top: 4px; margin-left: 20px;">👤 ${escape(c.completedBy)}</div>` : ''}
                            </div>
                          `
                        }).join('')}
                      </div>
                    ` : ''}
                  </div>
                </div>
              </div>
              ${(item.children || []).map((child: any) => renderItem(child, depth + 1)).join('')}
            `
          }
          
          if (!itemsTree || itemsTree.length === 0) return ''
          
          return `
            <div style="margin: 20px 0;">
              <h2 style="font-size: 16px; font-weight: 700; color: #1f2937; margin: 0 0 12px; padding-bottom: 6px; border-bottom: 2px solid #e5e7eb;">
                📋 체크리스트 항목
              </h2>
              ${itemsTree.map((item: any) => renderItem(item)).join('')}
            </div>
          `
        }
        
        const renderInventorySection = (itemsTree: any[], connDetails: Map<string, any>): string => {
          const collectInventoryItems = (items: any[]): any[] => {
            let inventories: any[] = []
            for (const item of items) {
              const inventoryConns = (item.connections || []).filter((c: any) => c.itemType === 'inventory')
              for (const conn of inventoryConns) {
                const detail = connDetails.get(`inventory_${conn.itemId}`)
                if (detail) {
                  inventories.push({
                    ...conn,
                    detail,
                    parentItem: item.content
                  })
                }
              }
              if (item.children) {
                inventories = inventories.concat(collectInventoryItems(item.children))
              }
            }
            return inventories
          }
          
          const inventoryItems = collectInventoryItems(itemsTree)
          if (inventoryItems.length === 0) return ''
          
          return `
            <div style="margin: 20px 0;">
              <h2 style="font-size: 16px; font-weight: 700; color: #1f2937; margin: 0 0 12px; padding-bottom: 6px; border-bottom: 2px solid #e5e7eb;">
                📦 재고 현황
              </h2>
              <div style="background: #f0f9ff; border: 1px solid #0ea5e9; border-radius: 8px; padding: 16px;">
                ${inventoryItems.map(inv => {
                  const isLow = (inv.detail.currentStock || 0) <= (inv.detail.minStock || 0)
                  const stockBadgeColor = isLow ? '#fee2e2' : '#dcfce7'
                  const stockTextColor = isLow ? '#dc2626' : '#166534'
                  return `
                    <div style="margin: 8px 0; padding: 12px; background: white; border: 1px solid #e5e7eb; border-radius: 6px;">
                      <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
                        <span style="font-size: 16px;">${inv.isCompleted ? '✅' : '⬜'}</span>
                        <span style="font-weight: 600; color: #1f2937; flex: 1; word-wrap: break-word;">${escape(inv.detail.name)}</span>
                        <div style="background: ${stockBadgeColor}; color: ${stockTextColor}; padding: 4px 8px; border-radius: 12px; font-size: 11px; font-weight: 600; white-space: nowrap;">
                          ${isLow ? '⚠️ 부족' : '✅ 충분'}
                        </div>
                      </div>
                      <div style="font-size: 12px; color: #6b7280; margin-left: 24px;">
                        연결: ${escape(inv.parentItem)} • 현재 ${Math.round(inv.detail.currentStock || 0)} ${escape(inv.detail.unit || '')}
                      </div>
                      ${inv.completedBy ? `
                        <div style="font-size: 11px; color: #9ca3af; margin-left: 24px; margin-top: 4px;">
                          👤 ${escape(inv.completedBy)} ${inv.completedAt ? '• ' + new Date(inv.completedAt).toLocaleString('ko-KR') : ''}
                        </div>
                      ` : ''}
                    </div>
                  `
                }).join('')}
              </div>
            </div>
          `
        }

        // 연결항목 상세 정보 수집 (주의사항/매뉴얼/재고)
        const allConnIds = flatConns.map(c => c.id)
        const connDetails = new Map<string, any>()
        
        // 주의사항/매뉴얼/재고 정보 일괄 조회
        const precautionIds = flatConns.filter(c => c.itemType === 'precaution').map(c => c.itemId)
        const manualIds = flatConns.filter(c => c.itemType === 'manual').map(c => c.itemId)
        const inventoryIds = flatConns.filter(c => c.itemType === 'inventory').map(c => c.itemId)
        
        if (precautionIds.length > 0) {
          const precautions = await prisma.precaution.findMany({
            where: { id: { in: precautionIds } },
            select: { id: true, title: true, content: true }
          })
          precautions.forEach(p => connDetails.set(`precaution_${p.id}`, p))
        }
        
        if (manualIds.length > 0) {
          const manuals = await prisma.manual.findMany({
            where: { id: { in: manualIds } },
            select: { id: true, title: true, content: true }
          })
          manuals.forEach(m => connDetails.set(`manual_${m.id}`, m))
        }
        
        if (inventoryIds.length > 0) {
          const inventories = await prisma.inventoryItem.findMany({
            where: { id: { in: inventoryIds } },
            select: { id: true, name: true, currentStock: true, minStock: true, unit: true }
          })
          inventories.forEach(i => connDetails.set(`inventory_${i.id}`, i))
        }

        const subject = `${employee.name}님의 ${template?.name || '체크리스트'} 제출 완료 (${template?.workplace || '-'} • ${template?.timeSlot || '-'})`
        const html = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
              * { box-sizing: border-box; }
              body { 
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; 
                line-height: 1.6; color: #1f2937; margin: 0; padding: 20px; 
                background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%); 
              }
              .container { 
                max-width: 720px; margin: 0 auto; background: #ffffff; 
                border-radius: 16px; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04); 
                overflow: hidden; 
              }
              .header { 
                background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); 
                color: white; padding: 32px 24px; text-align: center; 
              }
              .header h1 { margin: 0 0 8px; font-size: 28px; font-weight: 700; }
              .header p { margin: 0; opacity: 0.9; font-size: 16px; }
              .content { padding: 32px 24px; }
              .info-grid { 
                display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); 
                gap: 16px; margin-bottom: 24px; 
              }
              .info-card { 
                background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; 
                padding: 16px; border-left: 4px solid #3b82f6; 
              }
              .info-card h4 { 
                margin: 0 0 8px; color: #64748b; font-size: 12px; 
                font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; 
              }
              .info-card p { margin: 0; font-size: 16px; font-weight: 600; color: #1e293b; }
              .progress-section { 
                background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%); 
                border: 1px solid #a7f3d0; border-radius: 12px; 
                padding: 20px; margin-bottom: 24px; 
              }
              .progress-bar { 
                width: 100%; height: 12px; background: #e5e7eb; 
                border-radius: 6px; overflow: hidden; margin: 12px 0; 
              }
              .progress-fill { 
                height: 100%; background: linear-gradient(90deg, #10b981, #059669); 
                border-radius: 6px; transition: width 0.3s ease; 
              }
              .section { margin: 24px 0; }
              .section-title { 
                font-size: 18px; font-weight: 700; color: #1e293b; 
                margin: 0 0 16px; padding-bottom: 8px; 
                border-bottom: 2px solid #e2e8f0; 
              }
              .checklist-item { 
                background: #ffffff; border: 1px solid #e2e8f0; 
                border-radius: 8px; margin-bottom: 12px; padding: 16px; 
                box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1); 
              }
              .item-header { display: flex; align-items: flex-start; gap: 12px; }
              .status-icon { 
                font-size: 18px; margin-top: 2px; 
                filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.1)); 
              }
              .item-content { flex: 1; }
              .item-title { font-weight: 600; color: #1e293b; margin: 0 0 4px; }
              .item-meta { 
                font-size: 12px; color: #64748b; 
                display: flex; align-items: center; gap: 12px; flex-wrap: wrap; 
              }
              .connected-items { margin-top: 12px; }
              .connected-item { 
                display: flex; align-items: center; gap: 8px; 
                padding: 8px 12px; margin: 4px 0; 
                border-radius: 6px; font-size: 13px; 
              }
              .conn-precaution { background: #fef3c7; border: 1px solid #f59e0b; color: #92400e; }
              .conn-manual { background: #e0e7ff; border: 1px solid #6366f1; color: #3730a3; }
              .conn-inventory { background: #ecfdf5; border: 1px solid #10b981; color: #065f46; }
              .inventory-section { 
                background: #f0f9ff; border: 1px solid #0ea5e9; 
                border-radius: 12px; padding: 20px; margin: 24px 0; 
              }
              .inventory-item { 
                display: flex; justify-content: space-between; align-items: center; 
                padding: 12px; margin: 8px 0; background: white; 
                border-radius: 8px; border: 1px solid #e2e8f0; 
              }
              .stock-status { 
                padding: 4px 8px; border-radius: 12px; font-size: 12px; font-weight: 600; 
              }
              .stock-ok { background: #dcfce7; color: #166534; }
              .stock-low { background: #fee2e2; color: #dc2626; }
              .notes-section { 
                background: #fffbeb; border: 1px solid #f59e0b; 
                border-radius: 12px; padding: 20px; margin: 24px 0; 
              }
              .footer { 
                background: #f8fafc; padding: 20px 24px; text-align: center; 
                color: #64748b; font-size: 14px; border-top: 1px solid #e2e8f0; 
              }
              @media (max-width: 640px) {
                body { padding: 12px; }
                .content { padding: 20px 16px; }
                .info-grid { grid-template-columns: 1fr; }
              }
            </style>
          </head>
          <body>
            <div class="container">
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #3b82f6; margin: 0;">
                <tr>
                  <td style="padding: 24px; text-align: center;">
                    <h1 style="margin: 0; font-size: 24px; font-weight: bold; color: #ffffff; font-family: Arial, sans-serif;">
                      🏪 ${escape(tenant?.name || 'TaskPantry')}
                    </h1>
                    <p style="margin: 8px 0 0; font-size: 14px; color: #e0e7ff; font-family: Arial, sans-serif;">
                      체크리스트 관리 시스템
                    </p>
                  </td>
                </tr>
              </table>
              
              <div class="content">
                <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
                  <div style="font-size: 18px; font-weight: 700; color: #1e293b; margin-bottom: 8px;">
                    ✅ ${escape(employee.name)}님 체크리스트 제출 완료
                  </div>
                  <div style="font-size: 14px; color: #64748b; line-height: 1.4;">
                    ${escape(template?.name || '-')} • ${escape(template?.workplace || '-')} • ${escape(template?.timeSlot || '-')}<br>
                    ${new Date(updated.submittedAt!).toLocaleString('ko-KR')} • 진행률 ${progressPercent}% (${completedItems}/${totalItems}개 완료)
                  </div>
                </div>

                ${renderChecklistSection(itemsTree, connDetails)}
                ${renderInventorySection(itemsTree, connDetails)}
                ${notes ? `
                <div class="notes-section">
                  <h4 style="margin: 0 0 12px; color: #92400e; display: flex; align-items: center; gap: 8px;">
                    📝 제출 메모
                  </h4>
                  <div style="white-space: pre-wrap; color: #78350f;">${escape(String(notes))}</div>
                </div>
                ` : ''}
              </div>

              <div class="footer">
                <p>이 메일은 TaskPantry 체크리스트 시스템에서 자동으로 발송되었습니다.</p>
                <p style="margin: 8px 0 0;">문의사항이 있으시면 관리자에게 연락해 주세요.</p>
              </div>
            </div>
          </body>
          </html>
        `
        const result = await sendEmailDetailed({ to: recipients, subject, html })
        emailSent = result.sent
        if (!emailSent) {
          mailError = result.error || undefined
        }
        // eslint-disable-next-line no-console
        console.warn('MAIL_SUBMIT_RESULT', { emailSent, mailError, recipientsCount: recipients.length, tenantName })
      }
      else {
        // eslint-disable-next-line no-console
        console.warn('MAIL_SUBMIT_SKIP_NO_RECIPIENTS', { recipientsCount: 0, tenantName })
      }
    } catch {}

    const mailer = getMailerStatus()
    return NextResponse.json({ success: true, emailSent, emailRecipientCount, hasApiKey: mailer.hasApiKey, tenantName, mailError })
  } catch (e: any) {
    const msg = typeof e?.message === 'string' ? e.message : '제출 실패'
    const status = msg.includes('로그인이 필요') ? 401 : 500
    return NextResponse.json({ error: msg }, { status })
  }
}


