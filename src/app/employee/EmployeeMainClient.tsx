"use client";
import Link from "next/link";
import React from "react";
import { useEffect, useState } from "react";
import EmployeeStaleInventory from "./EmployeeStaleInventory";

type Feed = { notices: any[]; updatedManuals: any[]; newPrecautions: any[]; inventoryStale?: any[] };

export default function EmployeeMainClient() {
  const [feed, setFeed] = useState<Feed | null>(null);
  const [loading, setLoading] = useState(true);
  const didFetchRef = React.useRef(false);
  
  useEffect(() => { 
    if (didFetchRef.current) return;
    didFetchRef.current = true;
    (async () => {
      try {
        const r = await fetch('/api/employee/feed', { credentials: 'include' });
        if (r.ok) {
          const data = await r.json();
          setFeed(data);
        }
      } catch (error) {
        console.error('피드 로딩 실패:', error);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const [modal, setModal] = useState<null | { type: 'notice'|'manual'|'precaution'|'inventory', data: any }>(null);

  return (
    <main className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50 p-3 sm:p-6">
      <div className="w-full max-w-6xl mx-auto">
        {/* 헤더 섹션 */}
        <div className="mb-8">
          <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-lg border border-white/20 p-6 sm:p-8">
            <div className="text-center">
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
                안녕하세요! 👋
              </h1>
              <p className="text-gray-600 text-sm sm:text-base">
                오늘도 안전하고 효율적인 업무를 위해 함께해요
              </p>
            </div>
          </div>
        </div>

        {/* 최신 업데이트 피드 */}
        {loading ? (
          <div className="mb-8">
            <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-lg border border-white/20 p-6">
              <div className="animate-pulse">
                <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="h-32 bg-gray-100 rounded-xl"></div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : feed && (feed.notices?.length || feed.updatedManuals?.length || feed.newPrecautions?.length) ? (
          <div className="mb-8">
            <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-lg border border-white/20 p-6 sm:p-8">
              <h2 className="flex items-center gap-3 text-xl sm:text-2xl font-bold text-gray-900 mb-6">
                <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 text-white text-sm">
                  📰
                </span> 
                최신 업데이트
              </h2>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* 공지사항 */}
                <div className="bg-gradient-to-br from-red-50 to-pink-50 border border-red-100 rounded-2xl p-5 hover:shadow-md transition-all duration-300">
                  <div className="flex items-center gap-2 mb-4">
                    <span className="text-2xl">📢</span>
                    <h3 className="font-bold text-red-700 text-lg">공지사항</h3>
                  </div>
                  <div className="space-y-3">
                    {feed.notices?.slice(0, 3).map((n: any) => (
                      <button 
                        key={n.id} 
                        onClick={() => setModal({type: 'notice', data: n})} 
                        className="text-left w-full hover:bg-red-100/50 rounded-xl p-3 transition-all duration-200 group"
                      >
                        <div className="font-semibold text-gray-900 line-clamp-2 group-hover:text-red-700 transition-colors">
                          {n.title}
                        </div>
                        {n.createdAt && (
                          <div className="text-xs text-gray-500 mt-1">
                            {new Date(n.createdAt).toLocaleDateString('ko-KR')}
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 업데이트된 메뉴얼 */}
                <div className="bg-gradient-to-br from-indigo-50 to-blue-50 border border-indigo-100 rounded-2xl p-5 hover:shadow-md transition-all duration-300">
                  <div className="flex items-center gap-2 mb-4">
                    <span className="text-2xl">📚</span>
                    <h3 className="font-bold text-indigo-700 text-lg">업데이트된 메뉴얼</h3>
                  </div>
                  <div className="space-y-3">
                    {feed.updatedManuals?.slice(0, 3).map((m: any) => (
                      <button 
                        key={m.id} 
                        onClick={() => setModal({type: 'manual', data: m})} 
                        className="text-left w-full hover:bg-indigo-100/50 rounded-xl p-3 transition-all duration-200 group"
                      >
                        <div className="font-semibold text-gray-900 line-clamp-2 group-hover:text-indigo-700 transition-colors">
                          {m.title}
                        </div>
                        {m.updatedAt && (
                          <div className="text-xs text-gray-500 mt-1">
                            {new Date(m.updatedAt).toLocaleDateString('ko-KR')}
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 새/수정 주의사항 */}
                <div className="bg-gradient-to-br from-orange-50 to-yellow-50 border border-orange-100 rounded-2xl p-5 hover:shadow-md transition-all duration-300">
                  <div className="flex items-center gap-2 mb-4">
                    <span className="text-2xl">⚠️</span>
                    <h3 className="font-bold text-orange-700 text-lg">새/수정 주의사항</h3>
                  </div>
                  <div className="space-y-3">
                    {feed.newPrecautions?.slice(0, 3).map((p: any) => (
                      <button 
                        key={p.id} 
                        onClick={() => setModal({type: 'precaution', data: p})} 
                        className="text-left w-full hover:bg-orange-100/50 rounded-xl p-3 transition-all duration-200 group"
                      >
                        <div className="font-semibold text-gray-900 line-clamp-2 group-hover:text-orange-700 transition-colors">
                          {p.title}
                        </div>
                        {(p.updatedAt || p.createdAt) && (
                          <div className="text-xs text-gray-500 mt-1">
                            {new Date(p.updatedAt || p.createdAt).toLocaleDateString('ko-KR')}
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* 재고 업데이트 필요 */}
              <div className="mt-6 bg-gradient-to-br from-teal-50 to-cyan-50 border border-teal-100 rounded-2xl p-5 hover:shadow-md transition-all duration-300">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">📦</span>
                    <Link 
                      prefetch={false} 
                      href="/employee/inventory/stale" 
                      className="font-bold text-teal-700 text-lg hover:text-teal-800 hover:underline transition-colors"
                    >
                      재고 업데이트 필요
                    </Link>
                  </div>
                </div>
                <div className="text-sm text-gray-600 mb-4">2일 이상 미업데이트 또는 업데이트 기록 없음</div>
                {/* 서버에서 같이 전달된 상위 5개를 우선 표시하여 초기 로딩 단축 */}
                {feed.inventoryStale && feed.inventoryStale.length > 0 ? (
                  <div className="space-y-3">
                    {feed.inventoryStale.map((item: any) => (
                      <button
                        key={item.id}
                        onClick={() => setModal({ type: 'inventory', data: item })}
                        className="w-full text-left bg-white border border-gray-100 hover:border-teal-200 hover:bg-teal-50/30 rounded-xl p-4 transition-all duration-200 hover:shadow-md group"
                      >
                        <div className="flex items-center justify-between gap-3 mb-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <span className="text-2xl flex-shrink-0" aria-hidden="true">📦</span>
                            <div className="min-w-0">
                              <div className="font-bold text-gray-900 truncate group-hover:text-teal-700 transition-colors">{item.name}</div>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-700">{item.category}</span>
                                {(item.currentStock ?? 0) <= (item.minStock ?? 0) && (
                                  <span className="px-2 py-1 text-xs font-bold bg-red-500 text-white rounded-full">재고부족</span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <div className="text-sm font-bold text-orange-600">최근</div>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-xs">
                          <div className="bg-gray-50 rounded-lg p-2">
                            <div className="text-gray-500 mb-1">현재 재고</div>
                            <div className="font-bold text-gray-900">{item.currentStock} / {item.minStock} {item.unit}</div>
                          </div>
                          <div className="bg-gray-50 rounded-lg p-2">
                            <div className="text-gray-500 mb-1">최근 업데이트</div>
                            <div className="font-medium text-gray-700">{item.lastUpdated ? new Date(item.lastUpdated).toLocaleDateString('ko-KR') : '-'}</div>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <EmployeeStaleInventory onSelect={(item: any) => setModal({type: 'inventory', data: item})} />
                )}
              </div>
            </div>
          </div>
        ) : null}

        {/* 빠른 접근 메뉴 카드 */}
        <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-lg border border-white/20 p-6 sm:p-8">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-6 text-center">
            빠른 접근 메뉴
          </h2>
          <div className="grid grid-cols-1 min-[400px]:grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            {/* 오늘의 체크리스트 */}
            <Link 
              prefetch={false} 
              href="/employee/checklist" 
              className="group bg-gradient-to-br from-green-400 to-green-600 hover:from-green-500 hover:to-green-700 rounded-2xl p-6 text-white shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300"
            >
              <div className="text-center">
                <div className="text-3xl sm:text-4xl mb-3">✅</div>
                <div className="font-bold text-lg mb-2">오늘의 체크리스트</div>
                <div className="text-xs opacity-90">준비/진행/마감, 홀/부엌</div>
              </div>
            </Link>

            {/* 내 제출 내역 */}
            <Link 
              prefetch={false} 
              href="/employee/submissions" 
              className="group bg-gradient-to-br from-blue-400 to-blue-600 hover:from-blue-500 hover:to-blue-700 rounded-2xl p-6 text-white shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300"
            >
              <div className="text-center">
                <div className="text-3xl sm:text-4xl mb-3">📋</div>
                <div className="font-bold text-lg mb-2">내 제출 내역</div>
                <div className="text-xs opacity-90">체크리스트 제출 기록</div>
              </div>
            </Link>

            {/* 주의사항 */}
            <Link 
              prefetch={false} 
              href="/employee/notices" 
              className="group bg-gradient-to-br from-yellow-400 to-orange-500 hover:from-yellow-500 hover:to-orange-600 rounded-2xl p-6 text-white shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300"
            >
              <div className="text-center">
                <div className="text-3xl sm:text-4xl mb-3">⚠️</div>
                <div className="font-bold text-lg mb-2">주의사항</div>
                <div className="text-xs opacity-90">업무 전 꼭 확인!</div>
              </div>
            </Link>

            {/* 재고관리 */}
            <Link 
              prefetch={false} 
              href="/employee/inventory" 
              className="group bg-gradient-to-br from-purple-400 to-purple-600 hover:from-purple-500 hover:to-purple-700 rounded-2xl p-6 text-white shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300"
            >
              <div className="text-center">
                <div className="text-3xl sm:text-4xl mb-3">📦</div>
                <div className="font-bold text-lg mb-2">재고관리</div>
                <div className="text-xs opacity-90">식자재 및 부대용품 관리</div>
              </div>
            </Link>

            {/* 재고 업데이트 필요 */}
            <Link 
              prefetch={false} 
              href="/employee/inventory/stale" 
              className="group bg-gradient-to-br from-teal-400 to-cyan-600 hover:from-teal-500 hover:to-cyan-700 rounded-2xl p-6 text-white shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300"
            >
              <div className="text-center">
                <div className="text-3xl sm:text-4xl mb-3">⏰</div>
                <div className="font-bold text-lg mb-2">재고 업데이트 필요</div>
                <div className="text-xs opacity-90">업데이트 필요/전체 보기</div>
              </div>
            </Link>

            {/* 메뉴얼 */}
            <Link 
              prefetch={false} 
              href="/employee/manual" 
              className="group bg-gradient-to-br from-indigo-400 to-indigo-600 hover:from-indigo-500 hover:to-indigo-700 rounded-2xl p-6 text-white shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300"
            >
              <div className="text-center">
                <div className="text-3xl sm:text-4xl mb-3">📚</div>
                <div className="font-bold text-lg mb-2">메뉴얼</div>
                <div className="text-xs opacity-90">업무 가이드 및 매뉴얼</div>
              </div>
            </Link>

            {/* 즐겨찾기 */}
            <Link 
              prefetch={false} 
              href="/employee/favorites" 
              className="group bg-gradient-to-br from-pink-400 to-rose-500 hover:from-pink-500 hover:to-rose-600 rounded-2xl p-6 text-white shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300"
            >
              <div className="text-center">
                <div className="text-3xl sm:text-4xl mb-3">💖</div>
                <div className="font-bold text-lg mb-2">즐겨찾기</div>
                <div className="text-xs opacity-90">내가 하트한 매뉴얼/주의사항</div>
              </div>
            </Link>
          </div>
        </div>
      </div>

      {/* 상세 모달 */}
      {modal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-auto shadow-2xl">
            <div className="sticky top-0 bg-white border-b border-gray-200 p-6 rounded-t-2xl">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-gray-900">
                  {modal.type === 'notice' && '📢 공지사항'}
                  {modal.type === 'manual' && '📚 메뉴얼'}
                  {modal.type === 'precaution' && '⚠️ 주의사항'}
                  {modal.type === 'inventory' && '📦 재고 업데이트'}
                </h3>
                <button 
                  onClick={() => setModal(null)} 
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            
            <div className="p-6">
              {modal.type === 'inventory' ? (
                <InventoryQuickUpdate item={modal.data} onDone={() => setModal(null)} />
              ) : modal.type === 'manual' ? (
                <ManualLikeDetail id={modal.data.id} fallback={modal.data} />
              ) : modal.type === 'notice' ? (
                <NoticeDetail fallback={modal.data} />
              ) : (
                <PrecautionDetail id={modal.data.id} fallback={modal.data} />
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

// 임시 컴포넌트들 (나중에 실제 구현 필요)
function InventoryQuickUpdate({ item, onDone }: { item: any, onDone: () => void }) {
  const [qty, setQty] = useState<number>(item.currentStock || 0);
  const [loading, setLoading] = useState(false);
  
  const submit = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/employee/inventory', { 
        method: 'PUT', 
        credentials: 'include', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ itemId: item.id, currentStock: qty }) 
      });
      
      if (res.ok) { 
        alert('업데이트 완료'); 
        onDone(); 
      } else { 
        const e = await res.json().catch(() => ({})); 
        alert(e.error || '실패'); 
      }
    } catch (error) {
      alert('오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-gray-50 rounded-xl p-4">
        <div className="font-bold text-gray-900 text-lg mb-2">{item.name}</div>
        <div className="text-sm text-gray-600">
          현재/기준: <span className="font-semibold">{item.currentStock}</span> / <span className="font-semibold">{item.minStock}</span> {item.unit}
        </div>
        <div className="text-xs text-gray-500 mt-1">
          최근 업데이트: {new Date(item.lastUpdated || item.createdAt).toLocaleString('ko-KR')} 
          {item.lastCheckedBy && ` • ${item.lastCheckedBy}`}
        </div>
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-900 mb-2">새 재고 수량</label>
        <input 
          type="number" 
          value={qty} 
          onChange={e => setQty(parseFloat(e.target.value || '0'))} 
          className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900 font-semibold placeholder-gray-500 focus:ring-2 focus:ring-teal-500 focus:border-teal-500" 
          placeholder="수량을 입력하세요" 
        />
      </div>
      
      <div className="flex gap-3">
        <button 
          onClick={submit} 
          disabled={loading} 
          className="flex-1 px-4 py-3 bg-teal-600 text-white rounded-lg font-semibold hover:bg-teal-700 disabled:opacity-50 transition-colors"
        >
          {loading ? '저장 중...' : '바로 업데이트'}
        </button>
        <button 
          onClick={onDone} 
          className="px-6 py-3 bg-gray-500 text-white rounded-lg font-semibold hover:bg-gray-600 transition-colors"
        >
          닫기
        </button>
      </div>
    </div>
  );
}

function ManualLikeDetail({ id, fallback }: { id: string, fallback: any }) {
  return (
    <div className="space-y-4">
      <div className="bg-indigo-50 rounded-xl p-4">
        <h4 className="font-bold text-indigo-900 mb-2">{fallback.title}</h4>
        <p className="text-indigo-700 text-sm">{fallback.content || '메뉴얼 내용을 불러오는 중...'}</p>
      </div>
    </div>
  );
}

function NoticeDetail({ fallback }: { fallback: any }) {
  return (
    <div className="space-y-4">
      <div className="bg-red-50 rounded-xl p-4">
        <h4 className="font-bold text-red-900 mb-2">{fallback.title}</h4>
        <p className="text-red-700 text-sm">{fallback.content || '공지사항 내용을 불러오는 중...'}</p>
        <div className="text-xs text-red-600 mt-3">
          {new Date(fallback.createdAt).toLocaleString('ko-KR')}
        </div>
      </div>
    </div>
  );
}

function PrecautionDetail({ id, fallback }: { id: string, fallback: any }) {
  return (
    <div className="space-y-4">
      <div className="bg-orange-50 rounded-xl p-4">
        <h4 className="font-bold text-orange-900 mb-2">{fallback.title}</h4>
        <p className="text-orange-700 text-sm">{fallback.content || '주의사항 내용을 불러오는 중...'}</p>
        <div className="text-xs text-orange-600 mt-3">
          {new Date(fallback.updatedAt || fallback.createdAt).toLocaleString('ko-KR')}
        </div>
      </div>
    </div>
  );
}
