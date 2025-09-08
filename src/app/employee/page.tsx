"use client";

import { useEffect, useState } from "react";

interface EmployeeQuickAction {
  title: string;
  href: string;
  color: string;
}

export default function EmployeeHome() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/auth/me', { credentials: 'include' });
        if (res.ok) {
          const data = await res.json();
          setUser(data);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const quickActions: EmployeeQuickAction[] = [
    { title: '최신 업데이트', href: '/dashboard', color: 'from-cyan-500 to-teal-600' },
    { title: '재고 업데이트 필요', href: '/dashboard/inventory', color: 'from-amber-500 to-orange-600' },
    { title: '오늘의 체크리스트', href: '/dashboard/checklists', color: 'from-emerald-500 to-teal-600' },
    { title: '내 제출내역', href: '/dashboard/submissions', color: 'from-sky-500 to-blue-600' },
    { title: '주의사항', href: '/dashboard/precautions', color: 'from-rose-500 to-red-600' },
    { title: '재고관리', href: '/dashboard/inventory', color: 'from-indigo-500 to-purple-600' },
    { title: '매뉴얼', href: '/dashboard/manuals', color: 'from-fuchsia-500 to-pink-600' },
    { title: '즐겨찾기', href: '/dashboard/favorites', color: 'from-lime-500 to-green-600' },
  ];

  return (
    <div className="min-h-screen p-4 sm:p-6 bg-gradient-to-br from-emerald-50 to-teal-100">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* 헤더 */}
        <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-4 sm:p-6 border border-white/20">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
            {loading ? '로딩 중...' : `${user?.name ?? '직원'}님, 환영합니다!`}
          </h1>
          <p className="mt-1 text-sm sm:text-base text-gray-600">오늘 할 일을 확인하고 진행해 주세요.</p>
        </div>

        {/* 빠른 작업 (모바일 2열) */}
        <div>
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-3 sm:mb-4">빠른 작업</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
            {quickActions.map((a) => (
              <a key={a.title} href={a.href} className="group bg-white/70 backdrop-blur-sm rounded-xl p-3 sm:p-5 border border-white/20 hover:shadow-md transition">
                <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-gradient-to-br ${a.color} mb-2 sm:mb-3`} />
                <div className="text-[13px] sm:text-base text-gray-900 font-medium group-hover:text-teal-700 leading-tight">{a.title}</div>
                <div className="text-[11px] sm:text-sm text-gray-500 mt-0.5 sm:mt-1">바로 가기 →</div>
              </a>
            ))}
          </div>
        </div>

        {/* 최신 업데이트 */}
        <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-4 sm:p-6 border border-white/20">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900">최신 업데이트</h2>
            <a href="/dashboard" className="text-xs sm:text-sm text-teal-700 hover:underline">더 보기</a>
          </div>
          <div className="space-y-3">
            <div className="p-3 rounded-lg bg-white/60 border text-[13px] sm:text-sm text-gray-700">홀 청소 체크리스트 완료 • 5분 전</div>
            <div className="p-3 rounded-lg bg-white/60 border text-[13px] sm:text-sm text-gray-700">치킨 포장지 재고 부족 알림 • 15분 전</div>
            <div className="p-3 rounded-lg bg-white/60 border text-[13px] sm:text-sm text-gray-700">새 직원 등록 • 1시간 전</div>
          </div>
        </div>

        {/* 재고 업데이트 필요 */}
        <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-4 sm:p-6 border border-white/20">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900">재고 업데이트 필요</h2>
            <a href="/dashboard/inventory" className="text-xs sm:text-sm text-teal-700 hover:underline">재고로 이동</a>
          </div>
          <ul className="space-y-2">
            <li className="flex items-center justify-between text-[13px] sm:text-sm">
              <span className="text-gray-800">치킨 (냉동)</span>
              <span className="text-red-600 font-semibold">부족</span>
            </li>
            <li className="flex items-center justify-between text-[13px] sm:text-sm">
              <span className="text-gray-800">감자튀김</span>
              <span className="text-amber-600 font-semibold">주의</span>
            </li>
          </ul>
        </div>

        {/* 오늘의 체크리스트 (샘플) */}
        <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-4 sm:p-6 border border-white/20">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900">오늘의 체크리스트</h2>
            <a href="/dashboard/checklists" className="text-xs sm:text-sm text-teal-700 hover:underline">전체 보기</a>
          </div>
          <ul className="space-y-3">
            <li className="flex items-center gap-3">
              <input aria-label="task-1" type="checkbox" className="w-4 h-4" />
              <span className="text-[13px] sm:text-sm text-gray-800">오픈 전 매장 청소 상태 확인</span>
            </li>
            <li className="flex items-center gap-3">
              <input aria-label="task-2" type="checkbox" className="w-4 h-4" />
              <span className="text-[13px] sm:text-sm text-gray-800">재료 재고 확인 및 부족 항목 보고</span>
            </li>
            <li className="flex items-center gap-3">
              <input aria-label="task-3" type="checkbox" className="w-4 h-4" />
              <span className="text-[13px] sm:text-sm text-gray-800">주방 위생/온도 점검</span>
            </li>
          </ul>
        </div>

        {/* 내 제출내역 */}
        <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-4 sm:p-6 border border-white/20">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900">내 제출내역</h2>
            <a href="/dashboard/submissions" className="text-xs sm:text-sm text-teal-700 hover:underline">전체 보기</a>
          </div>
          <div className="space-y-3">
            <div className="p-3 rounded-lg bg-white/60 border text-[13px] sm:text-sm text-gray-700">오픈 준비 체크리스트 • 완료 • 오늘 08:45</div>
            <div className="p-3 rounded-lg bg-white/60 border text-[13px] sm:text-sm text-gray-700">재고 갱신 보고 • 제출 • 어제 18:10</div>
          </div>
        </div>

        {/* 주의사항 */}
        <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-4 sm:p-6 border border-white/20">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900">주의사항</h2>
            <a href="/dashboard/precautions" className="text-xs sm:text-sm text-teal-700 hover:underline">더 보기</a>
          </div>
          <ul className="list-disc pl-5 space-y-2">
            <li className="text-[13px] sm:text-sm text-gray-800">기름 교체 주기 준수</li>
            <li className="text-[13px] sm:text-sm text-gray-800">냉장/냉동 보관 온도 점검</li>
          </ul>
        </div>

        {/* 공지사항 (샘플) */}
        <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-4 sm:p-6 border border-white/20">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900">공지사항</h2>
            <a href="/dashboard/notices" className="text-xs sm:text-sm text-teal-700 hover:underline">더 보기</a>
          </div>
          <div className="space-y-3">
            <div className="p-3 rounded-lg bg-gray-50 border text-[13px] sm:text-sm text-gray-700">오늘 15시 전 직원 회의 예정입니다.</div>
            <div className="p-3 rounded-lg bg-gray-50 border text-[13px] sm:text-sm text-gray-700">야간 재고 점검 협조 바랍니다.</div>
          </div>
        </div>

        {/* 매뉴얼 & 즐겨찾기 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-4 sm:p-6 border border-white/20">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900">매뉴얼</h2>
              <a href="/dashboard/manuals" className="text-xs sm:text-sm text-teal-700 hover:underline">전체 보기</a>
            </div>
            <ul className="space-y-2">
              <li className="text-[13px] sm:text-sm text-gray-800">오픈 준비 매뉴얼</li>
              <li className="text-[13px] sm:text-sm text-gray-800">주방 위생 지침</li>
            </ul>
          </div>
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-4 sm:p-6 border border-white/20">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900">즐겨찾기</h2>
              <a href="/dashboard/favorites" className="text-xs sm:text-sm text-teal-700 hover:underline">관리</a>
            </div>
            <ul className="space-y-2">
              <li className="text-[13px] sm:text-sm text-gray-800">체크리스트 • 오픈 준비</li>
              <li className="text-[13px] sm:text-sm text-gray-800">재고 • 닭다리(냉동)</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}


