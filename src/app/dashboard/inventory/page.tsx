"use client";

import { useEffect, useMemo, useState } from "react";

type Category = "식자재" | "소모품";

interface Tag {
  id: string;
  name: string;
  color: string;
}

interface InventoryItem {
  id: string;
  name: string;
  category: Category;
  unit: string;
  currentStock: number;
  minStock: number;
  supplier: string;
  tags: Tag[];
  template?: string;
  updatedAt: string;
  updatedBy: string;
}

export default function InventoryPage() {
  // 데이터 상태
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // 좌측 생성/수정 툴 상태
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [category, setCategory] = useState<Category>("식자재");
  const [unit, setUnit] = useState("");
  const [currentStock, setCurrentStock] = useState<number>(0);
  const [minStock, setMinStock] = useState<number>(0);
  const [supplier, setSupplier] = useState("");
  const [tagQuery, setTagQuery] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const filteredTags = useMemo(() => tags.filter(t => t.name.toLowerCase().includes(tagQuery.toLowerCase())), [tags, tagQuery]);

  // 태그 생성 모달
  const [showTagModal, setShowTagModal] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState('#3B82F6');

  // 카테고리 매핑 (프론트엔드 한글 ↔ 백엔드 영어)
  const categoryMapping = {
    '식자재': 'INGREDIENTS',
    '소모품': 'SUPPLIES'
  } as const;
  
  const categoryLabels = {
    'INGREDIENTS': '식자재',
    'SUPPLIES': '소모품'
  } as const;

  // 카테고리 아이콘 및 스타일
  const categoryConfig = {
    '식자재': {
      icon: '🥩',
      shortName: '식자재',
      bgColor: 'bg-emerald-100',
      textColor: 'text-emerald-700',
      borderColor: 'border-emerald-200'
    },
    '소모품': {
      icon: '📦',
      shortName: '소모품',
      bgColor: 'bg-blue-100',
      textColor: 'text-blue-700',
      borderColor: 'border-blue-200'
    }
  } as const;

  // 우측 리스트 필터
  const [q, setQ] = useState("");
  const [filterCategory, setFilterCategory] = useState<"전체" | Category>("전체");
  const [onlyLow, setOnlyLow] = useState(false);
  const [employee, setEmployee] = useState("전체");
  const [rightTagQuery, setRightTagQuery] = useState("");
  const [activeTagFilters, setActiveTagFilters] = useState<string[]>([]);

  const employees = useMemo(() => Array.from(new Set(inventoryItems.map(i => i.updatedBy))), [inventoryItems]);
  const allTags = useMemo(() => {
    const tagMap = new Map();
    inventoryItems.flatMap(i => i.tags).forEach(tag => {
      tagMap.set(tag.id, tag);
    });
    return Array.from(tagMap.values());
  }, [inventoryItems]);
  const filteredRightTags = useMemo(() => allTags.filter(t => t.name.toLowerCase().includes(rightTagQuery.toLowerCase())), [allTags, rightTagQuery]);

  const statusOf = (i: InventoryItem) => i.currentStock < i.minStock ? "부족" : (i.currentStock < Math.ceil(i.minStock * 1.2) ? "주의" : "정상");

  const criticalItems = useMemo(() => inventoryItems.filter(i => statusOf(i) !== "정상"), [inventoryItems]);

  const filteredItems = useMemo(() => {
    return inventoryItems.filter(i => {
      const matchesQ = !q || i.name.toLowerCase().includes(q.toLowerCase()) || (i.supplier && i.supplier.toLowerCase().includes(q.toLowerCase()));
      const matchesCat = filterCategory === "전체" || i.category === filterCategory;
      const matchesOnlyLow = !onlyLow || i.currentStock < i.minStock;
      const matchesEmp = employee === "전체" || i.updatedBy === employee;
      const matchesTag = activeTagFilters.length === 0 || i.tags.some(t => activeTagFilters.includes(t.id));
      return matchesQ && matchesCat && matchesOnlyLow && matchesEmp && matchesTag;
    });
  }, [q, filterCategory, onlyLow, employee, activeTagFilters, inventoryItems]);

  // API 호출 함수들
  async function fetchInventoryItems() {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/inventory', { credentials: 'include' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '재고 조회 실패');
      
      // 백엔드에서 받은 영어 카테고리를 한글로 변환
      const items = Array.isArray(data) ? data : (data.items || []);
      const convertedItems = items.map((item: any) => ({
        ...item,
        category: categoryLabels[item.category as keyof typeof categoryLabels] || item.category
      }));
      
      setInventoryItems(convertedItems);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function fetchTags() {
    try {
      const res = await fetch('/api/admin/tags', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setTags(Array.isArray(data) ? data : []);
      }
    } catch (e) {
      console.error('태그 조회 실패:', e);
    }
  }

  async function createTag() {
    if (!newTagName.trim()) return;
    try {
      const res = await fetch('/api/admin/tags', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newTagName.trim(), color: newTagColor })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || '태그 생성 실패');
      setNewTagName('');
      setNewTagColor('#3B82F6');
      setShowTagModal(false);
      fetchTags();
      setSuccess('태그 생성 완료');
    } catch (e: any) {
      setError(e.message);
    }
  }

  const toggleSelectTag = (tagId: string) => {
    setSelectedTags(prev => prev.includes(tagId) ? prev.filter(x => x !== tagId) : [...prev, tagId]);
  };

  function resetForm() {
    setEditingId(null);
    setName('');
    setCategory('식자재');
    setUnit('');
    setCurrentStock(0);
    setMinStock(0);
    setSupplier('');
    setSelectedTags([]);
    setTagQuery('');
  }

  function startEdit(item: InventoryItem) {
    setEditingId(item.id);
    setName(item.name);
    setCategory(item.category); // 이미 한글로 변환된 상태
    setUnit(item.unit);
    setCurrentStock(item.currentStock);
    setMinStock(item.minStock);
    setSupplier(item.supplier || '');
    setSelectedTags(item.tags.map(tag => tag.id));
    setTagQuery('');
    
    // 폼으로 스크롤
    const formElement = document.querySelector('#inventory-form');
    if (formElement) {
      formElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  async function saveInventoryItem(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    
    if (!name.trim() || !unit.trim() || currentStock < 0 || minStock < 0) {
      setError('필수 필드를 올바르게 입력해주세요.');
      return;
    }

    try {
      const isEditing = !!editingId;
      const url = '/api/admin/inventory';
      const method = isEditing ? 'PUT' : 'POST';
      const body = {
        ...(isEditing && { id: editingId }),
        name: name.trim(),
        category: categoryMapping[category], // 한글을 영어로 변환
        unit: unit.trim(),
        currentStock,
        minStock,
        supplier: supplier.trim() || null,
        tags: selectedTags
      };

      const res = await fetch(url, {
        method,
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `재고 ${isEditing ? '수정' : '생성'} 실패`);

      resetForm();
      setSuccess(`재고 아이템이 ${isEditing ? '수정' : '생성'}되었습니다.`);
      fetchInventoryItems();
    } catch (e: any) {
      setError(e.message);
    }
  }

  async function deleteInventoryItem(id: string, name: string) {
    if (!confirm(`"${name}" 재고 아이템을 삭제하시겠습니까?`)) return;

    try {
      const res = await fetch(`/api/admin/inventory?id=${id}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || '재고 삭제 실패');

      setSuccess('재고 아이템이 삭제되었습니다.');
      fetchInventoryItems();
    } catch (e: any) {
      setError(e.message);
    }
  }

  useEffect(() => {
    fetchInventoryItems();
    fetchTags();
  }, []);

  useEffect(() => {
    if (success) setTimeout(() => setSuccess(''), 3000);
  }, [success]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            재고/구매 관리
          </h1>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}
        {success && (
          <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg">
            {success}
          </div>
        )}

      {/* 상단: 재고 업데이트 필요 */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-white/30 shadow-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
            재고 업데이트 필요
          </h2>
          {loading ? (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="mt-2 text-gray-600">로딩 중...</p>
            </div>
          ) : criticalItems.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-gray-600 font-medium">모든 재고가 정상입니다</p>
            </div>
          ) : (
            <div className="grid gap-3">
            {criticalItems.map(i => (
                <div key={`critical-${i.id}`} className="bg-white/70 rounded-xl border border-gray-200 p-4 flex items-center justify-between hover:shadow-md transition-shadow">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-gray-900">{i.name}</span>
                      {i.template && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-indigo-100 text-indigo-700 rounded-full">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          {i.template}
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-gray-600">
                      현재 <span className="font-medium text-gray-800">{i.currentStock}{i.unit}</span> / 
                      최소 <span className="font-medium text-gray-800">{i.minStock}{i.unit}</span>
                    </div>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {i.tags.map(tag => (
                        <span key={`critical-tag-${tag.id}`} className="px-2 py-1 text-xs rounded-full text-white" style={{ backgroundColor: tag.color }}>
                          {tag.name}
                        </span>
                      ))}
                    </div>
                  </div>
                  <span className={`px-3 py-1 text-sm font-medium rounded-full ${
                    statusOf(i) === '부족' 
                      ? 'bg-red-100 text-red-700 border border-red-200' 
                      : 'bg-amber-100 text-amber-700 border border-amber-200'
                  }`}>
                    {statusOf(i)}
                  </span>
                </div>
            ))}
            </div>
        )}
      </div>

        {/* 메인 영역: 좌측 생성/수정 툴(좁게), 우측 현황(넓게) */}
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
          {/* 좌측: 아이템 생성/수정 툴 (xl: 1/4) */}
          <div id="inventory-form" className="bg-white/90 backdrop-blur-sm rounded-2xl border border-white/40 shadow-xl p-6 space-y-5 xl:col-span-1">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${editingId ? 'bg-amber-500' : 'bg-blue-500'}`}></div>
                {editingId ? '재고 아이템 수정' : '재고 아이템 생성'}
              </h3>
              {editingId && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-3 py-1 text-xs bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
                >
                  취소
                </button>
              )}
            </div>
            <form onSubmit={saveInventoryItem} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">이름 *</label>
                  <input 
                    value={name} 
                    onChange={e=>setName(e.target.value)} 
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm text-gray-900 placeholder-gray-500 bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" 
                    placeholder="예: 치킨(냉동)" 
                    required
                  />
            </div>
            <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">카테고리 *</label>
                  <select 
                    value={category} 
                    onChange={e=>setCategory(e.target.value as Category)} 
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm text-gray-900 bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  >
                <option value="식자재">식자재</option>
                <option value="소모품">소모품</option>
              </select>
            </div>
            <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">단위 *</label>
                  <input 
                    value={unit} 
                    onChange={e=>setUnit(e.target.value)} 
                    placeholder="kg, 개, L 등" 
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm text-gray-900 placeholder-gray-500 bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" 
                    required
                  />
            </div>
            <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">현재 재고 *</label>
                  <input 
                    type="number" 
                    value={currentStock} 
                    onChange={e=>setCurrentStock(Number(e.target.value))} 
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm text-gray-900 bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" 
                    min="0"
                    step="0.1"
                    required
                  />
            </div>
            <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">최소 재고 *</label>
                  <input 
                    type="number" 
                    value={minStock} 
                    onChange={e=>setMinStock(Number(e.target.value))} 
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm text-gray-900 bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" 
                    min="0"
                    step="0.1"
                    required
                  />
            </div>
            <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">공급업체</label>
                  <input 
                    value={supplier} 
                    onChange={e=>setSupplier(e.target.value)} 
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm text-gray-900 placeholder-gray-500 bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" 
                    placeholder="예: Panasia" 
                  />
            </div>
          </div>

          {/* 태그 선택/추가 */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block text-sm font-medium text-gray-700">태그</label>
                  <button 
                    type="button" 
                    onClick={() => setShowTagModal(true)} 
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded-lg transition-colors"
                  >
                    태그 추가
                  </button>
                </div>
          <div className="space-y-2">
                  <input 
                    value={tagQuery} 
                    onChange={e=>setTagQuery(e.target.value)} 
                    placeholder="태그 검색" 
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-500 bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" 
                  />
            {/* 선택된 태그 */}
                  <div className="min-h-[40px] flex flex-wrap gap-2 p-3 rounded-lg bg-gray-50 border border-gray-200">
              {selectedTags.length === 0 ? (
                      <span className="text-sm text-gray-500">선택된 태그가 없습니다.</span>
                    ) : (
                      selectedTags.map(tagId => {
                        const tag = tags.find(t => t.id === tagId);
                        return tag ? (
                          <button 
                            key={`selected-${tagId}`} 
                            type="button" 
                            onClick={()=>toggleSelectTag(tagId)} 
                            className="px-3 py-1 text-sm rounded-full text-white hover:opacity-80 transition-opacity flex items-center gap-1"
                            style={{ backgroundColor: tag.color }}
                          >
                            {tag.name} 
                            <span className="text-xs">×</span>
                          </button>
                        ) : null;
                      })
              )}
            </div>
            {/* 사용 가능한 태그 */}
                  <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                    {filteredTags.map(tag => (
                      <button 
                        key={`available-${tag.id}`} 
                        type="button" 
                        onClick={()=>toggleSelectTag(tag.id)} 
                        className={`px-3 py-1.5 text-sm rounded-full border transition-all ${
                          selectedTags.includes(tag.id) 
                            ? 'text-white border-transparent' 
                            : 'text-gray-700 border-gray-300 hover:border-gray-400'
                        }`}
                        style={{ 
                          backgroundColor: selectedTags.includes(tag.id) ? tag.color : 'white',
                          borderColor: selectedTags.includes(tag.id) ? tag.color : undefined
                        }}
                      >
                        {tag.name}
                      </button>
                    ))}
                  </div>
            </div>
          </div>

          <div className="pt-2">
                <button 
                  type="submit"
                  className={`w-full px-6 py-3 rounded-xl text-white font-medium transition-all transform hover:scale-[1.02] shadow-lg ${
                    editingId 
                      ? 'bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700' 
                      : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700'
                  }`}
                >
                  {editingId ? '재고 아이템 수정' : '재고 아이템 저장'}
                </button>
              </div>
            </form>
          </div>

          {/* 우측: 재고 현황 리스트 & 필터 (xl: 3/4) */}
          <div className="bg-white/90 backdrop-blur-sm rounded-2xl border border-white/40 shadow-xl p-6 space-y-5 xl:col-span-3">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              재고 현황
            </h3>
            
          {/* 필터 바 */}
            <div className="bg-gray-50/80 rounded-xl p-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3">
                <input 
                  value={q} 
                  onChange={e=>setQ(e.target.value)} 
                  placeholder="이름 또는 공급업체 검색" 
                  className="px-4 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-500 bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" 
                />
                <select 
                  value={filterCategory} 
                  onChange={e=>setFilterCategory(e.target.value as any)} 
                  className="px-4 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                >
                  <option value="전체">전체 카테고리</option>
              <option value="식자재">식자재</option>
              <option value="소모품">소모품</option>
            </select>
                <label className="inline-flex items-center gap-2 px-4 py-2.5 border border-gray-300 rounded-lg text-sm bg-white cursor-pointer hover:bg-gray-50 transition-colors">
                  <input 
                    type="checkbox" 
                    checked={onlyLow} 
                    onChange={e=>setOnlyLow(e.target.checked)} 
                    className="text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-gray-700">부족만 표시</span>
            </label>
                <select 
                  value={employee} 
                  onChange={e=>setEmployee(e.target.value)} 
                  className="px-4 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                >
                  <option value="전체">전체 직원</option>
              {employees.map((emp, idx) => <option key={`employee-${idx}-${emp}`} value={emp}>{emp}</option>)}
            </select>
                <input 
                  value={rightTagQuery} 
                  onChange={e=>setRightTagQuery(e.target.value)} 
                  placeholder="태그 검색" 
                  className="px-4 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-500 bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" 
                />
            </div>
              
          {/* 태그 필터 칩 */}
          <div className="flex flex-wrap gap-2">
                {filteredRightTags.map((tag, index) => {
                  const active = activeTagFilters.includes(tag.id);
              return (
                    <button 
                      key={`filter-${index}-${tag.id}`} 
                      type="button" 
                      onClick={() => setActiveTagFilters(active ? activeTagFilters.filter(x=>x!==tag.id) : [...activeTagFilters, tag.id])} 
                      className={`px-3 py-1.5 text-sm rounded-full border transition-all ${
                        active 
                          ? 'text-white border-transparent' 
                          : 'text-gray-700 border-gray-300 hover:border-gray-400'
                      }`}
                      style={{ 
                        backgroundColor: active ? tag.color : 'white',
                        borderColor: active ? tag.color : undefined
                      }}
                    >
                      {tag.name}
                    </button>
              );
            })}
            {activeTagFilters.length > 0 && (
                  <button 
                    type="button" 
                    onClick={()=>setActiveTagFilters([])} 
                    className="px-3 py-1.5 text-sm rounded-full border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    필터 초기화
                  </button>
                )}
              </div>
          </div>

            {/* 리스트 */}
            {loading ? (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <p className="mt-2 text-gray-600">재고 데이터 로딩 중...</p>
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2M4 13h2m13-8l-4 4m0 0l-4-4m4 4V3" />
                  </svg>
                </div>
                <p className="text-gray-600 font-medium">등록된 재고가 없습니다</p>
                <p className="text-gray-500 text-sm mt-1">새로운 재고 아이템을 추가해보세요</p>
              </div>
            ) : (
              <>
                {/* 데스크탑 테이블 */}
                <div className="hidden lg:block overflow-auto rounded-xl border border-gray-200">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50/80">
                      <tr className="text-left text-gray-700 font-medium">
                        <th className="px-4 py-4 min-w-[200px]">아이템 정보</th>
                        <th className="px-3 py-4 w-28 text-center">구분</th>
                        <th className="px-3 py-4 min-w-[120px]">태그</th>
                        <th className="px-4 py-4 w-32 text-center">재고 현황</th>
                        <th className="px-3 py-4 w-20 text-center">상태</th>
                        <th className="px-4 py-4 min-w-[120px]">공급업체</th>
                        <th className="px-4 py-4 w-32 text-center">업데이트</th>
                        <th className="px-3 py-4 w-20 text-center">관리</th>
                </tr>
              </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredItems.map(item => {
                        const config = categoryConfig[item.category];
                        const status = statusOf(item);
                        return (
                          <tr key={`desktop-${item.id}`} className="hover:bg-gray-50/50 transition-colors">
                            {/* 아이템 정보 */}
                            <td className="px-4 py-4">
                              <div className="font-semibold text-gray-900 mb-1">{item.name}</div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-gray-500">{item.unit} 단위</span>
                                {item.template && (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-indigo-100 text-indigo-700 rounded-full">
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                    {item.template}
                                  </span>
                                )}
                              </div>
                            </td>
                            
                            {/* 구분 (카테고리) */}
                            <td className="px-3 py-4 text-center">
                              <div className="flex flex-col items-center gap-1">
                                <span className="text-lg">{config.icon}</span>
                                <span className={`px-3 py-1 text-xs font-medium rounded-full whitespace-nowrap ${config.bgColor} ${config.textColor}`}>
                                  {config.shortName}
                                </span>
                              </div>
                    </td>
                            
                            {/* 태그 */}
                            <td className="px-3 py-4">
                      <div className="flex flex-wrap gap-1">
                                {item.tags.slice(0, 2).map(tag => (
                                  <span 
                                    key={`desktop-tag-${tag.id}`} 
                                    className="px-2 py-0.5 text-xs rounded-full text-white"
                                    style={{ backgroundColor: tag.color }}
                                  >
                                    {tag.name}
                                  </span>
                                ))}
                                {item.tags.length > 2 && (
                                  <span className="px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-600">
                                    +{item.tags.length - 2}
                                  </span>
                                )}
                              </div>
                            </td>
                            
                            {/* 재고 현황 (현재/최소 통합) */}
                            <td className="px-4 py-4 text-center">
                              <div className="space-y-1">
                                <div className="font-semibold text-gray-900">
                                  {item.currentStock} / {item.minStock}
                                </div>
                                <div className="text-xs text-gray-500">{item.unit}</div>
                              </div>
                            </td>
                            
                            {/* 상태 */}
                            <td className="px-3 py-4 text-center">
                              <div className="flex flex-col items-center gap-1">
                                <span className="text-lg">
                                  {status === '부족' ? '🔴' : status === '주의' ? '🟡' : '🟢'}
                                </span>
                                <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                                  status === '부족' 
                                    ? 'bg-red-100 text-red-700' 
                                    : status === '주의'
                                    ? 'bg-amber-100 text-amber-700'
                                    : 'bg-green-100 text-green-700'
                                }`}>
                                  {status}
                                </span>
                              </div>
                            </td>
                            
                            {/* 공급업체 */}
                            <td className="px-4 py-4">
                              <div className="text-gray-700 truncate" title={item.supplier || '미지정'}>
                                {item.supplier || '-'}
                      </div>
                    </td>
                            
                            {/* 업데이트 */}
                            <td className="px-4 py-4 text-center">
                              <div className="text-xs text-gray-700">{item.updatedAt.split(' ')[0]}</div>
                              <div className="text-xs text-gray-500">{item.updatedBy}</div>
                            </td>
                            
                            {/* 관리 (아이콘 버튼) */}
                            <td className="px-3 py-4">
                              <div className="flex items-center justify-center gap-1">
                                <button 
                                  onClick={() => startEdit(item)}
                                  className="p-2 rounded-lg border border-amber-300 text-amber-700 hover:bg-amber-50 transition-colors"
                                  title="수정"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                  </svg>
                                </button>
                                <button 
                                  onClick={() => deleteInventoryItem(item.id, item.name)}
                                  className="p-2 rounded-lg border border-red-300 text-red-700 hover:bg-red-50 transition-colors"
                                  title="삭제"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                </button>
                      </div>
                    </td>
                  </tr>
                        );
                      })}
              </tbody>
            </table>
          </div>

          {/* 모바일 카드 */}
                <div className="grid lg:hidden grid-cols-1 gap-4">
                  {filteredItems.map(item => (
                    <div key={`mobile-${item.id}`} className="rounded-xl border border-gray-200 bg-white/80 p-5 shadow-sm hover:shadow-md transition-shadow">
                {/* 상단: 이름 + 상태 */}
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="min-w-0 flex-1">
                          <div className="font-semibold text-gray-900 text-base leading-snug break-words">{item.name}</div>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                              item.category === '식자재' 
                                ? 'bg-emerald-100 text-emerald-700' 
                                : 'bg-blue-100 text-blue-700'
                            }`}>
                              {item.category}
                            </span>
                            {item.template && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-indigo-100 text-indigo-700 rounded-full">
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                {item.template}
                              </span>
                            )}
                          </div>
                        </div>
                        <span className={`shrink-0 px-3 py-1 text-xs font-medium rounded-full ${
                          statusOf(item) === '부족' 
                            ? 'bg-red-100 text-red-700' 
                            : statusOf(item) === '주의'
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-green-100 text-green-700'
                        }`}>
                          {statusOf(item)}
                        </span>
                      </div>
                      
                      {/* 재고 정보 */}
                      <div className="grid grid-cols-2 gap-3 mb-3">
                        <div className="bg-gray-50 rounded-lg p-3 text-center">
                          <div className="text-xs text-gray-600 mb-1">현재 재고</div>
                          <div className="font-semibold text-gray-900">{item.currentStock} {item.unit}</div>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-3 text-center">
                          <div className="text-xs text-gray-600 mb-1">최소 재고</div>
                          <div className="font-semibold text-gray-900">{item.minStock} {item.unit}</div>
                        </div>
                      </div>

                      {/* 공급업체 */}
                      {item.supplier && (
                        <div className="mb-3">
                          <span className="text-xs text-gray-600">공급업체: </span>
                          <span className="text-sm text-gray-800">{item.supplier}</span>
                        </div>
                      )}

                      {/* 태그 */}
                      {item.tags.length > 0 && (
                        <div className="mb-3">
                          <div className="flex flex-wrap gap-1">
                            {item.tags.map(tag => (
                              <span 
                                key={`mobile-tag-${tag.id}`} 
                                className="px-2 py-1 text-xs rounded-full text-white"
                                style={{ backgroundColor: tag.color }}
                              >
                                {tag.name}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* 업데이트 정보 */}
                      <div className="text-xs text-gray-500 mb-3">
                        {item.updatedAt} • {item.updatedBy}
                      </div>

                      {/* 동작 버튼 */}
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => startEdit(item)}
                          className="flex-1 px-3 py-2 text-sm rounded-lg border border-amber-300 text-amber-700 hover:bg-amber-50 transition-colors"
                        >
                          수정
                        </button>
                        <button 
                          onClick={() => deleteInventoryItem(item.id, item.name)}
                          className="flex-1 px-3 py-2 text-sm rounded-lg border border-red-300 text-red-700 hover:bg-red-50 transition-colors"
                        >
                          삭제
                        </button>
                      </div>
                  </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* 태그 생성 모달 */}
        {showTagModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">새 태그 생성</h3>
                <button 
                  onClick={() => setShowTagModal(false)} 
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">태그 이름 *</label>
                  <input 
                    value={newTagName} 
                    onChange={(e)=>setNewTagName(e.target.value)} 
                    placeholder="예: 냉동식품" 
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" 
                    autoFocus
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">태그 색상</label>
                  <div className="flex items-center gap-3">
                    <input 
                      type="color" 
                      value={newTagColor} 
                      onChange={(e)=>setNewTagColor(e.target.value)} 
                      className="w-12 h-12 border border-gray-300 rounded-lg cursor-pointer" 
                    />
                    <input 
                      value={newTagColor} 
                      onChange={(e)=>setNewTagColor(e.target.value)} 
                      className="flex-1 px-4 py-3 border border-gray-300 rounded-xl text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" 
                      placeholder="#3B82F6"
                    />
                  </div>
                  <div className="mt-2 flex items-center gap-1">
                    <span className="text-xs text-gray-600">미리보기:</span>
                    <span 
                      className="px-3 py-1 text-xs rounded-full text-white"
                      style={{ backgroundColor: newTagColor }}
                    >
                      {newTagName || '태그 이름'}
                    </span>
                  </div>
                </div>
                
                <div className="flex gap-3 pt-2">
                  <button 
                    onClick={createTag}
                    disabled={!newTagName.trim()}
                    className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                  >
                    생성
                  </button>
                  <button 
                    onClick={()=>setShowTagModal(false)} 
                    className="flex-1 px-4 py-3 bg-gray-600 text-white rounded-xl font-medium hover:bg-gray-700 transition-colors"
                  >
                    취소
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
