"use client";

import { useEffect, useMemo, useState } from "react";

interface EmployeeRow {
  id: string;
  name: string;
  employeeId: string;
  department: string;
  position: string;
  email?: string;
  isActive: boolean;
  isSuperAdmin: boolean;
}

const sampleEmployees: EmployeeRow[] = [
  { id: "1", name: "김사장", employeeId: "admin", department: "관리", position: "사장", email: "admin@demo.com", isActive: true, isSuperAdmin: true },
  { id: "2", name: "김직원", employeeId: "employee", department: "서빙", position: "직원", email: "employee@demo.com", isActive: true, isSuperAdmin: false },
  { id: "3", name: "이직원", employeeId: "s002", department: "주방", position: "조리", email: "cook@demo.com", isActive: true, isSuperAdmin: false },
  { id: "4", name: "박파트", employeeId: "s003", department: "홀", position: "파트", email: "hall@demo.com", isActive: false, isSuperAdmin: false },
];

export default function EmployeesPage() {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"all" | "active" | "inactive">("all");

  const filtered = useMemo(() => {
    return sampleEmployees.filter((e) => {
      const matchesQuery = [e.name, e.employeeId, e.department, e.position, e.email]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(query.toLowerCase()));
      const matchesStatus =
        status === "all" ? true : status === "active" ? e.isActive : !e.isActive;
      return matchesQuery && matchesStatus;
    });
  }, [query, status]);

  useEffect(() => {
    // 실제 API 연동은 추후 구현
  }, []);

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-2xl font-bold text-gray-900">직원 관리</h1>
        <div className="flex items-center gap-2">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="이름/직원ID/부서 검색"
            className="w-48 sm:w-64 px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-500 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">전체</option>
            <option value="active">재직</option>
            <option value="inactive">퇴직/비활성</option>
          </select>
          <button className="px-3 py-2 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-sm font-medium hover:opacity-95">직원 추가</button>
        </div>
      </div>

      {/* 데스크탑: 테이블, 모바일: 카드 */}
      <div className="hidden md:block bg-white/70 backdrop-blur-sm rounded-xl border border-white/20 overflow-hidden">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50/80">
            <tr className="text-left text-gray-600">
              <th className="px-4 py-3">이름</th>
              <th className="px-4 py-3">직원ID</th>
              <th className="px-4 py-3">부서</th>
              <th className="px-4 py-3">직책</th>
              <th className="px-4 py-3">이메일</th>
              <th className="px-4 py-3">상태</th>
              <th className="px-4 py-3">권한</th>
              <th className="px-4 py-3">동작</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((e) => (
              <tr key={e.id} className="border-t border-gray-100">
                <td className="px-4 py-3 font-medium text-gray-900">{e.name}</td>
                <td className="px-4 py-3 text-gray-700">{e.employeeId}</td>
                <td className="px-4 py-3 text-gray-700">{e.department}</td>
                <td className="px-4 py-3 text-gray-700">{e.position}</td>
                <td className="px-4 py-3 text-gray-700">{e.email}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 text-xs rounded-full ${e.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-700'}`}>
                    {e.isActive ? '재직' : '비활성'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 text-xs rounded-full ${e.isSuperAdmin ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                    {e.isSuperAdmin ? '관리자' : '직원'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <button className="px-2.5 py-1.5 text-xs rounded-lg border border-gray-300 text-gray-800 font-medium hover:bg-gray-100">수정</button>
                    <button className="px-2.5 py-1.5 text-xs rounded-lg border border-gray-300 text-gray-800 font-medium hover:bg-gray-100">비활성</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid md:hidden grid-cols-1 gap-3">
        {filtered.map((e) => (
          <div key={e.id} className="bg-white/70 backdrop-blur-sm rounded-xl border border-white/20 p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-semibold text-gray-900">{e.name} <span className="text-xs text-gray-500">({e.employeeId})</span></div>
                <div className="text-sm text-gray-600">{e.department} • {e.position}</div>
                {e.email && <div className="text-xs text-gray-500 mt-1">{e.email}</div>}
              </div>
              <div className="text-right space-y-1">
                <div>
                  <span className={`px-2 py-1 text-[11px] rounded-full ${e.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-700'}`}>
                    {e.isActive ? '재직' : '비활성'}
                  </span>
                </div>
                <div>
                  <span className={`px-2 py-1 text-[11px] rounded-full ${e.isSuperAdmin ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                    {e.isSuperAdmin ? '관리자' : '직원'}
                  </span>
                </div>
              </div>
            </div>
            <div className="mt-3 flex items-center gap-2">
              <button className="px-3 py-1.5 text-xs rounded-lg border border-gray-300 text-gray-800 font-medium hover:bg-gray-100">수정</button>
              <button className="px-3 py-1.5 text-xs rounded-lg border border-gray-300 text-gray-800 font-medium hover:bg-gray-100">비활성</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
