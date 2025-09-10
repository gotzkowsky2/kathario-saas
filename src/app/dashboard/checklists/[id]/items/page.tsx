"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createPortal } from "react-dom";
import { ArrowLeft, Plus, Edit, Trash2, Link, X, ChevronUp, ChevronDown, MoreVertical, Eye } from 'lucide-react';
import ItemAddModal from '@/components/ItemAddModal';
import PrecautionQuickPicker from '@/components/PrecautionQuickPicker';

interface ChecklistItem {
  id: string;
  content: string;
  instructions?: string;
  order: number;
  isRequired: boolean;
  isActive: boolean;
  connectedItems: Array<{
    id: string;
    itemType: string;
    itemId: string;
    order: number;
    connectedItem: {
      id: string;
      name: string;
      type: string;
      tags: string[];
    };
  }>;
}

interface Template {
  id: string;
  name: string;
  workplace: string;
  category: string;
  timeSlot: string;
}

interface Tag {
  id: string;
  name: string;
  color: string;
}

export default function ChecklistItemsPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [template, setTemplate] = useState<Template | null>(null);
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [newItemContent, setNewItemContent] = useState('');
  const [newItemInstructions, setNewItemInstructions] = useState('');
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const formRef = useRef<HTMLDivElement | null>(null);
  const [templateId, setTemplateId] = useState<string>('');
  const [tags, setTags] = useState<Tag[]>([]);
  const [isConnectionModalOpen, setIsConnectionModalOpen] = useState(false);
  const [selectedItemForConnection, setSelectedItemForConnection] = useState<ChecklistItem | null>(null);
  
  // 연결 항목 보기/수정 모달 상태
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerType, setViewerType] = useState<'manual' | 'precaution' | 'inventory' | null>(null);
  const [viewerId, setViewerId] = useState<string | null>(null);
  const [viewerData, setViewerData] = useState<any>(null);
  const [viewerLoading, setViewerLoading] = useState(false);
  const [viewerEditMode, setViewerEditMode] = useState(false);
  const [viewerEditTitle, setViewerEditTitle] = useState('');
  const [viewerEditContent, setViewerEditContent] = useState('');
  const [showPrecautionPicker, setShowPrecautionPicker] = useState(false);
  
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  // 액션시트(⋯) 오픈 대상
  const [openActionForItemId, setOpenActionForItemId] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
  const actionButtonRefs = useRef<{ [key: string]: HTMLButtonElement | null }>({});
  // 순서 저장 디바운스 타이머
  const orderSaveTimer = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const init = async () => {
      const resolvedParams = await params;
      setTemplateId(resolvedParams.id);
      await fetchTemplate(resolvedParams.id);
      await fetchItems(resolvedParams.id);
      await fetchTags();
    };
    init();
  }, [params]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (openActionForItemId) {
        const target = event.target as Node;
        const button = actionButtonRefs.current[openActionForItemId];
        
        // 버튼 클릭이거나 메뉴 내부 클릭이면 무시
        if (button && button.contains(target)) {
          return;
        }
        
        // 메뉴 자체 클릭인지 확인 (data-dropdown 속성 확인)
        let element = target as Element;
        while (element && element !== document.body) {
          if (element.getAttribute && element.getAttribute('data-dropdown') === 'true') {
            return;
          }
          element = element.parentElement as Element;
        }
        
        setOpenActionForItemId(null);
      }
    };

    const handleScroll = () => {
      if (openActionForItemId) {
        // 스크롤 시 메뉴 위치 업데이트
        const position = calculateMenuPosition(openActionForItemId);
        setMenuPosition(position);
      }
    };

    const handleResize = () => {
      if (openActionForItemId) {
        // 화면 크기 변경 시 메뉴 위치 업데이트
        const position = calculateMenuPosition(openActionForItemId);
        setMenuPosition(position);
      }
    };

    if (openActionForItemId) {
      document.addEventListener('mousedown', handleClickOutside);
      window.addEventListener('scroll', handleScroll, true); // capture phase에서 모든 스크롤 감지
      window.addEventListener('resize', handleResize);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
        window.removeEventListener('scroll', handleScroll, true);
        window.removeEventListener('resize', handleResize);
      };
    }
  }, [openActionForItemId]);

  const calculateMenuPosition = (itemId: string) => {
    const buttonElement = actionButtonRefs.current[itemId];
    if (!buttonElement) return { top: 0, left: 0 };
    
    const rect = buttonElement.getBoundingClientRect();
    const menuWidth = 144; // 메뉴 너비
    const menuHeight = 200; // 대략적인 메뉴 높이
    
    // 화면 크기 고려
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    // X 좌표 계산 (우측 정렬, 화면 경계 고려)
    let left = rect.right - menuWidth;
    if (left < 8) {
      left = 8; // 최소 왼쪽 여백
    } else if (left + menuWidth > viewportWidth - 8) {
      left = viewportWidth - menuWidth - 8; // 최대 우측 여백
    }
    
    // Y 좌표 계산 (아래쪽 우선, 공간 부족시 위쪽)
    let top = rect.bottom + 4;
    if (top + menuHeight > viewportHeight - 8) {
      top = rect.top - menuHeight - 4; // 버튼 위쪽에 표시
      if (top < 8) {
        top = 8; // 최소 위쪽 여백
      }
    }
    
    return { top, left };
  };

  const fetchTemplate = async (id: string) => {
    try {
      const response = await fetch(`/api/admin/checklists/${id}`, {
        credentials: "include"
      });
      if (response.ok) {
        const data = await response.json();
        setTemplate(data);
      }
    } catch (error) {
      console.error('템플릿 조회 오류:', error);
      setError('템플릿을 불러오는데 실패했습니다.');
    }
  };

  const fetchItems = async (id: string) => {
    try {
      const response = await fetch(`/api/admin/checklists/${id}/items`, {
        credentials: "include"
      });
      if (response.ok) {
        const data = await response.json();
        setItems(data);
      } else {
        const errorData = await response.json();
        setError(errorData.error || '항목을 불러오는데 실패했습니다.');
      }
    } catch (error) {
      console.error('항목 조회 오류:', error);
      setError('항목을 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const fetchTags = async () => {
    try {
      const response = await fetch('/api/admin/tags', {
        credentials: "include"
      });
      if (response.ok) {
        const data = await response.json();
        setTags(data);
      }
    } catch (error) {
      console.error('태그 조회 오류:', error);
    }
  };

  const handleSaveItem = async () => {
    if (!newItemContent.trim()) return;

    try {
      if (editingItemId) {
        // 수정
        const response = await fetch(`/api/admin/checklists/${templateId}/items/${editingItemId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: "include",
          body: JSON.stringify({
            content: newItemContent,
            instructions: newItemInstructions
          })
        });
        if (response.ok) {
          setEditingItemId(null);
          setNewItemContent('');
          setNewItemInstructions('');
          await fetchItems(templateId);
        } else {
          const errorData = await response.json();
          setError(errorData.error || '항목 수정에 실패했습니다.');
        }
      } else {
        // 신규 추가
        const response = await fetch(`/api/admin/checklists/${templateId}/items`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: "include",
          body: JSON.stringify({
            content: newItemContent,
            instructions: newItemInstructions,
            isRequired: true
          })
        });
        if (response.ok) {
          setNewItemContent('');
          setNewItemInstructions('');
          await fetchItems(templateId);
        } else {
          const errorData = await response.json();
          setError(errorData.error || '항목 추가에 실패했습니다.');
        }
      }
    } catch (error) {
      console.error('항목 저장 오류:', error);
      setError('항목 저장 중 오류가 발생했습니다.');
    }
  };

  const handleEditStart = (item: ChecklistItem) => {
    setEditingItemId(item.id);
    setNewItemContent(item.content);
    setNewItemInstructions(item.instructions || '');
    // 상단 폼으로 스크롤
    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 0);
  };

  const handleEditCancel = () => {
    setEditingItemId(null);
    setNewItemContent('');
    setNewItemInstructions('');
  };

  const openConnectedItemViewer = async (itemType: 'manual'|'precaution'|'inventory', id: string) => {
    try {
      setViewerLoading(true);
      setViewerOpen(true);
      setViewerType(itemType);
      setViewerId(id);
      setViewerEditMode(false);
      setViewerEditTitle('');
      setViewerEditContent('');
      
      // API를 통해 상세 조회
      let apiUrl = '';
      if (itemType === 'manual') {
        apiUrl = `/api/admin/manuals/${id}`;
      } else if (itemType === 'precaution') {
        apiUrl = `/api/admin/precautions/${id}`;
      } else if (itemType === 'inventory') {
        apiUrl = `/api/admin/inventory/${id}`;
      }
      
      const res = await fetch(apiUrl, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setViewerData(data);
        setViewerEditTitle(data?.title || data?.name || '');
        setViewerEditContent(data?.content || '');
      } else {
        console.error('API 응답 오류:', res.status, res.statusText);
        setViewerData(null);
      }
    } catch (e) {
      console.error('연결 항목 조회 오류:', e);
      setViewerData(null);
    } finally {
      setViewerLoading(false);
    }
  };

  const saveViewerEdits = async () => {
    if (!viewerType || !viewerId) return;
    try {
      if (viewerType === 'manual') {
        const resp = await fetch('/api/admin/manuals', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ 
            id: viewerId, 
            title: viewerEditTitle, 
            content: viewerEditContent 
          })
        });
        if (!resp.ok) {
          const err = await resp.json().catch(() => ({}));
          alert(err.error || '메뉴얼 수정 실패');
          return;
        }
      } else if (viewerType === 'precaution') {
        const resp = await fetch('/api/admin/precautions', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ 
            id: viewerId, 
            title: viewerEditTitle, 
            content: viewerEditContent,
            workplace: viewerData?.workplace || 'COMMON',
            timeSlot: viewerData?.timeSlot || 'COMMON',
            priority: viewerData?.priority ?? 1,
            tags: (viewerData?.tags || []).map((t:any)=>t.id).filter(Boolean)
          })
        });
        if (!resp.ok) {
          const err = await resp.json().catch(() => ({}));
          alert(err.error || '주의사항 수정 실패');
          return;
        }
      }
      setViewerEditMode(false);
      await openConnectedItemViewer(viewerType, viewerId);
    } catch (e) {
      console.error('수정 저장 오류:', e);
      alert('수정 저장 중 오류가 발생했습니다.');
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    if (!confirm('이 항목을 삭제하시겠습니까?')) return;

    try {
      const response = await fetch(`/api/admin/checklists/${templateId}/items/${itemId}`, {
        method: 'DELETE',
        credentials: "include"
      });

      if (response.ok) {
        fetchItems(templateId);
      } else {
        const errorData = await response.json();
        setError(errorData.error || '항목 삭제에 실패했습니다.');
      }
    } catch (error) {
      console.error('항목 삭제 오류:', error);
      setError('항목 삭제 중 오류가 발생했습니다.');
    }
  };

  const applyNewOrder = async (reordered: ChecklistItem[]) => {
    // 1) 낙관적 업데이트
    setItems(reordered.map((it, idx) => ({ ...it, order: idx + 1 })));
    // 2) 디바운스하여 서버 반영 (마지막 변경만 저장)
    if (orderSaveTimer.current) {
      clearTimeout(orderSaveTimer.current);
    }
    orderSaveTimer.current = setTimeout(async () => {
      try {
        await Promise.all(
          reordered.map((it, idx) => fetch(`/api/admin/checklists/${templateId}/items/${it.id}`, {
            method: 'PUT', 
            headers: { 'Content-Type': 'application/json' }, 
            credentials: "include",
            body: JSON.stringify({ order: idx + 1 })
          }))
        );
      } catch (e) {
        console.error('순서 저장 실패:', e);
        await fetchItems(templateId);
      }
    }, 600);
  };

  const moveItem = async (from: number, to: number) => {
    if (from === to || from < 0 || to < 0 || from >= items.length || to >= items.length) return;
    const reordered = Array.from(items);
    const [moved] = reordered.splice(from, 1);
    reordered.splice(to, 0, moved);
    await applyNewOrder(reordered);
  };

  const handleOpenConnectionModal = (item: ChecklistItem) => {
    setSelectedItemForConnection(item);
    setIsConnectionModalOpen(true);
  };

  const handleSaveConnections = async (connectedItems: any[]) => {
    if (!selectedItemForConnection) return;

    try {
      const response = await fetch(`/api/admin/checklists/${templateId}/items/${selectedItemForConnection.id}/connections`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: "include",
        body: JSON.stringify({ connectedItems })
      });

      if (response.ok) {
        setIsConnectionModalOpen(false);
        setSelectedItemForConnection(null);
        await fetchItems(templateId);
      } else {
        const errorData = await response.json();
        setError(errorData.error || '연결 항목 저장에 실패했습니다.');
      }
    } catch (error) {
      console.error('연결 항목 저장 오류:', error);
      setError('연결 항목 저장 중 오류가 발생했습니다.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
              <div className="space-y-3">
                <div className="h-10 bg-gray-200 rounded"></div>
                <div className="h-20 bg-gray-200 rounded"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6 overflow-visible">
      <div className="max-w-4xl mx-auto overflow-visible">
        {/* 헤더 */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.back()}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              <ArrowLeft size={20} />
              뒤로가기
            </button>
            <h1 className="text-2xl font-bold text-gray-900">
              {template?.name} - 항목 관리
            </h1>
          </div>
        </div>

        {/* 에러 메시지 */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {/* 새 항목 추가 */}
        <div ref={formRef} className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4 text-gray-900">
            {editingItemId ? '항목 수정' : '새 항목 추가'}
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                항목 내용
              </label>
              <input
                type="text"
                value={newItemContent}
                onChange={(e) => setNewItemContent(e.target.value)}
                placeholder="예: 재료체크, 청소체크"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder-gray-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                설명 (선택사항)
              </label>
              <textarea
                value={newItemInstructions}
                onChange={(e) => setNewItemInstructions(e.target.value)}
                placeholder="항목에 대한 추가 설명"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder-gray-500"
                rows={2}
              />
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleSaveItem}
                disabled={!newItemContent.trim()}
                className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {editingItemId ? <Edit size={16} /> : <Plus size={16} />}
                {editingItemId ? '수정 저장' : '항목 추가'}
              </button>
              {editingItemId && (
                <button
                  onClick={handleEditCancel}
                  className="px-4 py-2 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  취소
                </button>
              )}
            </div>
          </div>
        </div>

        {/* 항목 목록 */}
        <div className="bg-white rounded-lg shadow overflow-visible">
          <div className="p-6 border-b">
            <h2 className="text-lg font-semibold text-gray-900">체크리스트 항목</h2>
            <p className="text-sm text-gray-600 mt-1">드래그하여 순서를 변경할 수 있습니다</p>
          </div>
          
          {items.length === 0 ? (
            <div className="p-12 text-center">
              <div className="text-gray-400 mb-4">
                <Plus className="w-16 h-16 mx-auto" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">항목이 없습니다</h3>
              <p className="text-gray-600">새로운 체크리스트 항목을 추가해보세요</p>
            </div>
          ) : (
            <div className="divide-y overflow-visible">
              {items.map((item, index) => (
                <div
                  key={item.id}
                  className={`p-6 ${dragIndex === index ? 'bg-blue-50' : ''} transition-colors overflow-visible`}
                  draggable
                  onDragStart={(e)=>{ 
                    setDragIndex(index); 
                    e.dataTransfer.effectAllowed='move'; 
                    e.dataTransfer.setData('text/plain', item.id); 
                  }}
                  onDragOver={(e)=>{ e.preventDefault(); }}
                  onDrop={async (e)=>{ 
                    e.preventDefault(); 
                    if (dragIndex !== null) { 
                      await moveItem(dragIndex, index); 
                    } 
                    setDragIndex(null); 
                  }}
                >
                  {/* 메인 항목 */}
                  <div className="flex flex-col mb-3">
                    <div className="flex-1 min-w-0 pr-2">
                      <h3 className="text-lg font-medium text-gray-900">
                        {item.content}
                      </h3>
                      {item.instructions && (
                        <p className="text-sm text-gray-600 mt-1">
                          {item.instructions}
                        </p>
                      )}
                    </div>
                    
                    {/* 액션 버튼들 */}
                    <div className="mt-2 flex items-center gap-2 justify-end overflow-visible">
                      <button
                        ref={(el) => {
                          actionButtonRefs.current[item.id] = el;
                        }}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          
                          if (openActionForItemId === item.id) {
                            setOpenActionForItemId(null);
                          } else {
                            const position = calculateMenuPosition(item.id);
                            setMenuPosition(position);
                            setOpenActionForItemId(item.id);
                          }
                        }}
                        className="p-1.5 rounded hover:bg-gray-100 text-gray-600 transition-colors min-h-[32px] min-w-[32px]"
                        title="메뉴"
                      >
                        <MoreVertical size={16} />
                      </button>
                    </div>
                  </div>

                  {/* 연결된 항목들 - 칩 UI */}
                  {item.connectedItems.length > 0 && (
                    <div className="mt-3 ml-1">
                      <div className="flex flex-wrap gap-2">
                        {item.connectedItems.map((connection) => (
                          <button
                            key={connection.id}
                            type="button"
                            onClick={() => openConnectedItemViewer(
                              connection.connectedItem.type as 'manual'|'precaution', 
                              connection.connectedItem.id
                            )}
                            className={`inline-flex items-center gap-2 px-2.5 py-1.5 rounded-full border text-xs hover:shadow-sm transition ${
                              connection.connectedItem.type === 'inventory' ? 'bg-blue-50 border-blue-200 text-blue-700' :
                              connection.connectedItem.type === 'precaution' ? 'bg-red-50 border-red-200 text-red-700' :
                              'bg-purple-50 border-purple-200 text-purple-700'
                            }`}
                            title={`${
                              connection.connectedItem.type === 'inventory' ? '재고' : 
                              connection.connectedItem.type === 'precaution' ? '주의사항' : 
                              '메뉴얼'
                            } 열기`}
                          >
                            <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${
                              connection.connectedItem.type === 'inventory' ? 'bg-blue-200 text-blue-800' :
                              connection.connectedItem.type === 'precaution' ? 'bg-red-200 text-red-800' :
                              'bg-purple-200 text-purple-800'
                            }`}>
                              {connection.connectedItem.type === 'inventory' ? '재고' : 
                               connection.connectedItem.type === 'precaution' ? '주의' : 
                               '매뉴얼'}
                            </span>
                            <span className="truncate max-w-[160px] text-left">
                              {connection.connectedItem.name}
                            </span>
                            {connection.connectedItem.tags.length > 0 && (
                              <span className="hidden sm:inline text-[10px] text-gray-500">
                                +{connection.connectedItem.tags.length}
                              </span>
                            )}
                            {/* 메뉴얼인 경우 연결된 주의사항 개수 표시 */}
                            {connection.connectedItem.type === 'manual' && connection.connectedItem.precautions && connection.connectedItem.precautions.length > 0 && (
                              <span className="text-[10px] text-orange-600 font-semibold">
                                ⚠️{connection.connectedItem.precautions.length}
                              </span>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Portal로 렌더링되는 액션 메뉴 */}
        {mounted && openActionForItemId && createPortal(
          <div
            data-dropdown="true"
            className="fixed w-36 bg-white border border-gray-200 rounded-md shadow-xl py-1 z-[9999] animate-in fade-in-0 zoom-in-95 duration-100"
            style={{
              top: `${menuPosition.top}px`,
              left: `${menuPosition.left}px`,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={(e) => { 
                e.stopPropagation();
                const item = items.find(i => i.id === openActionForItemId);
                setOpenActionForItemId(null); 
                if (item) handleOpenConnectionModal(item);
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-blue-700 hover:bg-blue-50"
            >
              <Link size={14} /> 연결 관리
            </button>
            <button
              onClick={(e) => { 
                e.stopPropagation();
                const item = items.find(i => i.id === openActionForItemId);
                setOpenActionForItemId(null); 
                if (item) handleEditStart(item);
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              <Edit size={14} /> 수정
            </button>
            <button
              onClick={(e) => { 
                e.stopPropagation();
                const currentItemId = openActionForItemId;
                setOpenActionForItemId(null); 
                if (currentItemId) handleDeleteItem(currentItemId);
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-700 hover:bg-red-50"
            >
              <Trash2 size={14} /> 삭제
            </button>
            <div className="border-t my-1" />
            <div className="flex items-center justify-between px-2 py-1">
              <button 
                onClick={(e)=>{ 
                  e.stopPropagation();
                  const currentIndex = items.findIndex(i => i.id === openActionForItemId);
                  setOpenActionForItemId(null); 
                  if (currentIndex > 0) moveItem(currentIndex, currentIndex - 1); 
                }} 
                className="px-2 py-1 rounded hover:bg-gray-100 text-gray-600 transition-colors" 
                title="위로"
                disabled={items.findIndex(i => i.id === openActionForItemId) === 0}
              >
                <ChevronUp size={14} />
              </button>
              <button 
                onClick={(e)=>{ 
                  e.stopPropagation();
                  const currentIndex = items.findIndex(i => i.id === openActionForItemId);
                  setOpenActionForItemId(null); 
                  if (currentIndex < items.length - 1) moveItem(currentIndex, currentIndex + 1); 
                }} 
                className="px-2 py-1 rounded hover:bg-gray-100 text-gray-600 transition-colors" 
                title="아래로"
                disabled={items.findIndex(i => i.id === openActionForItemId) === items.length - 1}
              >
                <ChevronDown size={14} />
              </button>
            </div>
          </div>,
          document.body
        )}

        {/* 연결된 메뉴얼/주의사항 보기/수정 모달 */}
        {viewerOpen && (
          <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="fixed inset-0 bg-black bg-opacity-50" onClick={() => setViewerOpen(false)} />
            <div className="flex min-h-full items-center justify-center p-3 sm:p-4">
              <div className="relative w-full max-w-2xl bg-white rounded-lg shadow-xl overflow-hidden max-h-[90vh] flex flex-col">
                <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200 flex-shrink-0">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                      viewerType==='manual' ? 'bg-purple-500 text-white' : 
                      viewerType==='precaution' ? 'bg-red-500 text-white' : 
                      'bg-green-500 text-white'
                    }`}>
                      {viewerType === 'manual' ? 'M' : viewerType === 'precaution' ? 'P' : 'I'}
                    </span>
                    <h2 className="text-lg sm:text-xl font-bold text-gray-900 truncate">
                      {viewerEditMode ? (viewerEditTitle || '제목 없음') : (viewerData?.title || viewerData?.name || '제목 없음')}
                    </h2>
                  </div>
                  <div className="flex items-center gap-2">
                    {!viewerEditMode && viewerType !== 'inventory' && (
                      <button 
                        onClick={() => { 
                          setViewerEditMode(true); 
                          setViewerEditTitle(viewerData?.title || viewerData?.name || ''); 
                          setViewerEditContent(viewerData?.content || ''); 
                        }} 
                        className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                      >
                        수정
                      </button>
                    )}
                    {viewerEditMode && (
                      <>
                        <button 
                          onClick={saveViewerEdits} 
                          className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                        >
                          저장
                        </button>
                        <button 
                          onClick={() => { setViewerEditMode(false); }} 
                          className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 transition-colors"
                        >
                          취소
                        </button>
                      </>
                    )}
                    <button 
                      onClick={() => setViewerOpen(false)} 
                      className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>
                <div className="p-4 sm:p-6 overflow-y-auto flex-1">
                  {viewerLoading ? (
                    <div className="text-center text-sm text-gray-500">불러오는 중...</div>
                  ) : viewerEditMode ? (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-800 mb-1">제목</label>
                        <input 
                          value={viewerEditTitle} 
                          onChange={(e)=>setViewerEditTitle(e.target.value)} 
                          className="w-full px-3 py-2 border border-gray-300 rounded text-gray-900 placeholder-gray-500 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500" 
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-800 mb-1">내용</label>
                        <textarea 
                          value={viewerEditContent} 
                          onChange={(e)=>setViewerEditContent(e.target.value)} 
                          rows={10} 
                          className="w-full px-3 py-2 border border-gray-300 rounded text-gray-900 placeholder-gray-500 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500" 
                        />
                      </div>
                    </div>
                  ) : viewerData ? (
                    <div className="space-y-4">
                      {/* 재고 상세 정보 */}
                      {viewerType === 'inventory' ? (
                        <div className="space-y-4">
                          {/* 기본 정보 */}
                          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <div>
                                <div className="text-xs font-medium text-green-700 mb-1">재고 아이템명</div>
                                <div className="text-sm font-semibold text-green-900">{viewerData.name}</div>
                              </div>
                              <div>
                                <div className="text-xs font-medium text-green-700 mb-1">카테고리</div>
                                <div className="text-sm text-green-800">{viewerData.category}</div>
                              </div>
                              <div>
                                <div className="text-xs font-medium text-green-700 mb-1">단위</div>
                                <div className="text-sm text-green-800">{viewerData.unit}</div>
                              </div>
                              <div>
                                <div className="text-xs font-medium text-green-700 mb-1">공급업체</div>
                                <div className="text-sm text-green-800">{viewerData.supplier || '미지정'}</div>
                              </div>
                            </div>
                          </div>

                          {/* 재고 현황 */}
                          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                            <div className="text-sm font-semibold text-blue-900 mb-3">재고 현황</div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <div>
                                <div className="text-xs font-medium text-blue-700 mb-1">현재 재고</div>
                                <div className="text-lg font-bold text-blue-900">{viewerData.currentStock} {viewerData.unit}</div>
                              </div>
                              <div>
                                <div className="text-xs font-medium text-blue-700 mb-1">최소 재고</div>
                                <div className="text-lg font-bold text-blue-900">{viewerData.minStock} {viewerData.unit}</div>
                              </div>
                            </div>
                            <div className="mt-3 pt-3 border-t border-blue-200">
                              <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                                viewerData.currentStock <= viewerData.minStock 
                                  ? 'bg-red-100 text-red-800' 
                                  : viewerData.currentStock <= viewerData.minStock * 1.5
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : 'bg-green-100 text-green-800'
                              }`}>
                                {viewerData.currentStock <= viewerData.minStock 
                                  ? '🔴 재고 부족' 
                                  : viewerData.currentStock <= viewerData.minStock * 1.5
                                  ? '🟡 재고 주의'
                                  : '🟢 재고 충분'}
                              </div>
                            </div>
                          </div>

                          {/* 업데이트 정보 */}
                          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                            <div className="text-sm font-semibold text-gray-900 mb-3">업데이트 정보</div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <div>
                                <div className="text-xs font-medium text-gray-600 mb-1">최근 업데이트</div>
                                <div className="text-sm text-gray-800">{viewerData.updatedAt}</div>
                              </div>
                              <div>
                                <div className="text-xs font-medium text-gray-600 mb-1">업데이트한 사람</div>
                                <div className="text-sm text-gray-800">{viewerData.updatedBy}</div>
                              </div>
                            </div>
                          </div>

                          {/* 태그 */}
                          {viewerData.tags && viewerData.tags.length > 0 && (
                            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                              <div className="text-sm font-semibold text-purple-900 mb-3">태그</div>
                              <div className="flex flex-wrap gap-2">
                                {viewerData.tags.map((tag: any) => (
                                  <span 
                                    key={`inventory-viewer-tag-${tag.id}`}
                                    className="px-3 py-1 text-xs rounded-full text-white font-medium"
                                    style={{ backgroundColor: tag.color }}
                                  >
                                    {tag.name}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="bg-gray-50 rounded-lg p-4 whitespace-pre-wrap text-gray-800 text-sm">
                          {viewerData?.content || '내용이 없습니다.'}
                        </div>
                      )}
                      
                      {/* 메뉴얼의 연결된 주의사항들 표시 */}
                      {viewerType === 'manual' && (
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="text-sm font-semibold text-gray-800">연결된 주의사항</div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-gray-500">{(viewerData?.precautions || []).length}개</span>
                              <button
                                onClick={() => setShowPrecautionPicker(true)}
                                className="px-2 py-1 text-xs bg-orange-600 text-white rounded hover:bg-orange-700 transition-colors"
                              >
                                주의사항 추가
                              </button>
                            </div>
                          </div>
                          {(viewerData?.precautions || []).length > 0 ? (viewerData.precautions || []).map((precaution: any, idx: number) => (
                            <div key={precaution.id} className="bg-red-50 border border-red-200 rounded-lg p-3">
                              <div className="flex items-start justify-between">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-200 text-red-800">
                                      주의사항
                                    </span>
                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                      precaution.priority === 1 ? 'bg-red-500 text-white' :
                                      precaution.priority === 2 ? 'bg-yellow-500 text-white' :
                                      'bg-green-500 text-white'
                                    }`}>
                                      {precaution.priority === 1 ? '높음' : precaution.priority === 2 ? '보통' : '낮음'}
                                    </span>
                                  </div>
                                  <div className="text-red-900 text-sm font-medium mb-1">{precaution.title}</div>
                                  <div className="text-red-800 text-xs whitespace-pre-wrap">{precaution.content}</div>
                                </div>
                                <button
                                  onClick={() => openConnectedItemViewer('precaution', precaution.id)}
                                  className="ml-2 p-1 text-red-600 hover:text-red-800 hover:bg-red-100 rounded transition-colors"
                                  title="주의사항 상세보기"
                                >
                                  <Eye size={14} />
                                </button>
                              </div>
                            </div>
                          )) : (
                            <div className="text-xs text-gray-500 text-center py-4">연결된 주의사항이 없습니다.</div>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center text-sm text-gray-500">데이터가 없습니다.</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 메뉴얼 팝업에서 주의사항 추가 피커 */}
        {showPrecautionPicker && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="fixed inset-0 bg-black/50" onClick={() => setShowPrecautionPicker(false)} />
            <div className="relative bg-white rounded-lg shadow-xl p-4 w-full max-w-2xl max-h-[80vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-3">
                <div className="text-sm font-semibold">주의사항 추가</div>
                <button 
                  className="text-gray-500 hover:text-gray-700" 
                  onClick={() => setShowPrecautionPicker(false)}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <PrecautionQuickPicker 
                manualId={viewerId || ''} 
                selectedPrecautionIds={(viewerData?.precautions || []).map((p: any) => p.id)} 
                onClose={() => setShowPrecautionPicker(false)} 
                onAdded={async () => {
                  // 메뉴얼 데이터 다시 로드
                  if (viewerType === 'manual' && viewerId) {
                    await openConnectedItemViewer('manual', viewerId);
                  }
                  setShowPrecautionPicker(false);
                }} 
              />
            </div>
          </div>
        )}

        {/* 연결 관리 모달 */}
        <ItemAddModal
          isOpen={isConnectionModalOpen}
          onClose={() => {
            setIsConnectionModalOpen(false);
            setSelectedItemForConnection(null);
          }}
          onSave={handleSaveConnections}
          editingItem={selectedItemForConnection ? {
            content: selectedItemForConnection.content,
            connectedItems: selectedItemForConnection.connectedItems.map(ci => ({
              id: ci.connectedItem.id,
              name: ci.connectedItem.name,
              type: ci.connectedItem.type as 'inventory' | 'precaution' | 'manual'
            }))
          } : null}
          tags={tags}
        />
      </div>
    </div>
  );
}
