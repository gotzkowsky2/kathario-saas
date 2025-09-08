"use client";

import { useMemo, useState } from "react";

type Category = "식자재" | "소모품";

interface InventoryItem {
  id: string;
  name: string;
  category: Category;
  unit: string;
  currentStock: number;
  minStock: number;
  supplier: string;
  tags: string[];
  template?: string; // 속한 템플릿명
  updatedAt: string; // YYYY-MM-DD HH:mm
  updatedBy: string; // 직원 이름
}

const sampleItems: InventoryItem[] = [
  { id: "i1", name: "치킨(냉동)", category: "식자재", unit: "kg", currentStock: 50, minStock: 10, supplier: "치킨 공급업체", tags: ["냉동", "메인"], template: "주방 재고파악", updatedAt: "2025-09-08 09:10", updatedBy: "김직원" },
  { id: "i2", name: "감자튀김", category: "식자재", unit: "kg", currentStock: 8, minStock: 12, supplier: "감자 공급업체", tags: ["주의"], template: "주방 재고파악", updatedAt: "2025-09-08 09:05", updatedBy: "이직원" },
  { id: "i3", name: "일회용 컵", category: "소모품", unit: "개", currentStock: 120, minStock: 100, supplier: "포장재 업체", tags: ["홀"], template: "홀 마감 기본", updatedAt: "2025-09-07 18:20", updatedBy: "박파트" },
];

const initialTags = ["냉동", "메인", "주의", "홀", "주방", "마감"];

export default function InventoryPage() {
  // 좌측 생성 툴 상태
  const [name, setName] = useState("");
  const [category, setCategory] = useState<Category>("식자재");
  const [unit, setUnit] = useState("");
  const [currentStock, setCurrentStock] = useState<number>(0);
  const [minStock, setMinStock] = useState<number>(0);
  const [supplier, setSupplier] = useState("");
  const [tagQuery, setTagQuery] = useState("");
  const [availableTags, setAvailableTags] = useState<string[]>(initialTags);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const filteredTags = useMemo(() => availableTags.filter(t => t.toLowerCase().includes(tagQuery.toLowerCase())), [availableTags, tagQuery]);

  // 우측 리스트 필터
  const [q, setQ] = useState("");
  const [filterCategory, setFilterCategory] = useState<"전체" | Category>("전체");
  const [onlyLow, setOnlyLow] = useState(false);
  const [employee, setEmployee] = useState("전체");
  // 우측 태그 필터(검색+칩 토글)
  const [rightTagQuery, setRightTagQuery] = useState("");
  const [activeTagFilters, setActiveTagFilters] = useState<string[]>([]);

  const employees = useMemo(() => Array.from(new Set(sampleItems.map(i => i.updatedBy))), []);
  const allTags = useMemo(() => Array.from(new Set(sampleItems.flatMap(i => i.tags))), []);
  const filteredRightTags = useMemo(() => allTags.filter(t => t.toLowerCase().includes(rightTagQuery.toLowerCase())), [allTags, rightTagQuery]);

  const statusOf = (i: InventoryItem) => i.currentStock < i.minStock ? "부족" : (i.currentStock < Math.ceil(i.minStock * 1.2) ? "주의" : "정상");

  const criticalItems = useMemo(() => sampleItems.filter(i => statusOf(i) !== "정상"), []);

  const filteredItems = useMemo(() => {
    return sampleItems.filter(i => {
      const matchesQ = !q || i.name.toLowerCase().includes(q.toLowerCase());
      const matchesCat = filterCategory === "전체" || i.category === filterCategory;
      const matchesOnlyLow = !onlyLow || i.currentStock < i.minStock;
      const matchesEmp = employee === "전체" || i.updatedBy === employee;
      const matchesTag = activeTagFilters.length === 0 || i.tags.some(t => activeTagFilters.includes(t));
      return matchesQ && matchesCat && matchesOnlyLow && matchesEmp && matchesTag;
    });
  }, [q, filterCategory, onlyLow, employee, activeTagFilters]);

  const addTag = () => {
    const t = tagQuery.trim();
    if (!t) return;
    if (!availableTags.includes(t)) setAvailableTags([t, ...availableTags]);
    if (!selectedTags.includes(t)) setSelectedTags([...selectedTags, t]);
    setTagQuery("");
  };

  const toggleSelectTag = (t: string) => {
    setSelectedTags(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]);
  };

  return (
    <div className="space-y-6">
      {/* 상단: 재고 업데이트 필요 */}
      <div className="bg-white/70 backdrop-blur-sm rounded-2xl border border-white/20 p-4">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">재고 업데이트 필요</h2>
        {criticalItems.length === 0 ? (
          <div className="text-sm text-gray-700">모든 재고가 정상입니다.</div>
        ) : (
          <ul className="divide-y divide-gray-100 bg-white/60 rounded-xl border">
            {criticalItems.map(i => (
              <li key={i.id} className="px-4 py-3 flex items-center justify-between">
                <div>
                  <div className="font-medium text-gray-900">{i.name}</div>
                  <div className="text-xs text-gray-600">현재 {i.currentStock}{i.unit} / 최소 {i.minStock}{i.unit}</div>
                </div>
                <span className={`px-2 py-1 text-xs rounded-full ${statusOf(i) === '부족' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>{statusOf(i)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* 메인 영역: 좌측 생성 툴(좁게), 우측 현황(넓게) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 좌측: 아이템 생성 툴 (lg: 1/3) */}
        <div className="bg-white/70 backdrop-blur-sm rounded-2xl border border-white/20 p-5 space-y-4 lg:col-span-1">
          <h3 className="text-base font-semibold text-gray-900">재고 아이템 생성</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-600 mb-1">이름</label>
              <input value={name} onChange={e=>setName(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-600 bg-white" placeholder="예: 치킨(냉동)" />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">카테고리</label>
              <select value={category} onChange={e=>setCategory(e.target.value as Category)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 bg-white">
                <option value="식자재">식자재</option>
                <option value="소모품">소모품</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">단위</label>
              <input value={unit} onChange={e=>setUnit(e.target.value)} placeholder="kg, 개 등" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-600 bg-white" />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">현재 재고</label>
              <input type="number" value={currentStock} onChange={e=>setCurrentStock(Number(e.target.value))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 bg-white" />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">최소 재고</label>
              <input type="number" value={minStock} onChange={e=>setMinStock(Number(e.target.value))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 bg-white" />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">공급업체</label>
              <input value={supplier} onChange={e=>setSupplier(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-600 bg-white" placeholder="예: Panasia" />
            </div>
          </div>

          {/* 태그 선택/추가 */}
          <div className="space-y-2">
            <label className="block text-xs text-gray-600">태그 선택</label>
            <div className="flex gap-2">
              <input value={tagQuery} onChange={e=>setTagQuery(e.target.value)} placeholder="태그 검색" className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-600 bg-white" />
              <button onClick={addTag} className="px-3 py-2 rounded-lg border border-gray-300 text-sm text-gray-800 hover:bg-gray-100">태그 추가</button>
            </div>
            {/* 선택된 태그 */}
            <div className="min-h-[32px] flex flex-wrap gap-2 p-2 rounded-lg bg-white/60 border">
              {selectedTags.length === 0 ? (
                <span className="text-xs text-gray-500">선택된 태그가 없습니다.</span>
              ) : (
                selectedTags.map(t => (
                  <button key={t} type="button" onClick={()=>toggleSelectTag(t)} className="px-2 py-0.5 text-[11px] rounded-full bg-emerald-600 text-white border border-emerald-600">{t} ×</button>
                ))
              )}
            </div>
            {/* 사용 가능한 태그 */}
            <div className="flex flex-wrap gap-2">
              {filteredTags.map(t => (
                <button key={t} type="button" onClick={()=>toggleSelectTag(t)} className={`px-2 py-1 text-xs rounded-full border ${selectedTags.includes(t) ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-gray-700 border-gray-300'}`}>{t}</button>
              ))}
            </div>
          </div>

          <div className="pt-2">
            <button className="px-4 py-2 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-sm font-medium">저장</button>
          </div>
        </div>

        {/* 우측: 재고 현황 리스트 & 필터 (lg: 2/3) */}
        <div className="bg-white/70 backdrop-blur-sm rounded-2xl border border-white/20 p-5 space-y-4 lg:col-span-2">
          <h3 className="text-base font-semibold text-gray-900">재고 현황</h3>
          {/* 필터 바 */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
            <input value={q} onChange={e=>setQ(e.target.value)} placeholder="이름 또는 공급업체 검색" className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-600 bg-white" />
            <select value={filterCategory} onChange={e=>setFilterCategory(e.target.value as any)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 bg-white">
              <option value="전체">전체</option>
              <option value="식자재">식자재</option>
              <option value="소모품">소모품</option>
            </select>
            <label className="inline-flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white">
              <input type="checkbox" checked={onlyLow} onChange={e=>setOnlyLow(e.target.checked)} />
              <span>부족만</span>
            </label>
            <select value={employee} onChange={e=>setEmployee(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 bg-white">
              <option value="전체">직원(최근 업데이트)</option>
              {employees.map(emp => <option key={emp} value={emp}>{emp}</option>)}
            </select>
            <div className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white">
              <input value={rightTagQuery} onChange={e=>setRightTagQuery(e.target.value)} placeholder="태그 검색" className="w-full outline-none text-gray-900 placeholder-gray-600 bg-white" />
            </div>
          </div>
          {/* 태그 필터 칩 */}
          <div className="flex flex-wrap gap-2">
            {filteredRightTags.map(t => {
              const active = activeTagFilters.includes(t);
              return (
                <button key={t} type="button" onClick={() => setActiveTagFilters(active ? activeTagFilters.filter(x=>x!==t) : [...activeTagFilters, t])} className={`px-2 py-1 text-xs rounded-full border ${active ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-700 border-gray-300'}`}>{t}</button>
              );
            })}
            {activeTagFilters.length > 0 && (
              <button type="button" onClick={()=>setActiveTagFilters([])} className="px-2 py-1 text-xs rounded-full border border-gray-300 text-gray-700">태그 초기화</button>
            )}
          </div>

          {/* 리스트: 데스크탑 테이블 */}
          <div className="hidden lg:block overflow-auto rounded-xl border border-gray-100">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50/80">
                <tr className="text-left text-gray-600">
                  <th className="px-4 py-3">이름</th>
                  <th className="px-4 py-3">템플릿</th>
                  <th className="px-4 py-3">구분</th>
                  <th className="px-4 py-3">태그</th>
                  <th className="px-4 py-3">현재</th>
                  <th className="px-4 py-3">최소</th>
                  <th className="px-4 py-3">마지막 업데이트</th>
                  <th className="px-4 py-3">직원</th>
                  <th className="px-4 py-3">동작</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map(i => (
                  <tr key={i.id} className="border-t">
                    <td className="px-4 py-3 font-medium text-gray-900">{i.name}</td>
                    <td className="px-4 py-3 text-gray-700">{i.template ?? '-'}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 text-xs rounded-full border ${i.category === '식자재' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-blue-50 text-blue-700 border-blue-100'}`}>{i.category}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      <div className="flex flex-wrap gap-1">
                        {i.tags.map(t => <span key={t} className="px-2 py-0.5 text-[11px] rounded-full bg-gray-100 text-gray-700 border">{t}</span>)}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-800">{i.currentStock}{i.unit}</td>
                    <td className="px-4 py-3 text-gray-800">{i.minStock}{i.unit}</td>
                    <td className="px-4 py-3 text-gray-700">{i.updatedAt}</td>
                    <td className="px-4 py-3 text-gray-700">{i.updatedBy}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button className="px-2.5 py-1.5 text-xs rounded-lg border border-gray-300 text-gray-800 hover:bg-gray-100">수정</button>
                        <button className="px-2.5 py-1.5 text-xs rounded-lg border border-gray-300 text-gray-800 hover:bg-gray-100">삭제</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* 모바일 카드 */}
          {/* 모바일 카드(가로 320px 최적화) */}
          <div className="grid lg:hidden grid-cols-1 gap-3">
            {filteredItems.map(i => (
              <div key={i.id} className="rounded-xl border border-gray-200 bg-white/60 p-4">
                {/* 상단: 이름 + 상태 */}
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-semibold text-gray-900 text-[15px] leading-snug break-words">{i.name}</div>
                    <div className="text-[12px] text-gray-600 mt-0.5 break-words">{i.template ?? '-'} • {i.category}</div>
                  </div>
                  <span className={`shrink-0 px-2 py-1 text-[11px] rounded-full ${statusOf(i) === '부족' ? 'bg-red-100 text-red-700' : statusOf(i) === '주의' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>{statusOf(i)}</span>
                </div>
                {/* 수량 */}
                <div className="mt-2 grid grid-cols-2 gap-2 text-[13px] text-gray-800">
                  <div className="rounded-lg bg-white/70 border px-2 py-1 text-center">현재 {i.currentStock}{i.unit}</div>
                  <div className="rounded-lg bg-white/70 border px-2 py-1 text-center">최소 {i.minStock}{i.unit}</div>
                </div>
                {/* 업데이트 정보 */}
                <div className="mt-1 text-[12px] text-gray-600 break-words">업데이트 {i.updatedAt} • {i.updatedBy}</div>
                {/* 태그 */}
                <div className="mt-2 flex flex-wrap gap-1">
                  {i.tags.map(t => <span key={t} className="px-2 py-0.5 text-[11px] rounded-full bg-gray-100 text-gray-700 border">{t}</span>)}
                </div>
                {/* 동작 버튼 */}
                <div className="mt-3 flex items-center gap-2">
                  <button className="px-3 py-1.5 text-xs rounded-lg border border-gray-300 text-gray-800 hover:bg-gray-100">수정</button>
                  <button className="px-3 py-1.5 text-xs rounded-lg border border-gray-300 text-gray-800 hover:bg-gray-100">삭제</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
