"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { Plus, Edit, Trash2, Eye, Copy } from "lucide-react";

interface ChecklistTemplate {
  id: string;
  name: string;
  workplace: string;
  category: string;
  timeSlot: string;
  inputter: string;
  inputDate: string;
  isActive: boolean;
  itemCount: number;
  autoGenerateEnabled?: boolean;
  recurrenceDays?: number[];
  generationTime?: string | null;
}

const workplaceOptions = [
  { value: "HALL", label: "홀" },
  { value: "KITCHEN", label: "주방" },
  { value: "COMMON", label: "공통" },
];

const categoryOptions = [
  { value: "CHECKLIST", label: "체크리스트" },
  { value: "PRECAUTIONS", label: "주의사항" },
  { value: "HYGIENE", label: "위생규정" },
  { value: "SUPPLIES", label: "부대용품" },
  { value: "INGREDIENTS", label: "재료" },
  { value: "COMMON", label: "공통" },
  { value: "MANUAL", label: "매뉴얼" },
];

const timeSlotOptions = [
  { value: "PREPARATION", label: "준비" },
  { value: "IN_PROGRESS", label: "진행" },
  { value: "CLOSING", label: "마감" },
  { value: "COMMON", label: "공통" },
];

export default function ChecklistsPage() {
  const [templates, setTemplates] = useState<ChecklistTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isCopying, setIsCopying] = useState(false);
  const [copyName, setCopyName] = useState('');
  const [copySourceId, setCopySourceId] = useState<string | null>(null);
  const [nameCheckLoading, setNameCheckLoading] = useState(false);
  const [nameError, setNameError] = useState('');

  // 필터링 상태
  const [searchTerm, setSearchTerm] = useState("");
  const [filterWorkplace, setFilterWorkplace] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterTimeSlot, setFilterTimeSlot] = useState("");
  const [filterStatus, setFilterStatus] = useState<'ACTIVE'|'INACTIVE'|'ALL'>(
    'ACTIVE'
  );

  useEffect(() => {
    fetchTemplates();
  }, [filterStatus]);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.set('status', filterStatus);
      const response = await fetch(`/api/admin/checklists?${params.toString()}`, {
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("템플릿 목록을 불러오는데 실패했습니다.");
      }

      const data = await response.json();
      setTemplates(data);
    } catch (error) {
      setError(error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("정말로 이 템플릿을 삭제하시겠습니까?")) {
      return;
    }

    try {
      setDeletingId(id);
      const response = await fetch(`/api/admin/checklists/${id}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("템플릿 삭제에 실패했습니다.");
      }

      setTemplates(templates.filter(template => template.id !== id));
    } catch (error) {
      setError(error instanceof Error ? error.message : "삭제 중 오류가 발생했습니다.");
    } finally {
      setDeletingId(null);
    }
  };

  const openCopyDialog = (id: string) => {
    setCopySourceId(id);
    setCopyName('');
    setNameError('');
    setIsCopying(true);
  };

  // 이름 중복 검사
  const checkNameDuplicate = async (name: string) => {
    if (!name.trim()) {
      setNameError('');
      return;
    }

    try {
      setNameCheckLoading(true);
      const existingTemplate = templates.find(t => t.name.toLowerCase() === name.trim().toLowerCase());
      if (existingTemplate) {
        setNameError('이미 존재하는 템플릿 이름입니다.');
      } else {
        setNameError('');
      }
    } catch (error) {
      console.error('이름 검사 오류:', error);
    } finally {
      setNameCheckLoading(false);
    }
  };

  // 복사 이름 변경 핸들러
  const handleCopyNameChange = (name: string) => {
    setCopyName(name);
    // 디바운스를 위한 타이머
    const timeoutId = setTimeout(() => {
      checkNameDuplicate(name);
    }, 300);
    return () => clearTimeout(timeoutId);
  };

  const handleCopy = async () => {
    if (!copySourceId || !copyName.trim()) return;
    if (nameError) {
      alert('템플릿 이름을 확인해주세요.');
      return;
    }
    try {
      const response = await fetch('/api/admin/checklists/copy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ sourceTemplateId: copySourceId, newName: copyName, includeItems: true, includeConnections: true })
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || '복사에 실패했습니다.');
      }
      const data = await response.json();
      // 새 템플릿을 목록에 반영 (모든 정보 포함)
      setTemplates(prev => [{
        id: data.template.id,
        name: data.template.name,
        workplace: data.template.workplace,
        category: data.template.category,
        timeSlot: data.template.timeSlot,
        inputter: data.template.inputter,
        inputDate: data.template.inputDate,
        isActive: data.template.isActive,
        itemCount: data.template.itemCount || 0,
        autoGenerateEnabled: data.template.autoGenerateEnabled || false,
        recurrenceDays: data.template.recurrenceDays || [],
        generationTime: data.template.generationTime
      }, ...prev]);
      setIsCopying(false);
      setCopySourceId(null);
      setCopyName('');
    } catch (e: any) {
      setError(e.message || '복사 중 오류가 발생했습니다.');
    }
  };

  const getWorkplaceLabel = (value: string) => {
    return workplaceOptions.find(option => option.value === value)?.label || value;
  };

  const getCategoryLabel = (value: string) => {
    return categoryOptions.find(option => option.value === value)?.label || value;
  };

  const getTimeSlotLabel = (value: string) => {
    return timeSlotOptions.find(option => option.value === value)?.label || value;
  };

  const clearFilters = () => {
    setSearchTerm("");
    setFilterWorkplace("");
    setFilterCategory("");
    setFilterTimeSlot("");
  };

  const filteredTemplates = templates.filter(template => {
    const matchesSearch = template.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesWorkplace = !filterWorkplace || template.workplace === filterWorkplace;
    const matchesCategory = !filterCategory || template.category === filterCategory;
    const matchesTimeSlot = !filterTimeSlot || template.timeSlot === filterTimeSlot;

    return matchesSearch && matchesWorkplace && matchesCategory && matchesTimeSlot;
  });

  // 시각적 구분을 위한 색상 팔레트 (템플릿별 고정 배정)
  const colorPalette = [
    { bg: 'bg-blue-600', text: 'text-white', border: 'border-blue-600' },
    { bg: 'bg-green-600', text: 'text-white', border: 'border-green-600' },
    { bg: 'bg-amber-600', text: 'text-white', border: 'border-amber-600' },
    { bg: 'bg-purple-600', text: 'text-white', border: 'border-purple-600' },
    { bg: 'bg-rose-600', text: 'text-white', border: 'border-rose-600' },
    { bg: 'bg-indigo-600', text: 'text-white', border: 'border-indigo-600' },
    { bg: 'bg-emerald-600', text: 'text-white', border: 'border-emerald-600' },
    { bg: 'bg-cyan-600', text: 'text-white', border: 'border-cyan-600' },
    { bg: 'bg-orange-600', text: 'text-white', border: 'border-orange-600' },
  ] as const;

  const colorIndexFor = (id: string) => {
    let sum = 0;
    for (let i = 0; i < id.length; i++) sum = (sum + id.charCodeAt(i)) % 9973;
    return sum % colorPalette.length;
  };

  if (loading) {
  return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="bg-white rounded-lg shadow p-6">
                  <div className="h-6 bg-gray-200 rounded w-3/4 mb-4"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* 헤더 */}
        <div className="flex justify-between items-center mb-8">
        <div>
            <h1 className="text-3xl font-bold text-gray-900">체크리스트 템플릿</h1>
            <p className="text-gray-600 mt-2">체크리스트 템플릿을 관리하고 항목을 추가하세요</p>
          </div>
          <Link
            href="/dashboard/checklists/new"
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-5 h-5 mr-2" />
            새 템플릿
          </Link>
        </div>

        {/* 필터 */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">검색</label>
              <input
                type="text"
                placeholder="템플릿 이름 검색..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder-gray-500"
              />
        </div>
        <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">위치</label>
              <select
                value={filterWorkplace}
                onChange={(e) => setFilterWorkplace(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
              >
                <option value="">전체</option>
                {workplaceOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
          </select>
        </div>
        <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">구분</label>
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
              >
                <option value="">전체</option>
                {categoryOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
          </select>
        </div>
        <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">시간</label>
              <select
                value={filterTimeSlot}
                onChange={(e) => setFilterTimeSlot(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
              >
                <option value="">전체</option>
                {timeSlotOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
          </select>
        </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">상태</label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as any)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
              >
                <option value="ACTIVE">활성</option>
                <option value="INACTIVE">비활성</option>
                <option value="ALL">전체</option>
            </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={clearFilters}
                className="w-full px-4 py-2 text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
              >
                필터 초기화
              </button>
            </div>
          </div>
        </div>

        {/* 주간 요약 (월~일) */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">요일별 반복 등록 요약</h2>
          {/* 데스크톱 */}
          <div className="hidden md:grid grid-cols-7 gap-2">
            {['월','화','수','목','금','토','일'].map((d, i) => (
              <div key={i} className="border rounded p-2 min-h-[100px]">
                <div className="text-sm font-medium text-gray-700 mb-2 text-center">{d}</div>
                <div className="space-y-1">
                  {templates
                    .filter(t => t.autoGenerateEnabled && (t.recurrenceDays || []).includes((i+1)%7))
                    .map(t => {
                      const ci = colorIndexFor(t.id);
                      const c = colorPalette[ci];
                      return (
                        <div key={`${t.id}-${i}`} className={`text-xs ${c.bg} ${c.text} rounded px-2 py-1 truncate shadow`} title={t.name}>
                          {t.name}
                        </div>
                      );
                    })}
      </div>
              </div>
            ))}
          </div>
          {/* 모바일 */}
          <div className="md:hidden space-y-2">
            {['월','화','수','목','금','토','일'].map((d, i) => (
              <div key={i} className="border rounded p-2">
                <div className="text-sm font-medium text-gray-700 mb-1">{d}</div>
                <div className="flex flex-wrap gap-1">
                  {templates
                    .filter(t => t.autoGenerateEnabled && (t.recurrenceDays || []).includes((i+1)%7))
                    .map(t => {
                      const ci = colorIndexFor(t.id);
                      const c = colorPalette[ci];
                      return (
                        <span key={`${t.id}-m-${i}`} className={`text-xs ${c.bg} ${c.text} rounded px-2 py-1 shadow`} title={t.name}>
                          {t.name}
                        </span>
                      );
                    })}
              </div>
            </div>
          ))}
        </div>
      </div>

        {/* 에러 메시지 */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {/* 템플릿 목록 */}
        {filteredTemplates.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <div className="text-gray-400 mb-4">
              <Plus className="w-16 h-16 mx-auto" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">템플릿이 없습니다</h3>
            <p className="text-gray-600 mb-6">새로운 체크리스트 템플릿을 만들어보세요</p>
            <Link
              href="/dashboard/checklists/new"
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-5 h-5 mr-2" />
              첫 템플릿 만들기
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTemplates.map((template) => (
              <div key={template.id} className="bg-white rounded-lg shadow hover:shadow-md transition-shadow">
                <div className="p-6">
                  {/* 제목 */}
                  <div className="mb-3">
                    <h3 className="text-lg font-semibold text-gray-900 line-clamp-2">
                      {template.name}
                    </h3>
                  </div>
                  
                  {/* 액션 버튼들 */}
                  <div className="flex justify-start space-x-2 mb-4">
                    <Link
                      href={`/dashboard/checklists/${template.id}/items`}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                      title="항목 관리"
                    >
                      <Eye className="w-4 h-4" />
                    </Link>
                    <Link
                      href={`/dashboard/checklists/${template.id}/edit`}
                      className="p-2 text-gray-600 hover:bg-gray-50 rounded-md transition-colors"
                      title="수정"
                    >
                      <Edit className="w-4 h-4" />
                    </Link>
                    <button
                      onClick={() => openCopyDialog(template.id)}
                      className="p-2 text-purple-600 hover:bg-purple-50 rounded-md transition-colors"
                      title="복사"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(template.id)}
                      disabled={deletingId === template.id}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-md transition-colors disabled:opacity-50"
                      title="삭제"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="space-y-2 mb-4">
                    <div className="flex items-center text-sm text-gray-600">
                      <span className="font-medium w-16">위치:</span>
                      <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">
                        {getWorkplaceLabel(template.workplace)}
                      </span>
                    </div>
                    <div className="flex items-center text-sm text-gray-600">
                      <span className="font-medium w-16">구분:</span>
                      <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs">
                        {getCategoryLabel(template.category)}
                      </span>
                    </div>
                    <div className="flex items-center text-sm text-gray-600">
                      <span className="font-medium w-16">시간:</span>
                      <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded text-xs">
                        {getTimeSlotLabel(template.timeSlot)}
                      </span>
                    </div>
                  </div>

                  <div className="flex justify-between items-center text-sm text-gray-500">
                    <span>항목 {template.itemCount}개</span>
                    <span>{new Date(template.inputDate).toLocaleDateString()}</span>
                  </div>

                  {/* 반복 요일 배지 */}
                  <div className="mt-3 flex flex-wrap gap-1">
                    {template.autoGenerateEnabled ? (
                      (template.recurrenceDays || []).length > 0 ? (
                        ['일','월','화','수','목','금','토'].map((label, idx) => {
                          const active = (template.recurrenceDays || []).includes(idx);
                          const ci = colorIndexFor(template.id);
                          const c = colorPalette[ci];
                          return (
                            <span
                              key={idx}
                              className={`px-2 py-0.5 rounded-full text-xs border ${active ? `${c.bg} ${c.text} ${c.border}` : 'text-gray-500 border-gray-300'}`}
                            >
                              {label}
                            </span>
                          );
                        })
                      ) : (
                        <span className="text-xs text-gray-500">반복 요일 없음</span>
                      )
                    ) : (
                      <span className="text-xs text-gray-400">자동 생성 비활성화</span>
                    )}
                  </div>

                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <Link
                      href={`/dashboard/checklists/${template.id}/items`}
                      className="w-full inline-flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                    >
                      항목 관리하기
                    </Link>
                  </div>
            </div>
            </div>
            ))}
          </div>
        )}
      </div>

      {/* 복사 모달 */}
      {isCopying && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">템플릿 복사</h3>
            <p className="text-sm text-gray-700 mb-4">새 템플릿 이름을 입력하세요. 항목과 연결 항목이 함께 복사됩니다.</p>
            <div className="space-y-2">
              <input
                type="text"
                value={copyName}
                onChange={(e) => handleCopyNameChange(e.target.value)}
                placeholder="새 템플릿 이름"
                className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder-gray-500 ${
                  nameError ? 'border-red-400' : 'border-gray-400'
                }`}
              />
              {nameCheckLoading && (
                <p className="text-xs text-blue-600">이름 확인 중...</p>
              )}
              {nameError && (
                <p className="text-xs text-red-600">{nameError}</p>
              )}
              {!nameError && copyName.trim() && !nameCheckLoading && (
                <p className="text-xs text-green-600">사용 가능한 이름입니다.</p>
              )}
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button 
                onClick={() => { 
                  setIsCopying(false); 
                  setCopySourceId(null); 
                  setCopyName(''); 
                  setNameError(''); 
                }} 
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                취소
              </button>
              <button 
                onClick={handleCopy} 
                disabled={!copyName.trim() || nameError || nameCheckLoading} 
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                복사
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}