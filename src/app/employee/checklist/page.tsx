"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

// 타입 정의
interface ChecklistTemplate {
  id: string;
  name: string;
  workplace: string;
  category: string;
  timeSlot: string;
  itemCount: number;
  completedCount?: number;
  totalProgress?: number;
  isCompleted?: boolean;
  dueTime?: string;
  status?: 'pending' | 'in_progress' | 'completed' | 'overdue';
  instanceId?: string | null;
}


export default function EmployeeChecklistPage() {
  const router = useRouter();
  
  const [checklists, setChecklists] = useState<ChecklistTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  
  // 필터 상태
  const [filters, setFilters] = useState({
    workplace: "",
    timeSlot: "",
    category: ""
  });


  // 옵션 정의
  const workplaceOptions = [
    { value: "HALL", label: "홀" },
    { value: "KITCHEN", label: "부엌" }
  ];

  const timeSlotOptions = [
    { value: "PREPARATION", label: "준비" },
    { value: "OPERATION", label: "진행" },
    { value: "CLOSING", label: "마감" }
  ];

  const categoryOptions = [
    { value: "CLEANING", label: "청소" },
    { value: "SAFETY", label: "안전" },
    { value: "INVENTORY", label: "재고" },
    { value: "EQUIPMENT", label: "장비" },
    { value: "SERVICE", label: "서비스" }
  ];

  // 데이터 로딩
  useEffect(() => {
    fetchChecklists();
  }, [filters]);

  const fetchChecklists = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filters.workplace) params.append('workplace', filters.workplace);
      if (filters.timeSlot) params.append('timeSlot', filters.timeSlot);
      if (filters.category) params.append('category', filters.category);

      const response = await fetch(`/api/employee/checklists?${params}`, {
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        setChecklists(data);
      } else {
        setError('체크리스트를 불러오는데 실패했습니다.');
      }
    } catch (error) {
      console.error('체크리스트 조회 오류:', error);
      setError('체크리스트를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };


  const handleChecklistClick = (checklist: ChecklistTemplate) => {
    if (checklist.instanceId) {
      router.push(`/employee/checklist/${checklist.instanceId}`);
    } else {
      alert('오늘 생성된 체크리스트 인스턴스가 없습니다.');
    }
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'completed': return 'bg-green-500';
      case 'in_progress': return 'bg-blue-500';
      case 'overdue': return 'bg-red-500';
      default: return 'bg-gray-400';
    }
  };

  const getStatusText = (status?: string) => {
    switch (status) {
      case 'completed': return '완료';
      case 'in_progress': return '진행중';
      case 'overdue': return '지연';
      default: return '대기';
    }
  };

  const clearFilters = () => {
    setFilters({
      workplace: "",
      timeSlot: "",
      category: ""
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50 p-3 sm:p-6">
      <div className="w-full max-w-6xl mx-auto">
        {/* 헤더 */}
        <div className="mb-8">
          <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-lg border border-white/20 p-6 sm:p-8">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
              📋 오늘의 체크리스트
            </h1>
            <p className="text-gray-600">
              할당된 체크리스트를 확인하고 작업을 완료하세요
            </p>
          </div>
        </div>


        {/* 필터 */}
        <div className="mb-6">
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-4 sm:p-6">
            <div className="flex flex-wrap items-center gap-4 mb-4">
              <h2 className="text-lg font-semibold text-gray-900">필터</h2>
              <button
                onClick={clearFilters}
                className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
              >
                초기화
              </button>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">근무지</label>
                <select
                  value={filters.workplace}
                  onChange={(e) => setFilters(prev => ({ ...prev, workplace: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-gray-900"
                >
                  <option value="">전체</option>
                  {workplaceOptions.map(option => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">시간대</label>
                <select
                  value={filters.timeSlot}
                  onChange={(e) => setFilters(prev => ({ ...prev, timeSlot: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-gray-900"
                >
                  <option value="">전체</option>
                  {timeSlotOptions.map(option => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">카테고리</label>
                <select
                  value={filters.category}
                  onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-gray-900"
                >
                  <option value="">전체</option>
                  {categoryOptions.map(option => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* 체크리스트 목록 */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-4 sm:p-6">
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="animate-pulse bg-gray-100 rounded-xl p-6 h-32"></div>
              ))}
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <div className="text-red-500 text-lg font-medium mb-2">⚠️ 오류 발생</div>
              <p className="text-gray-600">{error}</p>
              <button
                onClick={fetchChecklists}
                className="mt-4 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                다시 시도
              </button>
            </div>
          ) : checklists.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-4xl mb-4">📋</div>
              <div className="text-lg font-medium text-gray-700 mb-2">할당된 체크리스트가 없습니다</div>
              <p className="text-gray-500">현재 조건에 맞는 체크리스트가 없습니다.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {checklists.map((checklist) => (
                <div
                  key={checklist.id}
                  onClick={() => handleChecklistClick(checklist)}
                  className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md hover:border-green-200 transition-all duration-200 cursor-pointer group"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 group-hover:text-green-700 transition-colors">
                        {checklist.name}
                      </h3>
                      <div className="flex flex-wrap items-center gap-2 mt-2">
                        <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
                          {workplaceOptions.find(opt => opt.value === checklist.workplace)?.label || checklist.workplace}
                        </span>
                        <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-full">
                          {timeSlotOptions.find(opt => opt.value === checklist.timeSlot)?.label || checklist.timeSlot}
                        </span>
                        {/* 매뉴얼 연결된 주의사항 수 표기 */}
                        {typeof (checklist as any).manualConnectedPrecautions === 'number' && (checklist as any).manualConnectedPrecautions > 0 && (
                          <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">
                            매뉴얼 { (checklist as any).manualConnectedPrecautions }개
                          </span>
                        )}
                        <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full">
                          {categoryOptions.find(opt => opt.value === checklist.category)?.label || checklist.category}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <span className={`px-3 py-1 rounded-full text-sm font-medium text-white ${getStatusColor(checklist.status)}`}>
                        {getStatusText(checklist.status)}
                      </span>
                    </div>
                  </div>

                  {/* 진행률 */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
                      <span>진행률</span>
                      <span>{checklist.completedCount || 0} / {checklist.itemCount} 완료</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-green-500 h-2 rounded-full transition-all duration-300"
                        style={{
                          width: `${checklist.totalProgress || 0}%`
                        }}
                      ></div>
                    </div>
                  </div>

                  {/* 하단 정보 */}
                  <div className="flex items-center justify-between text-sm text-gray-500">
                    <span>총 {checklist.itemCount}개 항목</span>
                    {checklist.dueTime && (
                      <span>마감: {checklist.dueTime}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
