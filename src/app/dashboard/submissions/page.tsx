'use client';

import { useState, useEffect, useMemo } from 'react';
import useSWR from 'swr'
import { 
  CheckCircleIcon, 
  ClockIcon, 
  XCircleIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  CalendarIcon,
  UserIcon,
  ChartBarIcon,
  FunnelIcon
} from '@heroicons/react/24/outline';

interface Employee {
  id: string;
  name: string;
}

interface Template {
  id: string;
  name: string;
}

interface SubmissionProgress {
  totalMainItems: number;
  mainItems: number;
  totalConnectedItems: number;
  connectedItems: number;
  totalItems: number;
  completedItems: number;
  percentage: number;
}

interface SubmissionDetails {
  mainItems: Array<{
    id: string;
    content: string;
    instructions?: string;
    isCompleted: boolean;
    notes?: string;
  }>;
  connectedItems: Array<{
    id: string;
    title: string;
    isCompleted: boolean;
    notes?: string;
    itemType: string;
    itemId: string;
  }>;
}

interface Submission {
  id: string;
  date: string;
  templateId: string;
  templateName: string;
  employeeId: string;
  employeeName: string;
  workplace: string;
  timeSlot: string;
  category: string;
  isCompleted: boolean;
  isSubmitted: boolean;
  completedAt?: string;
  submittedAt?: string;
  completedBy?: string;
  progress: SubmissionProgress;
  details: SubmissionDetails;
}

interface SubmissionFilter {
  employeeId?: string;
  date?: string;
  startDate?: string;
  endDate?: string;
  templateId?: string;
  workplace?: string;
  timeSlot?: string;
  isCompleted?: boolean;
  isSubmitted?: boolean;
}

export default function SubmissionsPage() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [filters, setFilters] = useState<SubmissionFilter>({});

  // 제출내역 조회(SWR)
  const qs = useMemo(()=>{
    const params = new URLSearchParams();
    if (filters.employeeId) params.append('employeeId', filters.employeeId);
    if (filters.date) params.append('date', filters.date);
    if (filters.startDate) params.append('startDate', filters.startDate);
    if (filters.endDate) params.append('endDate', filters.endDate);
    if (filters.templateId) params.append('templateId', filters.templateId);
    if (filters.workplace) params.append('workplace', filters.workplace);
    if (filters.timeSlot) params.append('timeSlot', filters.timeSlot);
    if (filters.isCompleted !== undefined) params.append('isCompleted', filters.isCompleted.toString());
    if (filters.isSubmitted !== undefined) params.append('isSubmitted', filters.isSubmitted.toString());
    return params.toString();
  }, [filters])

  const fetcher = (url: string) => fetch(url, { credentials: 'include' }).then(async r=>{
    if (!r.ok) throw new Error('제출내역 조회에 실패했습니다.')
    return r.json()
  })
  const { data: swrData, isLoading: swrLoading, error: swrError } = useSWR(`/api/admin/submissions?${qs}`, fetcher, { revalidateOnFocus: false, dedupingInterval: 15000 })

  // 직원 목록 조회
  const fetchEmployees = async () => {
    try {
      const response = await fetch('/api/admin/employees', {
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        setEmployees(data);
      }
    } catch (error) {
      console.error('직원 목록 조회 실패:', error);
    }
  };

  // 템플릿 목록 조회
  const fetchTemplates = async () => {
    try {
      const response = await fetch('/api/admin/checklists', {
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        setTemplates(data);
      }
    } catch (error) {
      console.error('템플릿 목록 조회 실패:', error);
    }
  };

  // 상세 보기 토글
  const toggleExpansion = (id: string) => {
    setExpandedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  // 통계 계산
  const calculateStats = () => {
    const total = submissions.length;
    const completed = submissions.filter(s => s.isCompleted).length;
    const submitted = submissions.filter(s => s.isSubmitted).length;
    const inProgress = submissions.filter(s => !s.isSubmitted).length;
    const today = submissions.filter(s => s.date === new Date().toISOString().split('T')[0]).length;
    const uniqueEmployees = new Set(submissions.map(s => s.employeeId)).size;
    
    return {
      total,
      completed,
      submitted,
      inProgress,
      completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
      today,
      uniqueEmployees
    };
  };

  // 상태 아이콘 및 색상
  const getStatusIcon = (isCompleted: boolean, isSubmitted: boolean) => {
    if (isCompleted) {
      return { icon: CheckCircleIcon, color: 'text-green-600', bgColor: 'bg-green-100' };
    } else if (isSubmitted) {
      return { icon: ClockIcon, color: 'text-yellow-600', bgColor: 'bg-yellow-100' };
    } else {
      return { icon: XCircleIcon, color: 'text-red-600', bgColor: 'bg-red-100' };
    }
  };

  // 위치 및 시간대 라벨
  const getWorkplaceLabel = (workplace: string) => {
    const labels: Record<string, string> = {
      'HALL': '홀',
      'KITCHEN': '주방',
      'COMMON': '공통'
    };
    return labels[workplace] || workplace;
  };

  const getTimeSlotLabel = (timeSlot: string) => {
    const labels: Record<string, string> = {
      'MORNING': '오전',
      'AFTERNOON': '오후',
      'EVENING': '저녁',
      'CLOSING': '마감',
      'PREPARATION': '준비',
      'COMMON': '공통'
    };
    return labels[timeSlot] || timeSlot;
  };

  // 필터 초기화
  const clearFilters = () => {
    setFilters({});
  };

  useEffect(() => {
    fetchEmployees();
    fetchTemplates();
  }, []);

  useEffect(() => {
    if (swrData) setSubmissions(swrData)
    if (swrError) setError(String(swrError.message||'조회 실패'))
    setLoading(swrLoading)
  }, [swrData, swrError, swrLoading])

  const stats = calculateStats();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-20 bg-gray-200 rounded"></div>
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
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">📊 전체 제출내역</h1>
          <p className="text-gray-600">모든 직원의 체크리스트 제출 현황을 확인할 수 있습니다.</p>
        </div>

        {/* 통계 카드 */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">📊 전체 현황</h2>
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
            <div className="text-center">
              <div className="flex items-center justify-center mb-2">
                <ChartBarIcon className="w-8 h-8 text-blue-600" />
              </div>
              <p className="text-sm font-medium text-gray-600">전체</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total}개</p>
            </div>

            <div className="text-center">
              <div className="flex items-center justify-center mb-2">
                <CheckCircleIcon className="w-8 h-8 text-green-600" />
              </div>
              <p className="text-sm font-medium text-gray-600">제출 완료</p>
              <p className="text-2xl font-bold text-gray-900">{stats.submitted}개</p>
            </div>

            <div className="text-center">
              <div className="flex items-center justify-center mb-2">
                <ClockIcon className="w-8 h-8 text-yellow-600" />
              </div>
              <p className="text-sm font-medium text-gray-600">작성 중</p>
              <p className="text-2xl font-bold text-gray-900">{stats.inProgress}개</p>
            </div>

            <div className="text-center">
              <div className="flex items-center justify-center mb-2">
                <UserIcon className="w-8 h-8 text-purple-600" />
              </div>
              <p className="text-sm font-medium text-gray-600">활성 직원</p>
              <p className="text-2xl font-bold text-gray-900">{stats.uniqueEmployees}명</p>
            </div>

            <div className="text-center">
              <div className="flex items-center justify-center mb-2">
                <XCircleIcon className="w-8 h-8 text-red-600" />
              </div>
              <p className="text-sm font-medium text-gray-600">미완료</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total - stats.completed}개</p>
            </div>

            <div className="text-center">
              <div className="flex items-center justify-center mb-2">
                <CalendarIcon className="w-8 h-8 text-pink-600" />
              </div>
              <p className="text-sm font-medium text-gray-600">오늘</p>
              <p className="text-2xl font-bold text-gray-900">{stats.today}개</p>
            </div>
          </div>
        </div>

        {/* 필터 */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <FunnelIcon className="w-5 h-5" />
              필터
            </h2>
            <button
              onClick={clearFilters}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              초기화
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div>
              <label className="block text-sm font-bold text-gray-800 mb-2">직원</label>
              <select
                value={filters.employeeId || ''}
                onChange={(e) => setFilters(prev => ({ ...prev, employeeId: e.target.value || undefined }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent font-bold text-gray-900"
              >
                <option value="">전체 직원</option>
                {employees.map(employee => (
                  <option key={employee.id} value={employee.id}>
                    {employee.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-800 mb-2">템플릿</label>
              <select
                value={filters.templateId || ''}
                onChange={(e) => setFilters(prev => ({ ...prev, templateId: e.target.value || undefined }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent font-bold text-gray-900"
              >
                <option value="">전체 템플릿</option>
                {templates.map(template => (
                  <option key={template.id} value={template.id}>
                    {template.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-800 mb-2">시작 날짜</label>
              <input
                type="date"
                value={filters.startDate || ''}
                onChange={(e) => setFilters(prev => ({ ...prev, startDate: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent font-bold text-gray-900"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-800 mb-2">종료 날짜</label>
              <input
                type="date"
                value={filters.endDate || ''}
                onChange={(e) => setFilters(prev => ({ ...prev, endDate: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent font-bold text-gray-900"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-800 mb-2">제출 상태</label>
              <select
                value={filters.isSubmitted?.toString() || ''}
                onChange={(e) => setFilters(prev => ({ 
                  ...prev, 
                  isSubmitted: e.target.value === '' ? undefined : e.target.value === 'true'
                }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent font-bold text-gray-900"
              >
                <option value="">전체</option>
                <option value="true">제출 완료</option>
                <option value="false">작성 중</option>
              </select>
            </div>
          </div>
        </div>

        {/* 제출내역 목록 */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-4 sm:p-6 border-b border-gray-200">
            <h2 className="text-base sm:text-lg font-semibold text-gray-900">제출내역 ({submissions.length}개)</h2>
          </div>

          {error && (
            <div className="p-4 sm:p-6">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-800">{error}</p>
              </div>
            </div>
          )}

          <div className="divide-y divide-gray-200">
            {submissions.length === 0 ? (
              <div className="p-4 sm:p-6 text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <ChartBarIcon className="w-8 h-8 text-gray-400" />
                </div>
                <p className="text-gray-500 font-medium">제출내역이 없습니다</p>
                <p className="text-sm text-gray-400 mt-1">체크리스트가 생성되고 제출되면 여기에 표시됩니다</p>
              </div>
            ) : (
              submissions.map((submission) => {
                const statusInfo = getStatusIcon(submission.isCompleted, submission.isSubmitted);
                const StatusIcon = statusInfo.icon;
                const progressRate = submission.progress.percentage;

                return (
                  <div key={submission.id} className={`p-4 sm:p-6 ${
                    (() => {
                      const today = new Date().toISOString().split('T')[0];
                      const isPast = submission.date < today;
                      const isNotSubmitted = !submission.isSubmitted;
                      return isPast && isNotSubmitted ? 'bg-pink-50 border-l-4 border-pink-300' : '';
                    })()
                  }`}>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        {/* 상태 표시 */}
                        <div className="mb-2">
                          {(() => {
                            const today = new Date().toISOString().split('T')[0];
                            const isPast = submission.date < today;
                            const isNotSubmitted = !submission.isSubmitted;
                            
                            if (isPast && isNotSubmitted) {
                              return (
                                <div className="inline-flex items-center gap-2 px-3 py-1 bg-pink-100 text-pink-800 rounded-full text-sm font-medium">
                                  ⚠️ 지난 날짜 미제출
                                </div>
                              );
                            } else if (submission.isSubmitted) {
                              return (
                                <div className="inline-flex items-center gap-2 px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                                  ✅ 제출 완료
                                </div>
                              );
                            } else if (progressRate === 0) {
                              return (
                                <div className="inline-flex items-center gap-2 px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-sm font-medium">
                                  ⭕ 미시작
                                </div>
                              );
                            } else if (progressRate === 100) {
                              return (
                                <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                                  ✅ 완료
                                </div>
                              );
                            } else {
                              return (
                                <div className="inline-flex items-center gap-2 px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm font-medium">
                                  🔄 작성 중
                                </div>
                              );
                            }
                          })()}
                        </div>

                        {/* 날짜 - 가장 눈에 띄게 */}
                        <div className="mb-2 sm:mb-3">
                          {(() => {
                            const today = new Date().toISOString().split('T')[0];
                            const isToday = submission.date === today;
                            const isPast = submission.date < today;
                            
                            return (
                              <div className={`text-xl sm:text-2xl font-bold break-words ${
                                isToday ? 'text-blue-600' : 
                                isPast ? 'text-gray-500' : 'text-gray-700'
                              }`}>
                                {new Date(submission.date).toLocaleDateString('ko-KR', { 
                                  year: 'numeric', 
                                  month: 'long', 
                                  day: 'numeric',
                                  weekday: 'long'
                                })}
                              </div>
                            );
                          })()}
                        </div>

                        {/* 템플릿 정보 */}
                        <div className="flex items-start gap-3 mb-3">
                          <div className={`p-2 rounded-lg ${statusInfo.bgColor}`}>
                            <StatusIcon className={`w-5 h-5 ${statusInfo.color}`} />
                          </div>
                          <div className="min-w-0">
                            <h3 className="text-base sm:text-lg font-semibold text-gray-900 break-words">
                              {submission.templateName}
                            </h3>
                            <p className="text-xs sm:text-sm text-gray-600 mt-1">
                              👤 {submission.employeeName} • 📍 {getWorkplaceLabel(submission.workplace)} • ⏰ {getTimeSlotLabel(submission.timeSlot)}
                            </p>
                          </div>
                        </div>

                        {/* 제출 시간 */}
                        <div className="mb-2 sm:mb-3">
                          {submission.submittedAt ? (
                            <div className="text-xs sm:text-sm text-gray-600">
                              <span className="font-medium">제출 시간:</span> {new Date(submission.submittedAt).toLocaleString('ko-KR')}
                            </div>
                          ) : (
                            <div className="text-xs sm:text-sm text-gray-500">
                              아직 제출하지 않음
                            </div>
                          )}
                        </div>

                        <div className="mt-3">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs sm:text-sm font-medium text-gray-700">진행률:</span>
                            <span className="text-xs sm:text-sm text-gray-600">
                              {submission.progress.completedItems}/{submission.progress.totalItems} 항목 완료
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                              style={{ width: `${progressRate}%` }}
                            ></div>
                          </div>
                          <span className="text-[11px] sm:text-xs text-gray-500 mt-1">{progressRate}%</span>
                        </div>
                      </div>

                      {/* 액션 버튼 */}
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => toggleExpansion(submission.id)}
                          className="p-2 text-gray-400 hover:text-gray-600"
                        >
                          {expandedItems.has(submission.id) ? (
                            <ChevronDownIcon className="w-5 h-5" />
                          ) : (
                            <ChevronRightIcon className="w-5 h-5" />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* 상세 내용 */}
                    {expandedItems.has(submission.id) && (
                      <div className="mt-4 sm:pl-8 border-l-0 sm:border-l-2 border-gray-200">
                        <div className="space-y-4">
                          {/* 메인 항목 */}
                          {submission.details.mainItems.length > 0 && (
                            <div>
                              <h4 className="text-xs sm:text-sm font-semibold text-gray-800 mb-2">메인 항목</h4>
                              <div className="space-y-2">
                                {submission.details.mainItems.map((item) => (
                                  <div key={item.id} className="flex items-center gap-2">
                                    <div className={`w-2 h-2 rounded-full ${item.isCompleted ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                                    <span className={`text-xs sm:text-sm ${item.isCompleted ? 'text-gray-900' : 'text-gray-500'}`}>
                                      {item.content}
                                    </span>
                                    {item.notes && (
                                      <span className="text-[11px] sm:text-xs text-gray-400">({item.notes})</span>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* 연결된 항목 */}
                          {submission.details.connectedItems.length > 0 && (
                            <div>
                              <h4 className="text-xs sm:text-sm font-semibold text-gray-800 mb-2">연결된 항목</h4>
                              <div className="space-y-2">
                                {submission.details.connectedItems.map((item) => (
                                  <div key={item.id} className="flex items-center gap-2">
                                    <div className={`w-2 h-2 rounded-full ${item.isCompleted ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                                    <span className={`text-xs sm:text-sm ${item.isCompleted ? 'text-gray-900' : 'text-gray-500'}`}>
                                      {item.title}
                                    </span>
                                    {item.notes && (
                                      <span className="text-[11px] sm:text-xs text-gray-400">({item.notes})</span>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}