"use client";
import { useEffect, useState } from "react";

interface Props {
  onClose: () => void;
  onAdded: () => Promise<void> | void;
  manualId: string;
  selectedPrecautionIds: string[];
}

export default function PrecautionQuickPicker({ onClose, onAdded, manualId, selectedPrecautionIds }: Props) {
  const [list, setList] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/precautions', { credentials: 'include', cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setList(Array.isArray(data) ? data : (data.precautions || []));
        setError(null);
      } else {
        setError('목록을 불러오지 못했습니다');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  // 메뉴얼에 주의사항 연결 추가
  const handleSelect = async (id: string) => {
    try {
      const res = await fetch('/api/admin/manuals', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ 
          id: manualId, 
          selectedPrecautions: Array.from(new Set([...(selectedPrecautionIds || []), id])) 
        })
      });
      if (!res.ok) {
        console.error('manual link add failed', await res.text());
      }
    } catch (e) {
      console.error('link add error', e);
    } finally {
      await onAdded();
      onClose();
    }
  };

  // 이미 연결된 주의사항인지 확인
  const isAlreadyConnected = (id: string) => {
    return selectedPrecautionIds.includes(id);
  };

  return (
    <div>
      {loading ? (
        <div className="text-sm text-gray-500">불러오는 중...</div>
      ) : error ? (
        <div className="text-sm text-red-600">{error}</div>
      ) : (
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {list.map((p) => (
            <button
              key={p.id}
              onClick={() => handleSelect(p.id)}
              disabled={isAlreadyConnected(p.id)}
              className={`w-full text-left p-3 border rounded transition-colors ${
                isAlreadyConnected(p.id) 
                  ? 'bg-gray-100 border-gray-300 text-gray-500 cursor-not-allowed' 
                  : 'hover:bg-gray-50 border-gray-200'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className={`text-sm font-medium ${
                    isAlreadyConnected(p.id) ? 'text-gray-500' : 'text-gray-900'
                  }`}>
                    {p.title}
                  </div>
                  <div className={`text-xs mt-1 line-clamp-2 ${
                    isAlreadyConnected(p.id) ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                    {p.content}
                  </div>
                </div>
                {isAlreadyConnected(p.id) && (
                  <span className="ml-2 px-2 py-1 text-xs bg-gray-200 text-gray-600 rounded">
                    연결됨
                  </span>
                )}
              </div>
            </button>
          ))}
          {list.length === 0 && (
            <div className="text-sm text-gray-500 text-center py-4">등록된 주의사항이 없습니다.</div>
          )}
        </div>
      )}
    </div>
  );
}

