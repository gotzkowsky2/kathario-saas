"use client";
import { useEffect, useMemo, useState } from "react";
import useSWR from 'swr'
import { useParams, useRouter } from "next/navigation";

interface InstanceInfo {
  id: string;
  templateId: string;
  templateName: string;
  date: string;
  workplace: string;
  timeSlot: string;
  isSubmitted: boolean;
  isCompleted: boolean;
}

interface ProgressInfo {
  totalMain: number;
  completedMain: number;
  totalConnected: number;
  completedConnected: number;
  percentage: number;
}

interface ItemInfo {
  id: string;
  content: string;
  instructions?: string;
  isCompleted: boolean;
  notes: string | null;
  parentId?: string | null;
  hasChildren?: boolean;
}

export default function EmployeeChecklistRunPage() {
  const params = useParams();
  const router = useRouter();
  const instanceId = String(params?.id || "");

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [instance, setInstance] = useState<InstanceInfo | null>(null);
  const [progress, setProgress] = useState<ProgressInfo | null>(null);
  const [items, setItems] = useState<ItemInfo[]>([]);
  const [itemsTree, setItemsTree] = useState<any[]>([]);
  const [connectedDetails, setConnectedDetails] = useState<{[key:string]: any}>({});
  const [detailModal, setDetailModal] = useState<{open: boolean; data: any | null}>({ open: false, data: null });

  const allDone = useMemo(() => items.length > 0 && items.every(i => i.isCompleted), [items]);

  // 트리 상태 부분 업데이트 헬퍼
  const updateItemsTreeItem = (itemId: string, next: boolean) => {
    setItemsTree(prev => {
      const walk = (nodes: any[]): any[] => nodes.map((n:any)=>{
        if (n.id === itemId) return { ...n, isCompleted: next }
        if (Array.isArray(n.children) && n.children.length>0) {
          return { ...n, children: walk(n.children) }
        }
        return n
      })
      const r = Array.isArray(prev) ? walk(prev) : prev
      return recalcParents(r)
    })
  }

  const updateItemsTreeConnection = (connectionId: string, next: boolean) => {
    setItemsTree(prev => {
      const walk = (nodes: any[]): any[] => nodes.map((n:any)=>{
        let changed = false
        let conns = n.connections
        if (Array.isArray(conns)) {
          conns = conns.map((c:any)=>{
            if (c.connectionId === connectionId) { changed = true; return { ...c, isCompleted: next } }
            return c
          })
        }
        const children = Array.isArray(n.children) ? walk(n.children) : n.children
        return changed ? { ...n, connections: conns, children } : { ...n, children }
      })
      const r = Array.isArray(prev) ? walk(prev) : prev
      return recalcParents(r)
    })
  }

  // 상위 자동 체크를 위한 로컬 트리 재계산
  function recalcParents(tree: any[]): any[] {
    const clone = JSON.parse(JSON.stringify(tree))
    const mark = (node:any):boolean => {
      let self = !!node.isCompleted
      const children = Array.isArray(node.children) ? node.children : []
      const connections = Array.isArray(node.connections) ? node.connections : []
      const childrenDone = children.length>0 ? children.map(mark).every(Boolean) : true
      const connectionsDone = connections.length>0 ? connections.every((c:any)=>!!c.isCompleted) : true
      const auto = (children.length>0 || connections.length>0) ? (childrenDone && connectionsDone) : self
      node.isCompleted = auto
      return !!node.isCompleted
    }
    clone.forEach((n:any)=>mark(n))
    return clone
  }

  const updateProgressConnected = (delta: number) => {
    setProgress(prev => {
      if (!prev) return prev
      const completedConnected = Math.max(0, prev.completedConnected + delta)
      const t = prev.totalMain + prev.totalConnected
      const d = prev.completedMain + completedConnected
      return { ...prev, completedConnected, percentage: t>0 ? Math.round((d/t)*100) : 0 } as any
    })
  }

  const fetcher = (url: string) => fetch(url, { credentials: 'include' }).then(r=>{
    if (!r.ok) return r.json().then((e:any)=>{ throw new Error(e?.error||'로드 실패') })
    return r.json()
  })

  const { data, error: swrError, isLoading, mutate } = useSWR(
    instanceId ? `/api/employee/checklist-progress?instanceId=${instanceId}` : null,
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 15000 }
  )

  const load = async () => {
    await mutate()
  }

  useEffect(() => {
    if (!instanceId) return;
    // SWR가 자동 로드함. 별도 호출 없음
  }, [instanceId]);

  // 연결항목 상세 사전 로드
  useEffect(() => {
    const fetchAll = async () => {
      const tasks: Array<Promise<void>> = [];
      const push = (type: string, id: string) => {
        const key = `${type}_${id}`;
        if (connectedDetails[key]) return;
        tasks.push((async () => {
          try {
            const res = await fetch(`/api/employee/connected-items?type=${type}&id=${id}`, { credentials: 'include', cache: 'no-store' });
            if (!res.ok) return;
            const data = await res.json();
            setConnectedDetails(prev => ({ ...prev, [key]: data }));
          } catch {}
        })());
      };
      const walk = (nodes: any[]) => {
        nodes.forEach(n => {
          (n.connections||[]).forEach((c:any) => push(c.itemType, c.itemId));
          if (Array.isArray(n.children)) walk(n.children);
        })
      }
      walk(itemsTree);
      if (tasks.length) await Promise.all(tasks);
    };
    if (itemsTree && itemsTree.length) fetchAll();
  }, [itemsTree]);

  const toggleItem = async (itemId: string, next: boolean) => {
    // 1) 로컬 즉시 반영(깜빡임 방지)
    setItems(prev => prev.map(i => i.id === itemId ? { ...i, isCompleted: next } : i));
    updateItemsTreeItem(itemId, next)
    setProgress(prev => {
      if (!prev) return prev;
      const completedMain = next
        ? (prev.completedMain + 1)
        : Math.max(0, prev.completedMain - 1);
      const t = prev.totalMain + prev.totalConnected;
      const d = completedMain + prev.completedConnected;
      return { ...prev, completedMain, percentage: t>0 ? Math.round((d/t)*100) : 0 } as any;
    });
    // 2) 서버 저장(실패 시 롤백)
    try {
      const res = await fetch('/api/employee/checklist-progress', {
        method: 'PUT', credentials: 'include', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ instanceId, itemId, isCompleted: next })
      });
      if (!res.ok) {
        setItems(prev => prev.map(i => i.id === itemId ? { ...i, isCompleted: !next } : i));
        setProgress(prev => {
          if (!prev) return prev;
          const completedMain = !next
            ? (prev.completedMain + 1)
            : Math.max(0, prev.completedMain - 1);
          const t = prev.totalMain + prev.totalConnected;
          const d = completedMain + prev.completedConnected;
          return { ...prev, completedMain, percentage: t>0 ? Math.round((d/t)*100) : 0 } as any;
        });
        const e = await res.json().catch(()=>({}));
        console.error('저장 실패', e);
      }
    } catch (e) {
      console.error('네트워크 오류', e);
    }
  };

  const submitChecklist = async () => {
    if (!allDone) {
      alert('모든 항목을 완료해야 제출할 수 있습니다.');
      return;
    }
    try {
      setSubmitting(true);
      const res = await fetch('/api/employee/submit-checklist', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ instanceId })
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.error || '제출 실패');
      }
      alert('제출 완료되었습니다.');
      router.push('/employee/checklist');
    } catch (e: any) {
      alert(e.message || '제출 실패');
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(()=>{
    if (data) {
      setInstance(data.instance)
      setProgress(data.progress)
      setItems(data.items||[])
      setItemsTree(data.itemsTree||[])
    }
    if (swrError) setError(String(swrError?.message||'로드 실패'))
    setLoading(isLoading)
  }, [data, swrError, isLoading])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-3xl mx-auto">
          <div className="animate-pulse space-y-4">
            <div className="h-10 bg-gray-200 rounded"/>
            {[...Array(6)].map((_,i) => (
              <div key={i} className="h-16 bg-gray-200 rounded" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error || !instance) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-3xl mx-auto text-center">
          <div className="text-red-500 text-lg font-semibold mb-2">⚠️ 오류</div>
          <div className="text-gray-600">{error || '체크리스트를 불러오지 못했습니다.'}</div>
          <button onClick={load} className="mt-4 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">다시 시도</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50 p-2 sm:p-4 md:p-6">
      <div className="mx-auto w-full max-w-[960px] md:max-w-[1100px] lg:max-w-[1280px] px-1 sm:px-2 md:px-0">
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-5 sm:p-6 mb-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">{instance.templateName}</h1>
              <p className="text-sm text-gray-600 mt-1">오늘자 체크리스트</p>
            </div>
            <button
              onClick={() => router.push('/employee/checklist')}
              className="px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-700"
            >목록</button>
          </div>

          {/* 진행률 */}
          {progress && (
            <div className="mt-4">
              <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                <span>진행률</span>
                <span>{progress.completedMain + progress.completedConnected}/{progress.totalMain + progress.totalConnected} ({progress.percentage}%)</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-green-600 h-2 rounded-full" style={{ width: `${progress.percentage}%` }} />
              </div>
            </div>
          )}
        </div>

        {/* 항목 리스트 */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-3 sm:p-4 md:p-5 overflow-x-auto">
          <ChecklistTree 
            nodes={itemsTree}
            onToggle={toggleItem}
            details={connectedDetails}
            onOpenDetail={(data:any)=>setDetailModal({ open: true, data })}
            instanceId={instanceId}
            reload={load}
            updateConnection={updateItemsTreeConnection}
            updateProgressConnected={updateProgressConnected}
            onInventoryUpdate={async (invId: string, connectionId: string, value: number) => {
              try {
                const res = await fetch('/api/employee/inventory', {
                  method: 'PUT', credentials: 'include', headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ itemId: invId, currentStock: Number(value) })
                })
                if (res.ok) {
                  // 재고 업데이트 성공 후 연결항목 완료 처리
                  const res2 = await fetch('/api/employee/checklist-progress', {
                    method: 'PUT',
                    credentials: 'include',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ instanceId, connectionId, isCompleted: true })
                  })
                  if (!res2.ok) {
                    const e = await res2.json().catch(()=>({}))
                    console.error('연결항목 완료 처리 실패:', e)
                  }
                  await load();
                } else {
                  const e = await res.json().catch(()=>({}));
                  alert(e.error||'재고 업데이트 실패');
                }
              } catch (e) { alert('재고 업데이트 실패'); }
            }}
          />

          <div className="flex items-center justify-end gap-3 mt-5">
            <button
              onClick={submitChecklist}
              disabled={!allDone || submitting || instance.isSubmitted}
              className={`px-4 py-2 rounded-lg text-white ${(!allDone || submitting || instance.isSubmitted) ? 'bg-gray-400' : 'bg-green-600 hover:bg-green-700'} transition-colors`}
            >
              {instance.isSubmitted ? '이미 제출됨' : (submitting ? '제출 중...' : '제출하기')}
            </button>
          </div>
        </div>
      </div>

      {/* 상세 모달 */}
      {detailModal.open && detailModal.data && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/50" onClick={()=>setDetailModal({open:false, data:null})} />
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <div className="w-full max-w-[90vw] sm:max-w-2xl bg-white rounded-lg shadow-xl overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b">
                <div className="flex items-center gap-2">
                  <span className={`${detailModal.data.itemType==='precaution'?'text-red-600':'text-green-600'}`}>{detailModal.data.itemType==='precaution'?'⚠️':'📖'}</span>
                  <h2 className="font-bold text-gray-900">{detailModal.data.title}</h2>
                </div>
                <button className="text-gray-500 hover:text-gray-700" onClick={()=>setDetailModal({open:false, data:null})}>✕</button>
              </div>
              <div className="p-4 max-h-[70vh] overflow-y-auto">
                <div className="whitespace-pre-wrap leading-relaxed text-gray-800 text-sm">
                  {detailModal.data.content}
                </div>
                {Array.isArray(detailModal.data.tags) && detailModal.data.tags.length>0 && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {detailModal.data.tags.map((t:any)=>(
                      <span key={t.id} className="px-2 py-1 rounded-full text-white text-xs" style={{backgroundColor:t.color}}>{t.name}</span>
                    ))}
                  </div>
                )}

                {/* 메뉴얼에 연결된 주의사항 목록 */}
                {detailModal.data.itemType==='manual' && Array.isArray(detailModal.data.precautions) && detailModal.data.precautions.length>0 && (
                  <div className="mt-6">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-red-600">⚠️</span>
                      <h3 className="font-semibold text-gray-900 text-sm">연결된 주의사항</h3>
                      <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-xs">{detailModal.data.precautions.length}개</span>
                    </div>
                    <div className="space-y-3">
                      {detailModal.data.precautions.map((p:any)=>(
                        <div key={p.id} className="bg-red-50 border border-red-200 rounded p-3">
                          <div className="font-medium text-red-900 text-sm mb-1">{p.title}</div>
                          <div className="text-[12px] text-red-800 whitespace-pre-wrap">{p.content}</div>
                          {Array.isArray(p.tags)&&p.tags.length>0 && (
                            <div className="mt-2 flex flex-wrap gap-1">
                              {p.tags.map((t:any)=>(<span key={t.id} className="px-2 py-0.5 rounded-full text-white text-[10px]" style={{backgroundColor:t.color}}>{t.name}</span>))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <div className="px-4 py-3 border-t flex justify-end">
                <button className="px-3 py-1.5 bg-gray-700 text-white rounded" onClick={()=>setDetailModal({open:false, data:null})}>닫기</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ChecklistTree({ nodes, onToggle, details, onOpenDetail, onInventoryUpdate, instanceId, reload, updateConnection, updateProgressConnected }: { nodes: any[]; onToggle: (id: string, next: boolean) => void; details: any; onOpenDetail: (data:any)=>void; onInventoryUpdate: (itemId:string, connectionId:string, value:number)=>void; instanceId: string; reload: ()=>Promise<void>; updateConnection: (connectionId: string, next: boolean)=>void; updateProgressConnected: (delta:number)=>void }) {
  return (
    <div className="space-y-2">
      {nodes.map((n) => (
        <ChecklistNode key={n.id} node={n} depth={0} onToggle={onToggle} details={details} onOpenDetail={onOpenDetail} onInventoryUpdate={onInventoryUpdate} instanceId={instanceId} reload={reload} updateConnection={updateConnection} updateProgressConnected={updateProgressConnected} />
      ))}
    </div>
  )
}

function ChecklistNode({ node, depth, onToggle, details, onOpenDetail, onInventoryUpdate, instanceId, reload, updateConnection, updateProgressConnected }: { node: any; depth: number; onToggle: (id: string, next: boolean) => void; details: any; onOpenDetail: (data:any)=>void; onInventoryUpdate: (itemId:string, connectionId:string, value:number)=>void; instanceId: string; reload: ()=>Promise<void>; updateConnection: (connectionId: string, next: boolean)=>void; updateProgressConnected: (delta:number)=>void }) {
  const indent = (typeof window !== 'undefined' && window.innerWidth <= 360) ? 10 : (typeof window !== 'undefined' && window.innerWidth <= 640 ? 14 : 18)
  return (
    <div className="space-y-2 w-full">
      <label className="w-full flex items-start gap-2 sm:gap-3 p-2 sm:p-3 rounded-lg border border-gray-200 hover:border-green-200 hover:bg-green-50/30 transition-colors cursor-pointer" style={{ marginLeft: depth * indent }}>
        <input
          type="checkbox"
          className="mt-0.5 sm:mt-1 h-4 w-4 appearance-none border border-gray-400 rounded-sm checked:bg-green-600 checked:border-green-600 focus:outline-none focus:ring-2 focus:ring-green-400"
          checked={!!node.isCompleted}
          onChange={(e) => {
            // 연결항목 또는 자식이 있으면 상위 직접 체크 불가
            const hasChildren = Array.isArray(node.children) && node.children.length > 0
            const hasConnections = Array.isArray(node.connections) && node.connections.length > 0
            if (hasChildren || hasConnections) {
              e.preventDefault()
              return
            }
            onToggle(node.id, e.target.checked)
          }}
        />
        <div className="min-w-0 flex-1">
          <div className="font-semibold text-gray-900 break-words whitespace-pre-wrap text-sm sm:text-base leading-6">{node.content}</div>
          {(node.completedBy || node.completedAt) && (
            <div className="mt-1 text-[11px] md:text-xs text-gray-600 flex items-center gap-2">
              <span>✅ 완료자: {node.completedBy || '—'}</span>
              {node.completedAt && (<span>{new Date(node.completedAt).toLocaleString()}</span>)}
            </div>
          )}
          {node.instructions && (
            <div className="text-[11px] sm:text-xs text-gray-500 mt-1 break-words whitespace-pre-wrap leading-6">{node.instructions}</div>
          )}
          {Array.isArray(node.connections) && node.connections.length > 0 && (
            <div className="mt-2 space-y-2">
              {node.connections
                .slice()
                .sort((a:any,b:any)=>{ const order:any={inventory:1,precaution:2,manual:3}; return (order[a.itemType]||9)-(order[b.itemType]||9) })
                .map((c: any) => {
                  const key = `${c.itemType}_${c.itemId}`
                  const d = details[key]
                  const isInventory = c.itemType === 'inventory'
                  return (
                    <div key={c.connectionId} className="border-b last:border-b-0 border-gray-200 pb-2">
                      <div className="flex items-start gap-1 sm:gap-2 text-[11px] sm:text-xs text-gray-700 w-full">
                        <input
                          type="checkbox"
                          className={`mt-0.5 h-3 w-3 appearance-none border border-gray-400 rounded-sm checked:bg-green-600 checked:border-green-600 focus:outline-none focus:ring-1 focus:ring-green-400 ${isInventory ? 'opacity-50 cursor-not-allowed' : ''}`}
                          checked={!!c.isCompleted}
                          disabled={isInventory}
                          onChange={async (e) => {
                            if (isInventory) return;
                            const next = e.target.checked
                            // 로컬 즉시 반영
                            updateConnection(c.connectionId, next)
                            // 진행률도 즉시 업데이트
                            updateProgressConnected(next ? 1 : -1)
                            try {
                              const r = await fetch('/api/employee/checklist-progress', {
                                method: 'PUT', credentials: 'include', headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ instanceId, connectionId: c.connectionId, isCompleted: next })
                              })
                              if (!r.ok) {
                                // 롤백
                                updateConnection(c.connectionId, !next)
                                updateProgressConnected(!next ? 1 : -1)
                              }
                            } catch {}
                          }}
                        />
                        <span className={`${isInventory ? 'bg-blue-100 text-blue-700' : c.itemType==='precaution' ? 'bg-red-100 text-red-700' : 'bg-purple-100 text-purple-700'} px-1.5 sm:px-2 py-0.5 rounded`}>{isInventory ? '재고' : c.itemType==='precaution'?'주의사항':'메뉴얼'}</span>
                        <span className="text-gray-800 flex-shrink-0">연결됨</span>
                      </div>

                      {isInventory && d && (
                        <div className="mt-2 pl-5 w-full">
                          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                            <span className="text-gray-600">현재재고:</span>
                            <span className="font-semibold text-gray-900">{Math.round(d.currentStock||0)} {d.unit}</span>
                            {Math.round(d.currentStock||0) <= Math.round(d.minStock||0) && (
                              <span className="text-red-600">구매 필요</span>
                            )}
                          </div>
                          <div className="mt-2 flex items-center gap-1.5 sm:gap-2 w-full max-w-sm">
                            <input type="number" className="flex-1 min-w-0 border rounded px-2 py-1 text-xs sm:text-sm" defaultValue={Math.round(d.currentStock||0)} onKeyDown={async (e:any)=>{ if(e.key==='Enter'){ await onInventoryUpdate(d.id, c.connectionId, Number(e.currentTarget.value)); } }} />
                            <button className="px-2 py-1 bg-blue-600 text-white rounded text-[11px] sm:text-xs" onClick={async (e:any)=>{ const input=(e.currentTarget.previousSibling as HTMLInputElement); await onInventoryUpdate(d.id, c.connectionId, Number(input.value)); }}>입력</button>
                          </div>
                          {c.completedBy && (
                            <div className="mt-1 text-[11px] text-gray-600">✅ 완료자: {c.completedBy} {c.completedAt ? `· ${new Date(c.completedAt).toLocaleString()}` : ''}</div>
                          )}
                        </div>
                      )}

                      {c.itemType !== 'inventory' && d && (
                        <div className={`mt-2 pl-5 ${c.itemType==='precaution' ? 'bg-orange-50 border border-orange-200 rounded p-2' : 'bg-green-50 border border-green-200 rounded p-2'}`}>
                          <div 
                            className="text-[12px] sm:text-sm text-gray-700 whitespace-pre-wrap break-words cursor-pointer"
                            onClick={()=>onOpenDetail({ ...d, itemType: c.itemType })}
                          >
                            {(d.content||'').slice(0,150)}{(d.content||'').length>150?'...':''}
                          </div>
                          {c.itemType==='manual' && Array.isArray(d.precautions) && (
                            <div className="mt-1 text-[11px] text-green-700">연결주의 {d.precautions.length}개</div>
                          )}
                          <div className="text-[11px] mt-1 text-gray-600">{c.itemType==='precaution' ? '주의사항을 확인하고 체크해주세요' : '매뉴얼을 확인하고 체크해주세요'}</div>
                          {c.completedBy && (
                            <div className="mt-1 text-[11px] text-gray-600">✅ 완료자: {c.completedBy} {c.completedAt ? `· ${new Date(c.completedAt).toLocaleString()}` : ''}</div>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
            </div>
          )}
        </div>
      </label>
      {Array.isArray(node.children) && node.children.length > 0 && (
        <div className="space-y-2">
          {node.children.map((c: any) => (
            <ChecklistNode key={c.id} node={c} depth={depth + 1} onToggle={onToggle} />
          ))}
        </div>
      )}
      {(Array.isArray(node.children) && node.children.length > 0) && (
        <div className="ml-6 text-[11px] text-gray-500">하위 항목을 모두 완료하면 자동으로 완료됩니다.</div>
      )}
    </div>
  )
}


