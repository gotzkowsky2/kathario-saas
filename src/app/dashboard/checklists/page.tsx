"use client";

import { useMemo, useState } from "react";

type Weekday = "월" | "화" | "수" | "목" | "금" | "토" | "일";

interface TemplateCard {
  id: string;
  name: string;
  location: "공용" | "주방" | "홀";
  category: "체크리스트" | "위생/안전";
  timeSlot: "준비" | "오픈" | "마감";
  autoGenerateEnabled: boolean;
  inputter: string;
  days: Weekday[];
  itemCount: number;
  lastUpdated: string; // YYYY-MM-DD
}

interface TodayInstance {
  id: string;
  name: string;
  location: string;
  timeSlot: string;
  due: string; // HH:mm
}

const templates: TemplateCard[] = [
  {
    id: "tpl-1",
    name: "주방 준비 기본",
    location: "주방",
    category: "체크리스트",
    timeSlot: "준비",
    autoGenerateEnabled: true,
    inputter: "관리자",
    days: ["월", "화", "수"],
    itemCount: 5,
    lastUpdated: "2025-09-08",
  },
  {
    id: "tpl-2",
    name: "주방 재고파악",
    location: "주방",
    category: "체크리스트",
    timeSlot: "마감",
    autoGenerateEnabled: true,
    inputter: "관리자",
    days: ["월", "화"],
    itemCount: 3,
    lastUpdated: "2025-09-08",
  },
  {
    id: "tpl-3",
    name: "홀 마감 기본",
    location: "홀",
    category: "체크리스트",
    timeSlot: "마감",
    autoGenerateEnabled: false,
    inputter: "관리자",
    days: ["토", "일"],
    itemCount: 15,
    lastUpdated: "2025-08-19",
  },
];

const todayInstances: TodayInstance[] = [
  { id: "ins-1", name: "주방 준비 기본", location: "주방", timeSlot: "준비", due: "08:30" },
  { id: "ins-2", name: "주방 재고파악", location: "주방", timeSlot: "마감", due: "21:30" },
];

const WEEKDAYS: Weekday[] = ["월", "화", "수", "목", "금", "토", "일"];

export default function ChecklistsPage() {
  // 검색/필터 상태 (동작은 추후 연동)
  const [q, setQ] = useState("");
  const [loc, setLoc] = useState("전체");
  const [category, setCategory] = useState("전체");
  const [time, setTime] = useState("전체");
  const [status, setStatus] = useState("활성");

  const filteredTemplates = useMemo(() => {
    return templates.filter((t) => {
      const matchesQ = !q || t.name.toLowerCase().includes(q.toLowerCase());
      const matchesLoc = loc === "전체" || t.location === loc;
      const matchesCat = category === "전체" || t.category === (category as any);
      const matchesTime = time === "전체" || t.timeSlot === (time as any);
      // 활성/비활성
      const matchesStatus = status === "전체" ? true : status === "활성" ? t.autoGenerateEnabled : !t.autoGenerateEnabled;
      return matchesQ && matchesLoc && matchesCat && matchesTime && matchesStatus;
    });
  }, [q, loc, category, time, status]);

  const weeklySummary = useMemo(() => {
    const map: Record<Weekday, TemplateCard[]> = { 월: [], 화: [], 수: [], 목: [], 금: [], 토: [], 일: [] };
    filteredTemplates.forEach((t) => t.days.forEach((d) => map[d].push(t)));
    return map;
  }, [filteredTemplates]);

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">체크리스트 템플릿</h1>
          <p className="text-gray-600 mt-1">체크리스트 템플릿을 관리하고 항목을 추가하세요</p>
        </div>
        <button className="px-3 py-2 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-sm font-medium hover:opacity-95">+ 새 템플릿</button>
      </div>

      {/* 검색/필터 */}
      <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-4 sm:p-5 border border-white/20 grid grid-cols-1 md:grid-cols-5 gap-3">
        <div>
          <label className="block text-xs text-gray-600 mb-1">검색</label>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="템플릿 이름 검색..." className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-500 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        </div>
        <div>
          <label className="block text-xs text-gray-600 mb-1">위치</label>
          <select value={loc} onChange={(e) => setLoc(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
            <option>전체</option>
            <option>공용</option>
            <option>주방</option>
            <option>홀</option>
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-600 mb-1">구분</label>
          <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
            <option>전체</option>
            <option>체크리스트</option>
            <option>위생/안전</option>
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-600 mb-1">시간</label>
          <select value={time} onChange={(e) => setTime(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
            <option>전체</option>
            <option>준비</option>
            <option>오픈</option>
            <option>마감</option>
          </select>
        </div>
        <div className="flex gap-2 items-end">
          <div className="flex-1">
            <label className="block text-xs text-gray-600 mb-1">상태</label>
            <select value={status} onChange={(e) => setStatus(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
              <option>활성</option>
              <option>비활성</option>
              <option>전체</option>
            </select>
          </div>
          <button onClick={() => { setQ(""); setLoc("전체"); setCategory("전체"); setTime("전체"); setStatus("활성"); }} className="h-10 mt-6 px-3 py-2 rounded-lg border border-gray-300 text-sm text-gray-800 hover:bg-gray-100">필터 초기화</button>
        </div>
      </div>

      {/* 요일별 반복 등록 요약 */}
      <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-4 border border-white/20">
        <h3 className="text-base font-semibold text-gray-900 mb-3">요일별 반복 등록 요약</h3>
        <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
          {WEEKDAYS.map((d) => (
            <div key={d} className="rounded-xl border border-gray-200 bg-white/60 p-3">
              <div className="text-sm font-medium text-gray-700 mb-2">{d}</div>
              <div className="space-y-2">
                {weeklySummary[d].length === 0 && (
                  <div className="text-xs text-gray-400">등록 없음</div>
                )}
                {weeklySummary[d].map((t) => (
                  <div key={t.id} className="text-xs text-white px-2 py-1 rounded bg-emerald-600 truncate">{t.name}</div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 템플릿 카드 리스트 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredTemplates.map((t) => (
          <div key={t.id} className="bg-white/70 backdrop-blur-sm rounded-2xl p-5 border border-white/20">
            <div className="text-lg font-semibold text-gray-900">{t.name}</div>
            <div className="mt-3 grid grid-cols-3 gap-2 max-w-md">
              <div className="text-xs text-gray-500">위치</div>
              <div className="col-span-2"><span className="text-xs px-2 py-1 rounded bg-blue-50 text-blue-700 border border-blue-100">{t.location}</span></div>
              <div className="text-xs text-gray-500">구분</div>
              <div className="col-span-2"><span className="text-xs px-2 py-1 rounded bg-emerald-50 text-emerald-700 border border-emerald-100">{t.category}</span></div>
              <div className="text-xs text-gray-500">시간</div>
              <div className="col-span-2"><span className="text-xs px-2 py-1 rounded bg-purple-50 text-purple-700 border border-purple-100">{t.timeSlot}</span></div>
            </div>
            <div className="mt-3 text-xs text-gray-600">항목 {t.itemCount}개 • {t.lastUpdated} 업데이트</div>
            <div className="mt-3 flex flex-wrap gap-2">
              {t.days.map((d) => (
                <span key={d} className="w-7 h-7 inline-flex items-center justify-center rounded-full bg-gray-100 text-gray-700 text-xs border">{d}</span>
              ))}
            </div>
            <div className="mt-4">
              <a href="#" className="inline-flex items-center justify-center w-full sm:w-auto px-4 py-2 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-sm font-medium hover:opacity-95">항목 관리하기</a>
            </div>
          </div>
        ))}
      </div>

      {/* 오늘 생성된 인스턴스 */}
      <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-4 border border-white/20">
        <h3 className="text-base font-semibold text-gray-900 mb-3">오늘 생성된 인스턴스</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {todayInstances.length === 0 && (
            <div className="text-sm text-gray-500">오늘 생성된 인스턴스가 없습니다.</div>
          )}
          {todayInstances.map((ins) => (
            <div key={ins.id} className="rounded-xl border border-gray-200 bg-white/60 p-4">
              <div className="font-medium text-gray-900">{ins.name}</div>
              <div className="text-xs text-gray-600 mt-1">{ins.location} • {ins.timeSlot}</div>
              <div className="text-xs text-gray-500 mt-2">예정 시간 {ins.due}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
