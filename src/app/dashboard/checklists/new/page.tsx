"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Save } from "lucide-react";

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

export default function NewTemplatePage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: "",
    workplace: "HALL",
    category: "CHECKLIST",
    timeSlot: "PREPARATION",
    autoGenerateEnabled: false,
    recurrenceDays: [] as number[],
    generationTime: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      setError("템플릿 이름을 입력해주세요.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/admin/checklists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        // 성공 시 템플릿 목록으로 이동
        router.push("/dashboard/checklists");
      } else {
        setError(data.error || "템플릿 등록에 실패했습니다.");
      }
    } catch (error) {
      setError("서버 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const generateTemplateName = () => {
    const workplaceLabel = workplaceOptions.find(opt => opt.value === formData.workplace)?.label || "";
    const timeSlotLabel = timeSlotOptions.find(opt => opt.value === formData.timeSlot)?.label || "";
    return `${workplaceLabel}, ${timeSlotLabel}`;
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-2xl mx-auto">
        {/* 헤더 */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <Link
              href="/dashboard/checklists"
              className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              title="목록으로 돌아가기"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">새 템플릿 등록</h1>
              <p className="text-gray-600 mt-2">체크리스트 템플릿의 기본 정보를 입력하세요</p>
            </div>
          </div>
        </div>

        {/* 등록 폼 */}
        <div className="bg-white rounded-lg shadow p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* 템플릿 이름 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                템플릿 이름 *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="예: 주방, 준비"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder-gray-500"
                required
              />
              <p className="text-sm text-gray-500 mt-1">
                자동 생성: {generateTemplateName()}
              </p>
            </div>

            {/* 위치, 구분, 시간 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  위치 *
                </label>
                <select
                  value={formData.workplace}
                  onChange={(e) => setFormData({ ...formData, workplace: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                  required
                >
                  {workplaceOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  구분 *
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                  required
                >
                  {categoryOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  시간 *
                </label>
                <select
                  value={formData.timeSlot}
                  onChange={(e) => setFormData({ ...formData, timeSlot: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                  required
                >
                  {timeSlotOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* 반복 생성 설정 */}
            <div className="border-t border-gray-200 pt-6">
              <h3 className="text-lg font-semibold mb-4 text-gray-900">반복 생성 설정</h3>
              <div className="space-y-4">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.autoGenerateEnabled}
                    onChange={(e) => setFormData({ ...formData, autoGenerateEnabled: e.target.checked })}
                    className="h-4 w-4"
                  />
                  <span className="text-sm text-gray-700">자동 생성 활성화</span>
                </label>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">반복 요일</label>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { idx: 0, label: '일' },
                      { idx: 1, label: '월' },
                      { idx: 2, label: '화' },
                      { idx: 3, label: '수' },
                      { idx: 4, label: '목' },
                      { idx: 5, label: '금' },
                      { idx: 6, label: '토' },
                    ].map((d) => {
                      const active = formData.recurrenceDays.includes(d.idx);
                      return (
                        <button
                          key={d.idx}
                          type="button"
                          disabled={!formData.autoGenerateEnabled}
                          onClick={() => {
                            const cur = new Set(formData.recurrenceDays);
                            if (cur.has(d.idx)) {
                              cur.delete(d.idx);
                            } else {
                              cur.add(d.idx);
                            }
                            setFormData({ ...formData, recurrenceDays: Array.from(cur).sort() });
                          }}
                          className={`px-3 py-1 rounded-full text-sm border transition-colors ${
                            active 
                              ? 'bg-blue-600 text-white border-blue-600' 
                              : 'bg-gray-50 text-gray-700 border-gray-300 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed'
                          }`}
                        >
                          {d.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">생성 시각 (선택)</label>
                  <input
                    type="time"
                    disabled={!formData.autoGenerateEnabled}
                    value={formData.generationTime}
                    onChange={(e) => setFormData({ ...formData, generationTime: e.target.value })}
                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                </div>

                <p className="text-xs text-gray-500">시각 미설정 시 기본 00:05에 생성됩니다.</p>
              </div>
            </div>

            {/* 에러 메시지 */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                {error}
              </div>
            )}

            {/* 버튼 */}
            <div className="flex gap-4 pt-6">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 inline-flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                <Save className="w-4 h-4 mr-2" />
                {loading ? "등록 중..." : "템플릿 등록"}
              </button>
              <Link
                href="/dashboard/checklists"
                className="flex-1 inline-flex items-center justify-center px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors"
              >
                취소
              </Link>
            </div>
          </form>
        </div>

        {/* 안내 */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="text-sm font-medium text-blue-900 mb-2">다음 단계</h3>
          <p className="text-sm text-blue-800">
            템플릿을 등록한 후, 해당 템플릿에서 체크리스트 항목들을 추가할 수 있습니다. 
            각 항목에는 재고, 주의사항, 메뉴얼 등을 연결할 수 있어요.
          </p>
        </div>
      </div>
    </div>
  );
}
