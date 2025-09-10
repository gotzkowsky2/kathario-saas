"use client";
import Link from "next/link";
import React, { useEffect, useState } from "react";

export default function EmployeeStaleInventory({ onSelect }: { onSelect: (item: any) => void }) {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch('/api/employee/inventory/stale?days=2', { 
          credentials: 'include', 
          cache: 'no-store' 
        });
        if (r.ok) {
          const d = await r.json();
          setItems(d.items || []);
        }
      } catch (error) {
        console.error('재고 업데이트 필요 항목 로딩 실패:', error);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="animate-pulse bg-white rounded-xl p-4 border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
              <div className="flex-1">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!items.length) {
    return (
      <div className="text-center py-8">
        <div className="text-4xl mb-3">🎉</div>
        <div className="text-sm font-medium text-gray-700">업데이트 필요 항목이 없습니다!</div>
        <div className="text-xs text-gray-500 mt-1">모든 재고가 최신 상태입니다</div>
      </div>
    );
  }

  const categoryConfig: Record<string, { icon: string; color: string; name: string }> = {
    INGREDIENTS: { icon: '🥬', color: 'green', name: '식자재' },
    SUPPLIES: { icon: '📦', color: 'blue', name: '소모품' },
    HYGIENE: { icon: '🧼', color: 'purple', name: '위생용품' },
    CHECKLIST: { icon: '✅', color: 'teal', name: '체크리스트' },
    PRECAUTIONS: { icon: '⚠️', color: 'orange', name: '주의사항' },
    COMMON: { icon: '📁', color: 'gray', name: '공통' },
    MANUAL: { icon: '📘', color: 'indigo', name: '메뉴얼' }
  };

  return (
    <div className="space-y-3">
      {items.slice(0, 5).map((item: any) => {
        const last = item.lastUpdated || item.createdAt;
        const config = categoryConfig[item.category] || categoryConfig.COMMON;
        const isLowStock = item.currentStock <= item.minStock;
        
        return (
          <button
            key={item.id}
            onClick={() => onSelect(item)}
            className="w-full text-left bg-white border border-gray-100 hover:border-teal-200 hover:bg-teal-50/30 rounded-xl p-4 transition-all duration-200 hover:shadow-md group"
          >
            <div className="flex items-center justify-between gap-3 mb-3">
              <div className="flex items-center gap-3 min-w-0">
                <span className="text-2xl flex-shrink-0" aria-hidden="true">
                  {config.icon}
                </span>
                <div className="min-w-0">
                  <div className="font-bold text-gray-900 truncate group-hover:text-teal-700 transition-colors">
                    {item.name}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full bg-${config.color}-100 text-${config.color}-700`}>
                      {config.name}
                    </span>
                    {isLowStock && (
                      <span className="px-2 py-1 text-xs font-bold bg-red-500 text-white rounded-full animate-pulse">
                        재고부족
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <div className="text-sm font-bold text-orange-600">
                  {item.daysSinceUpdate}일 전
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="bg-gray-50 rounded-lg p-2">
                <div className="text-gray-500 mb-1">현재 재고</div>
                <div className="font-bold text-gray-900">
                  {item.currentStock} / {item.minStock} {item.unit}
                </div>
              </div>
              <div className="bg-gray-50 rounded-lg p-2">
                <div className="text-gray-500 mb-1">최근 업데이트</div>
                <div className="font-medium text-gray-700">
                  {new Date(last).toLocaleDateString('ko-KR')}
                </div>
              </div>
            </div>

            {item.lastCheckedBy && (
              <div className="mt-2 text-xs text-gray-500">
                <span className="inline-flex items-center gap-1">
                  <span>👤</span>
                  <span>업데이트: {item.lastCheckedBy}</span>
                </span>
              </div>
            )}
          </button>
        );
      })}
      
      {items.length > 5 && (
        <div className="text-center pt-2">
          <Link 
            prefetch={false} 
            href="/employee/inventory/stale" 
            className="inline-flex items-center gap-2 text-sm font-medium text-teal-600 hover:text-teal-700 hover:underline transition-colors"
          >
            <span>전체 {items.length}개 항목 보기</span>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      )}
    </div>
  );
}

