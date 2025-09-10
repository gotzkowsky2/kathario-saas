'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface ChecklistTemplate {
  id: string;
  name: string;
  workplace: string;
  category: string;
  timeSlot: string;
  itemCount: number;
  isActive: boolean;
  inputter: string;
  inputDate: string;
}

export default function ChecklistCreatorPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [templatesLoading, setTemplatesLoading] = useState(true);
  const [error, setError] = useState('');

  // 템플릿 목록
  const [templates, setTemplates] = useState<ChecklistTemplate[]>([]);
  const [selectedTemplates, setSelectedTemplates] = useState<string[]>([]);
  
  // 날짜 설정
  const [targetDate, setTargetDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0]; // YYYY-MM-DD 형식
  });

  // 필터
  const [filters, setFilters] = useState({
    workplace: '',
    category: '',
    timeSlot: '',
    search: ''
  });

  // 오늘 생성된 인스턴스 목록
  const [todayInstances, setTodayInstances] = useState<any[]>([]);

  const fetchTodayInstances = async () => {
    try {
      const res = await fetch(`/api/admin/checklist-instances?date=${targetDate}`, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setTodayInstances(data);
      }
    } catch (e) {
      // 무시
    }
  };

  const workplaceOptions = [
    { value: 'HALL', label: '홀' },
    { value: 'KITCHEN', label: '부엌' },
    { value: 'COMMON', label: '공통' }
  ];

  const categoryOptions = [
    { value: 'CHECKLIST', label: '체크리스트' },
    { value: 'PRECAUTIONS', label: '주의사항' },
    { value: 'HYGIENE', label: '위생규정' },
    { value: 'SUPPLIES', label: '부대용품' },
    { value: 'INGREDIENTS', label: '재료' },
    { value: 'MANUAL', label: '매뉴얼' }
  ];

  const timeSlotOptions = [
    { value: 'PREPARATION', label: '준비' },
    { value: 'IN_PROGRESS', label: '진행' },
    { value: 'CLOSING', label: '마감' },
    { value: 'COMMON', label: '공통' }
  ];

  // 템플릿 목록 조회
  useEffect(() => {
    fetchTemplates();
  }, []);

  useEffect(() => {
    fetchTodayInstances();
  }, [targetDate]);

  const fetchTemplates = async () => {
    try {
      setTemplatesLoading(true);
      const response = await fetch('/api/admin/checklists?status=ACTIVE', {
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        setTemplates(data);
      } else {
        setError('템플릿 목록을 불러오는데 실패했습니다.');
      }
    } catch (error) {
      console.error('템플릿 조회 오류:', error);
      setError('네트워크 오류가 발생했습니다.');
    } finally {
      setTemplatesLoading(false);
    }
  };

  // 템플릿 선택/해제
  const toggleTemplate = (templateId: string) => {
    setSelectedTemplates(prev => 
      prev.includes(templateId)
        ? prev.filter(id => id !== templateId)
        : [...prev, templateId]
    );
  };

  // 전체 선택/해제
  const toggleAllTemplates = () => {
    const filteredTemplates = getFilteredTemplates();
    const allSelected = filteredTemplates.every(template => 
      selectedTemplates.includes(template.id)
    );
    
    if (allSelected) {
      // 현재 필터된 템플릿들을 선택에서 제거
      setSelectedTemplates(prev => 
        prev.filter(id => !filteredTemplates.some(template => template.id === id))
      );
    } else {
      // 현재 필터된 템플릿들을 선택에 추가
      const newSelections = filteredTemplates
        .filter(template => !selectedTemplates.includes(template.id))
        .map(template => template.id);
      setSelectedTemplates(prev => [...prev, ...newSelections]);
    }
  };

  // 필터링된 템플릿 목록
  const getFilteredTemplates = () => {
    return templates.filter(template => {
      const matchesWorkplace = !filters.workplace || template.workplace === filters.workplace;
      const matchesCategory = !filters.category || template.category === filters.category;
      const matchesTimeSlot = !filters.timeSlot || template.timeSlot === filters.timeSlot;
      const matchesSearch = !filters.search || 
        template.name.toLowerCase().includes(filters.search.toLowerCase());
      
      return matchesWorkplace && matchesCategory && matchesTimeSlot && matchesSearch;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (selectedTemplates.length === 0) {
      setError('최소 하나의 템플릿을 선택해주세요.');
      return;
    }

    if (!targetDate) {
      setError('날짜를 선택해주세요.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/admin/checklist-instances', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          templateIds: selectedTemplates,
          date: targetDate
        }),
      });

      const data = await response.json();

      if (response.ok) {
        // 성공 메시지와 함께 체크리스트 관리 페이지로 이동
        await fetchTodayInstances();
        setSelectedTemplates([]);
        // 토스트 대용 간단 알림
        alert(data.message || '체크리스트가 생성되었습니다.');
      } else {
        setError(data.error || '체크리스트 인스턴스 생성에 실패했습니다.');
      }
    } catch (error) {
      console.error('체크리스트 인스턴스 생성 오류:', error);
      setError('네트워크 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const getWorkplaceLabel = (workplace: string) => {
    return workplaceOptions.find(opt => opt.value === workplace)?.label || workplace;
  };

  const getCategoryLabel = (category: string) => {
    return categoryOptions.find(opt => opt.value === category)?.label || category;
  };

  const getTimeSlotLabel = (timeSlot: string) => {
    return timeSlotOptions.find(opt => opt.value === timeSlot)?.label || timeSlot;
  };

  const filteredTemplates = getFilteredTemplates();

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50">
      <div className="container mx-auto px-4 py-8">
        {/* 헤더 */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                체크리스트 수동 입력
              </h1>
              <p className="text-gray-600">
                기존 템플릿을 선택하여 특정 날짜에 체크리스트를 생성하세요
              </p>
            </div>
            <button
              onClick={() => router.back()}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              ← 돌아가기
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* 날짜 선택 */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">날짜 설정</h2>
            
            <div className="max-w-md">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                체크리스트 생성 날짜 *
              </label>
              <input
                type="date"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                required
              />
              <p className="text-sm text-gray-500 mt-2">
                선택한 날짜에 체크리스트가 생성됩니다
              </p>
            </div>
          </div>

          {/* 필터 */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">템플릿 필터</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">검색</label>
                <input
                  type="text"
                  value={filters.search}
                  onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="템플릿 이름 검색..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">근무지</label>
                <select
                  value={filters.workplace}
                  onChange={(e) => setFilters(prev => ({ ...prev, workplace: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
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
                <label className="block text-sm font-medium text-gray-700 mb-2">카테고리</label>
                <select
                  value={filters.category}
                  onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
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
                <label className="block text-sm font-medium text-gray-700 mb-2">시간대</label>
                <select
                  value={filters.timeSlot}
                  onChange={(e) => setFilters(prev => ({ ...prev, timeSlot: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  <option value="">전체</option>
                  {timeSlotOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* 템플릿 선택 */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900">
                템플릿 선택 ({selectedTemplates.length}개 선택됨)
              </h2>
              {filteredTemplates.length > 0 && (
                <button
                  type="button"
                  onClick={toggleAllTemplates}
                  className="px-4 py-2 text-sm bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors"
                >
                  {filteredTemplates.every(template => selectedTemplates.includes(template.id))
                    ? '전체 해제' : '전체 선택'}
                </button>
              )}
            </div>

            {templatesLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className="animate-pulse">
                    <div className="h-20 bg-gray-200 rounded-xl"></div>
                  </div>
                ))}
              </div>
            ) : filteredTemplates.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-12 h-12 mx-auto mb-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c0 .621-.504 1.125-1.125 1.125H18a2.25 2.25 0 01-2.25-2.25V10.5M8.25 8.25V6.108" />
                </svg>
                조건에 맞는 템플릿이 없습니다
              </div>
            ) : (
              <div className="space-y-3">
                {filteredTemplates.map(template => (
                  <div
                    key={template.id}
                    className={`p-4 border-2 rounded-xl cursor-pointer transition-all ${
                      selectedTemplates.includes(template.id)
                        ? 'border-purple-500 bg-purple-50'
                        : 'border-gray-200 hover:border-purple-300 hover:bg-purple-25'
                    }`}
                    onClick={() => toggleTemplate(template.id)}
                  >
                    <div className="flex items-center gap-4">
                      <input
                        type="checkbox"
                        checked={selectedTemplates.includes(template.id)}
                        onChange={() => toggleTemplate(template.id)}
                        onClick={(e) => {
                          e.stopPropagation();
                        }}
                        className="w-5 h-5 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                      />
                      
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-medium text-gray-900">{template.name}</h3>
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-700 rounded-full">
                              {getWorkplaceLabel(template.workplace)}
                            </span>
                            <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-700 rounded-full">
                              {getCategoryLabel(template.category)}
                            </span>
                            <span className="px-2 py-1 text-xs font-medium bg-orange-100 text-orange-700 rounded-full">
                              {getTimeSlotLabel(template.timeSlot)}
                            </span>
                          </div>
                        </div>
                        <div className="text-sm text-gray-600">
                          {template.itemCount}개 항목 • {template.inputter} • {new Date(template.inputDate).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 에러 메시지 */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
              <div className="flex items-center gap-2 text-red-700">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                </svg>
                {error}
              </div>
            </div>
          )}

          {/* 오늘 생성된 체크리스트 미리보기 */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">오늘 생성된 체크리스트</h2>
              <button
                type="button"
                onClick={fetchTodayInstances}
                className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
              >
                새로고침
              </button>
            </div>
            {todayInstances.length === 0 ? (
              <div className="text-sm text-gray-500">오늘 생성된 체크리스트가 없습니다.</div>
            ) : (
              <ul className="space-y-2">
                {todayInstances.map((inst: any) => (
                  <li key={inst.id} className="flex items-center justify-between border border-gray-200 rounded-lg px-3 py-2">
                    <div className="flex items-center gap-2">
                      <span className="text-gray-800 font-medium">{inst.templateName}</span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">{getTimeSlotLabel(inst.timeSlot)}</span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">{getWorkplaceLabel(inst.workplace)}</span>
                    </div>
                    <div className="text-sm text-gray-600">{inst.completedCount}/{inst.itemCount}</div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* 제출 버튼 */}
          <div className="flex justify-end gap-4">
            <button
              type="button"
              onClick={() => router.back()}
              className="px-6 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors"
              disabled={loading}
            >
              취소
            </button>
            <button
              type="submit"
              disabled={loading || selectedTemplates.length === 0}
              className="px-6 py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              {loading && (
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              )}
              {loading ? '생성 중...' : `체크리스트 생성 (${selectedTemplates.length}개)`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
