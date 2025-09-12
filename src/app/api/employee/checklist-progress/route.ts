import { NextRequest, NextResponse } from 'next/server'
import { createHash } from 'crypto'
import prisma from '@/lib/prisma'
import { parseAuthCookie } from '@/lib/auth'

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

// GET: 특정 인스턴스의 진행상황 조회
export async function GET(request: NextRequest) {
  try {
    const employee = await getCurrentEmployee(request)
    const { searchParams } = new URL(request.url)
    const instanceId = searchParams.get('instanceId') || ''
    if (!instanceId) {
      return NextResponse.json({ error: 'instanceId가 필요합니다.' }, { status: 400 })
    }

    const useV2 = (searchParams.get('v2') === '1')
    const instance = await prisma.checklistInstance.findUnique({
      where: { id: instanceId },
      include: useV2
        ? {
            template: { select: { id: true, name: true, workplace: true, timeSlot: true, category: true } },
            checklistItemProgresses: {
              select: {
                id: true,
                itemId: true,
                isCompleted: true,
                notes: true,
                completedBy: true,
                completedAt: true,
                item: { select: { id: true, content: true, instructions: true, order: true, parentId: true } }
              },
              orderBy: { item: { order: 'asc' } }
            },
            connectedItemsProgress: { select: { id: true, itemId: true, isCompleted: true, notes: true, connectionId: true, completedBy: true, completedAt: true } }
          }
        : {
            template: {
              select: {
                id: true, name: true, workplace: true, timeSlot: true, category: true,
                items: {
                  include: {
                    connectedItems: true,
                    children: {
                      include: {
                        connectedItems: true,
                        children: {
                          include: { connectedItems: true }
                        }
                      }
                    }
                  },
                  orderBy: { order: 'asc' }
                }
              }
            },
            checklistItemProgresses: {
              select: {
                id: true,
                itemId: true,
                isCompleted: true,
                notes: true,
                completedBy: true,
                completedAt: true,
                item: { select: { id: true, content: true, instructions: true, order: true, parentId: true } }
              },
              orderBy: { item: { order: 'asc' } }
            },
            connectedItemsProgress: { select: { id: true, itemId: true, isCompleted: true, notes: true, connectionId: true, completedBy: true, completedAt: true } }
          }
    })

    if (!instance || instance.tenantId !== employee.tenantId) {
      return NextResponse.json({ error: '체크리스트를 찾을 수 없습니다.' }, { status: 404 })
    }

    // 완료자 표기: 과거 레코드에 ID가 저장된 경우 이름으로 치환
    const completedBySet = new Set<string>()
    for (const p of instance.checklistItemProgresses as any[]) {
      if (p.completedBy) completedBySet.add(p.completedBy as string)
    }
    for (const cp of instance.connectedItemsProgress as any[]) {
      if (cp.completedBy) completedBySet.add(cp.completedBy as string)
    }
    let idToName: Record<string, string> = {}
    if (completedBySet.size > 0) {
      const candidates = Array.from(completedBySet)
      const employees = await prisma.employee.findMany({
        where: { tenantId: employee.tenantId, id: { in: candidates } },
        select: { id: true, name: true }
      })
      idToName = Object.fromEntries(employees.map((e) => [e.id, e.name]))
    }

    // V2: O(N) 트리 구성 경로
    if (useV2) {
      const hasProgress = instance.checklistItemProgresses.length > 0
      // 평면 아이템 조회
      const flatItems = await prisma.checklistItem.findMany({
        where: { templateId: instance.templateId, isActive: true },
        select: { id: true, content: true, instructions: true, parentId: true, order: true }
      })
      const itemIds = flatItems.map(i => i.id)
      // 연결항목 일괄 조회
      const flatConns = await prisma.checklistItemConnection.findMany({
        where: { checklistItemId: { in: itemIds } },
        select: { id: true, checklistItemId: true, itemType: true, itemId: true, order: true }
      })

      // 진행률 누적 변수
      let totalMain = 0
      let completedMain = 0
      let totalConnected = 0
      let completedConnected = 0

      // 맵 구성
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

      // 프로그레스 맵
      const progressMap = new Map<string, { isCompleted: boolean; notes: string | null; completedBy: string | null; completedAt: Date | null }>()
      for (const p of instance.checklistItemProgresses as any[]) {
        const name = (p.completedBy && idToName[p.completedBy]) ? idToName[p.completedBy] : (p.completedBy || null)
        progressMap.set(p.itemId, { isCompleted: p.isCompleted, notes: p.notes || null, completedBy: name, completedAt: p.completedAt || null })
      }
      const connectedProg = new Map<string, { isCompleted: boolean; notes: string | null; completedBy: string | null; completedAt: Date | null }>()
      for (const cp of instance.connectedItemsProgress as any[]) {
        if (cp.connectionId) {
          const name = (cp.completedBy && idToName[cp.completedBy]) ? idToName[cp.completedBy] : (cp.completedBy || null)
          connectedProg.set(cp.connectionId, { isCompleted: cp.isCompleted, notes: cp.notes || null, completedBy: name, completedAt: cp.completedAt || null })
        }
      }

      const buildNode = (it: any): any => {
        const prog = progressMap.get(it.id)
        const rawConns = connsByItem.get(it.id) || []
        const connections = rawConns.map((c: any) => ({
          connectionId: c.id,
          itemType: c.itemType,
          itemId: c.itemId,
          isCompleted: connectedProg.get(c.id)?.isCompleted || false,
          notes: connectedProg.get(c.id)?.notes || null,
          completedBy: connectedProg.get(c.id)?.completedBy || null,
          completedAt: connectedProg.get(c.id)?.completedAt || null,
        }))
        const rawChildren = childrenByParent.get(it.id) || []
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

        // 누적: 연결항목은 모두 집계
        totalConnected += connections.length
        completedConnected += connections.filter((c:any)=>c.isCompleted).length
        // 메인은 리프만 집계
        const isLeafMain = (children.length === 0) && (connections.length === 0)
        if (isLeafMain) {
          totalMain += 1
          if (isCompleted) completedMain += 1
        }

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

      const response = {
        instance: {
          id: instance.id,
          templateId: instance.templateId,
          templateName: (instance.template as any).name,
          date: instance.date,
          workplace: instance.workplace,
          timeSlot: instance.timeSlot,
          isSubmitted: instance.isSubmitted,
          isCompleted: instance.isCompleted,
        },
        progress: {
          totalMain,
          completedMain,
          totalConnected,
          completedConnected,
          percentage: (totalMain + totalConnected) > 0 ? Math.round(((completedMain + completedConnected) / (totalMain + totalConnected)) * 100) : 0
        },
        items: (hasProgress
          ? instance.checklistItemProgresses.map(p => ({
              id: (p as any).item?.id || p.itemId,
              content: (p as any).item?.content || '',
              instructions: (p as any).item?.instructions || undefined,
              isCompleted: p.isCompleted,
              notes: p.notes || null,
              completedBy: (p.completedBy && idToName[p.completedBy]) ? idToName[p.completedBy] : (p.completedBy || null),
              completedAt: p.completedAt || null,
              parentId: ((p as any).item as any)?.parentId || null,
              hasChildren: (childrenByParent.get(((p as any).item as any)?.id || '') || []).length > 0,
            }))
          : flatItems
              .map(i => ({
                id: i.id,
                content: i.content,
                instructions: i.instructions || undefined,
                isCompleted: false,
                notes: null,
                completedBy: null,
                completedAt: null,
                parentId: i.parentId || null,
                hasChildren: (childrenByParent.get(i.id) || []).length > 0,
              }))
        ),
        itemsTree,
        connectedItems: instance.connectedItemsProgress
      }

      return NextResponse.json(response)
    }

    // V1: 기존 경로(중첩 include 기반)
    const templateItems = (instance.template as any).items as Array<any>
    const hasProgress = instance.checklistItemProgresses.length > 0

    // 진행률 누적 변수 (트리 계산 중 갱신)
    // 규칙: 메인 항목은 "리프 노드(자식/연결항목이 없는 항목)"만 집계한다.
    // 부모 항목은 자식/연결항목의 완료로 파생 완료되더라도 메인 합계에는 포함하지 않는다.
    let totalMain = 0
    let completedMain = 0
    let totalConnected = 0
    let completedConnected = 0

    const response = {
      instance: {
        id: instance.id,
        templateId: instance.templateId,
        templateName: (instance.template as any).name,
        date: instance.date,
        workplace: instance.workplace,
        timeSlot: instance.timeSlot,
        isSubmitted: instance.isSubmitted,
        isCompleted: instance.isCompleted,
      },
      progress: { totalMain: 0, completedMain: 0, totalConnected: 0, completedConnected: 0, percentage: 0 },
      items: (hasProgress
        ? instance.checklistItemProgresses.map(p => ({
            id: (p as any).item?.id || p.itemId,
            content: (p as any).item?.content || '',
            instructions: (p as any).item?.instructions || undefined,
            isCompleted: p.isCompleted,
            notes: p.notes || null,
            completedBy: (p.completedBy && idToName[p.completedBy]) ? idToName[p.completedBy] : (p.completedBy || null),
            completedAt: p.completedAt || null,
            parentId: ((p as any).item as any)?.parentId || null,
            hasChildren: false,
          }))
        : templateItems
            .filter(i => (i as any).isActive !== false)
            .map(i => ({
              id: (i as any).id,
              content: (i as any).content,
              instructions: (i as any).instructions,
              isCompleted: false,
              notes: null,
              completedBy: null,
              completedAt: null,
              parentId: (i as any).parentId || null,
              hasChildren: Array.isArray((i as any).children) && (i as any).children.length > 0,
            }))
      ),
      itemsTree: [] as any[]
    }

    // 트리 생성(누적 집계 포함)
    const progressMap = new Map<string, { isCompleted: boolean; notes: string | null; completedBy: string | null; completedAt: Date | null }>()
    for (const p of instance.checklistItemProgresses as any[]) {
      const name = (p.completedBy && idToName[p.completedBy]) ? idToName[p.completedBy] : (p.completedBy || null)
      progressMap.set(p.itemId, { isCompleted: p.isCompleted, notes: p.notes || null, completedBy: name, completedAt: p.completedAt || null })
    }
    const connectedProg = new Map<string, { isCompleted: boolean; notes: string | null; completedBy: string | null; completedAt: Date | null }>()
    for (const cp of instance.connectedItemsProgress as any[]) {
      if (cp.connectionId) {
        const name = (cp.completedBy && idToName[cp.completedBy]) ? idToName[cp.completedBy] : (cp.completedBy || null)
        connectedProg.set(cp.connectionId, { isCompleted: cp.isCompleted, notes: cp.notes || null, completedBy: name, completedAt: cp.completedAt || null })
      }
    }

    const buildNode = (it: any): any => {
      const prog = progressMap.get(it.id)
      const connections = Array.isArray(it.connectedItems) ? it.connectedItems.map((c: any) => ({
        connectionId: c.id,
        itemType: c.itemType,
        itemId: c.itemId,
        isCompleted: connectedProg.get(c.id)?.isCompleted || false,
        notes: connectedProg.get(c.id)?.notes || null,
        completedBy: connectedProg.get(c.id)?.completedBy || null,
        completedAt: connectedProg.get(c.id)?.completedAt || null,
      })) : []

      const children = Array.isArray(it.children) && it.children.length > 0
        ? it.children.map((ch: any) => buildNode(ch))
        : []

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

      // 진행률 누적
      totalConnected += connections.length
      completedConnected += connections.filter((c:any)=>c.isCompleted).length
      // 메인 항목은 리프 노드만 카운트 (자식/연결항목이 없는 경우)
      const isLeafMain = (children.length === 0) && (connections.length === 0)
      if (isLeafMain) {
        totalMain += 1
        if (isCompleted) completedMain += 1
      }

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

    const roots = templateItems.filter((i: any) => !i.parentId)
    response.itemsTree = roots.map((r: any) => buildNode(r))

    // 최종 진행률 계산
    const t = totalMain + totalConnected
    const c = completedMain + completedConnected
    response.progress = {
      totalMain,
      completedMain,
      totalConnected,
      completedConnected,
      percentage: t > 0 ? Math.round((c / t) * 100) : 0
    }

    // ETag/마이크로캐시
    try {
      const bodyString = JSON.stringify(response)
      const etag = 'W/"' + createHash('sha1').update(bodyString).digest('base64') + '"'
      const inm = request.headers.get('if-none-match')
      if (inm && inm === etag) {
        const res304 = new NextResponse(null, { status: 304 })
        res304.headers.set('ETag', etag)
        res304.headers.set('Cache-Control', 'public, s-maxage=15, stale-while-revalidate=30, max-age=0')
        return res304
      }
      const res = NextResponse.json(response)
      res.headers.set('ETag', etag)
      res.headers.set('Cache-Control', 'public, s-maxage=15, stale-while-revalidate=30, max-age=0')
      return res
    } catch {
      return NextResponse.json(response)
    }
  } catch (e: any) {
    const msg = typeof e?.message === 'string' ? e.message : '조회 실패'
    const status = msg.includes('로그인이 필요') ? 401 : 500
    return NextResponse.json({ error: msg }, { status })
  }
}

// PUT: 항목 진행상황 업데이트
export async function PUT(request: NextRequest) {
  try {
    const employee = await getCurrentEmployee(request)
    const body = await request.json()
    const { instanceId, itemId, connectionId, isCompleted, notes } = body || {}

    if (!instanceId || typeof isCompleted !== 'boolean') {
      return NextResponse.json({ error: 'instanceId, isCompleted가 필요합니다.' }, { status: 400 })
    }

    const instance = await prisma.checklistInstance.findUnique({ where: { id: instanceId } })
    if (!instance || instance.tenantId !== employee.tenantId) {
      return NextResponse.json({ error: '체크리스트를 찾을 수 없습니다.' }, { status: 404 })
    }

    // 1) 연결항목 토글 처리
    if (connectionId) {
      // 연결 정의 조회(아이템 ID 확보)
      const conn = await prisma.checklistItemConnection.findUnique({ where: { id: connectionId } })
      if (!conn) {
        return NextResponse.json({ error: '연결항목을 찾을 수 없습니다.' }, { status: 404 })
      }
      const existing = await prisma.connectedItemProgress.findFirst({ where: { instanceId, connectionId } })
      let cp
      if (existing) {
        cp = await prisma.connectedItemProgress.update({
          where: { id: existing.id },
          data: {
            isCompleted,
            notes: notes ?? undefined,
            completedBy: isCompleted ? employee.name : null,
            completedAt: isCompleted ? new Date() : null,
          }
        })
      } else {
        cp = await prisma.connectedItemProgress.create({
          data: {
            instanceId,
            itemId: conn.itemId,
            connectionId,
            isCompleted,
            notes: notes ?? undefined,
            completedBy: isCompleted ? employee.name : null,
            completedAt: isCompleted ? new Date() : null,
          }
        })
      }

      // 부모 항목 자동 완료/해제: 해당 connection의 checklistItemId 기준
      const siblings = await prisma.checklistItemConnection.findMany({ where: { checklistItemId: conn.checklistItemId } })
      const siblingProgress = await prisma.connectedItemProgress.findMany({
        where: { instanceId, connectionId: { in: siblings.map(s => s.id) } },
        select: { isCompleted: true }
      })
      const allConnectedDone = siblings.length > 0 && siblingProgress.length === siblings.length && siblingProgress.every(s => s.isCompleted)
      // 부모 항목 진행도 동기화(있으면 갱신, 없으면 생성)
      await prisma.checklistItemProgress.upsert({
        where: { instanceId_itemId: { instanceId, itemId: conn.checklistItemId } },
        update: {
          isCompleted: allConnectedDone,
          notes: undefined,
          completedBy: allConnectedDone ? employee.name : null,
          completedAt: allConnectedDone ? new Date() : null,
        },
        create: {
          instanceId,
          itemId: conn.checklistItemId,
          isCompleted: allConnectedDone,
          notes: undefined,
          completedBy: allConnectedDone ? employee.name : null,
          completedAt: allConnectedDone ? new Date() : null,
        }
      })

      return NextResponse.json({ success: true, connectionProgressId: cp.id })
    }

    // 2) 메인 항목 진행상황 업데이트(없으면 생성)
    if (!itemId) {
      return NextResponse.json({ error: 'itemId 또는 connectionId 중 하나가 필요합니다.' }, { status: 400 })
    }

    const progress = await prisma.checklistItemProgress.upsert({
      where: { instanceId_itemId: { instanceId, itemId } },
      update: {
        isCompleted,
        notes: notes ?? undefined,
        completedBy: isCompleted ? employee.name : null,
        completedAt: isCompleted ? new Date() : null,
      },
      create: {
        instanceId,
        itemId,
        isCompleted,
        notes: notes ?? undefined,
        completedBy: isCompleted ? employee.name : null,
        completedAt: isCompleted ? new Date() : null,
      }
    })

    // 부모 체인 자동 완료/해제 (자식 항목 기준)
    try {
      let current = await prisma.checklistItem.findUnique({ where: { id: itemId }, select: { id: true, parentId: true } })
      while (current?.parentId) {
        const parentId = current.parentId
        const children = await prisma.checklistItem.findMany({ where: { parentId }, select: { id: true } })
        const childIds = children.map(c => c.id)
        const completedChildren = await prisma.checklistItemProgress.count({ where: { instanceId, itemId: { in: childIds }, isCompleted: true } })
        const allChildrenDone = childIds.length > 0 && completedChildren === childIds.length
        await prisma.checklistItemProgress.upsert({
          where: { instanceId_itemId: { instanceId, itemId: parentId } },
          update: {
            isCompleted: allChildrenDone,
            completedBy: allChildrenDone ? employee.name : null,
            completedAt: allChildrenDone ? new Date() : null
          },
          create: {
            instanceId,
            itemId: parentId,
            isCompleted: allChildrenDone,
            completedBy: allChildrenDone ? employee.name : null,
            completedAt: allChildrenDone ? new Date() : null
          }
        })
        current = await prisma.checklistItem.findUnique({ where: { id: parentId }, select: { id: true, parentId: true } })
      }
    } catch {}

    // 인스턴스 완료 상태 갱신 (모든 메인 항목이 완료된 경우)
    const counts = await prisma.checklistItemProgress.groupBy({
      by: ['isCompleted'],
      where: { instanceId },
      _count: { _all: true }
    })
    const total = counts.reduce((s, r) => s + r._count._all, 0)
    const done = counts.find(r => r.isCompleted)?.
      _count._all || 0
    const allDone = total > 0 && total === done

    if (allDone && !instance.isCompleted) {
      await prisma.checklistInstance.update({
        where: { id: instanceId },
        data: { isCompleted: true, completedAt: new Date(), completedBy: employee.name }
      })
    } else if (!allDone && instance.isCompleted) {
      await prisma.checklistInstance.update({
        where: { id: instanceId },
        data: { isCompleted: false, completedAt: null, completedBy: null }
      })
    }

    return NextResponse.json({ success: true, progressId: progress.id })
  } catch (e: any) {
    const msg = typeof e?.message === 'string' ? e.message : '업데이트 실패'
    const status = msg.includes('로그인이 필요') ? 401 : 500
    return NextResponse.json({ error: msg }, { status })
  }
}


