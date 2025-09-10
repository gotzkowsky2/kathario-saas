"use client";
import { useState, useEffect } from "react";
import { X, Search, Tag, Plus } from "lucide-react";

interface ConnectedItem {
  type: 'inventory' | 'precaution' | 'manual';
  id: string;
  name: string;
}

interface Tag {
  id: string;
  name: string;
  color: string;
}

interface ItemAddModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (connectedItems: ConnectedItem[]) => void;
  editingItem?: {
    content: string;
    connectedItems: ConnectedItem[];
  } | null;
  tags?: Tag[];
}

const categoryOptions = [
  { value: 'all', label: '전체', icon: '📋' },
  { value: 'inventory', label: '재고', icon: '📦' },
  { value: 'precaution', label: '주의사항', icon: '⚠️' },
  { value: 'manual', label: '메뉴얼', icon: '📖' },
];

export default function ItemAddModal({ isOpen, onClose, onSave, editingItem, tags = [] }: ItemAddModalProps) {
  const [connectedItems, setConnectedItems] = useState<ConnectedItem[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchType, setSearchType] = useState<'all' | 'inventory' | 'precaution' | 'manual'>('all');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [allItems, setAllItems] = useState<ConnectedItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isTagSectionOpen, setIsTagSectionOpen] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (editingItem) {
        setConnectedItems(editingItem.connectedItems);
      } else {
        setConnectedItems([]);
      }
      setSearchTerm("");
      setSelectedTags([]);
      setSearchType('all');
      loadAllItems();
    }
  }, [isOpen, editingItem]);

  // 모든 항목 로드
  const loadAllItems = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        query: searchTerm,
        type: searchType
      });

      // 선택된 모든 태그를 AND 조건으로 전송
      if (selectedTags.length > 0) {
        selectedTags.forEach(tagId => {
          params.append('tagIds', tagId);
        });
      }

      const response = await fetch(`/api/admin/search-connections?${params}`, {
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        setAllItems(data.results || []);
      } else {
        console.error('항목 로드 실패');
        setAllItems([]);
      }
    } catch (error) {
      console.error('항목 로드 오류:', error);
      setAllItems([]);
    } finally {
      setIsLoading(false);
    }
  };

  // 검색어 변경 시 항목 다시 로드
  useEffect(() => {
    if (isOpen) {
      const timeoutId = setTimeout(() => {
        loadAllItems();
      }, 300);

      return () => clearTimeout(timeoutId);
    }
  }, [searchTerm, searchType, selectedTags, isOpen]);

  const addConnectedItem = async (item: ConnectedItem) => {
    const isAlreadyAdded = connectedItems.some(
      existingItem => existingItem.id === item.id && existingItem.type === item.type
    );
    
    if (!isAlreadyAdded) {
      const itemsToAdd = [item];
      
      // 메뉴얼인 경우 연결된 주의사항들도 함께 추가
      if (item.type === 'manual') {
        try {
          const response = await fetch(`/api/admin/manuals/${item.id}/precautions`, {
            credentials: 'include'
          });
          
          if (response.ok) {
            const data = await response.json();
            const relatedPrecautions = data.precautions || [];
            
            // 이미 추가되지 않은 주의사항들만 추가
            relatedPrecautions.forEach((precaution: any) => {
              const precautionItem: ConnectedItem = {
                type: 'precaution',
                id: precaution.id,
                name: precaution.title
              };
              
              const isAlreadyAddedPrecaution = connectedItems.some(
                existingItem => existingItem.id === precautionItem.id && existingItem.type === precautionItem.type
              );
              
              if (!isAlreadyAddedPrecaution && !itemsToAdd.some(
                newItem => newItem.id === precautionItem.id && newItem.type === precautionItem.type
              )) {
                itemsToAdd.push(precautionItem);
              }
            });
          }
        } catch (error) {
          console.error('메뉴얼 연결 주의사항 조회 오류:', error);
        }
      }
      
      setConnectedItems(prev => [...prev, ...itemsToAdd]);
    }
  };

  const removeConnectedItem = (itemToRemove: ConnectedItem) => {
    setConnectedItems(prev => 
      prev.filter(item => !(item.id === itemToRemove.id && item.type === itemToRemove.type))
    );
  };

  const toggleTag = (tagId: string) => {
    setSelectedTags((prev: string[]) => 
      prev.includes(tagId) 
        ? prev.filter((id: string) => id !== tagId)
        : [...prev, tagId]
    );
  };

  const handleCategoryChange = (category: 'all' | 'inventory' | 'precaution' | 'manual') => {
    setSearchType(category);
  };

  const handleSave = () => {
    onSave(connectedItems);
    onClose();
  };

  const handleClose = () => {
    setConnectedItems([]);
    setSearchTerm("");
    setSelectedTags([]);
    setSearchType('all');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* 헤더 */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-800">
            연결 항목 관리
          </h2>
          <button
            onClick={handleClose}
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 내용 */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 왼쪽: 검색 및 선택 */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-800">항목 검색</h3>
              
              {/* 검색 입력 */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="항목 검색..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-500"
                />
              </div>

              {/* 카테고리 필터 */}
              <div className="flex space-x-2">
                {categoryOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => handleCategoryChange(option.value as any)}
                    className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                      searchType === option.value
                        ? 'bg-blue-100 text-blue-700 border border-blue-300'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    <span className="mr-1">{option.icon}</span>
                    {option.label}
                  </button>
                ))}
              </div>

              {/* 태그 필터 */}
              {tags.length > 0 && (
                <div className="space-y-2">
                  <button
                    onClick={() => setIsTagSectionOpen(!isTagSectionOpen)}
                    className="flex items-center space-x-2 text-sm text-gray-600 hover:text-gray-800"
                  >
                    <Tag className="w-4 h-4" />
                    <span>태그 필터 {isTagSectionOpen ? '접기' : '펼치기'}</span>
                  </button>
                  
                  {isTagSectionOpen && (
                    <div className="flex flex-wrap gap-2 p-3 bg-gray-50 rounded-lg">
                      {tags.map((tag) => (
                        <button
                          key={tag.id}
                          onClick={() => toggleTag(tag.id)}
                          className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                            selectedTags.includes(tag.id)
                              ? 'text-white'
                              : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-100'
                          }`}
                          style={{
                            backgroundColor: selectedTags.includes(tag.id) ? tag.color : undefined,
                            color: selectedTags.includes(tag.id) ? 'white' : undefined
                          }}
                        >
                          {tag.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* 검색 결과 */}
              <div className="max-h-60 overflow-y-auto space-y-2">
                {isLoading ? (
                  <div className="text-center py-4 text-gray-500">검색 중...</div>
                ) : allItems.length === 0 ? (
                  <div className="text-center py-4 text-gray-500">검색 결과가 없습니다.</div>
                ) : (
                  allItems.map((item) => {
                    const isAlreadyAdded = connectedItems.some(
                      existingItem => existingItem.id === item.id && existingItem.type === item.type
                    );
                    
                    return (
                      <div
                        key={`${item.type}-${item.id}`}
                        className={`p-3 border rounded-lg transition-colors ${
                          isAlreadyAdded 
                            ? 'border-green-200 bg-green-50' 
                            : 'border-gray-200 hover:bg-gray-50 cursor-pointer'
                        }`}
                        onClick={() => !isAlreadyAdded && addConnectedItem(item)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <span className="text-sm text-gray-500">
                              {item.type === 'inventory' ? '📦' : item.type === 'precaution' ? '⚠️' : '📖'}
                            </span>
                            <span className="font-medium text-gray-800">{item.name}</span>
                          </div>
                          {isAlreadyAdded ? (
                            <span className="text-green-600 text-sm font-medium">추가됨</span>
                          ) : (
                            <button className="text-blue-500 hover:text-blue-700 text-sm font-medium">
                              <Plus className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* 오른쪽: 선택된 항목들 */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-800">
                선택된 항목 ({connectedItems.length})
              </h3>
              
              <div className="max-h-80 overflow-y-auto space-y-2">
                {connectedItems.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    선택된 항목이 없습니다.
                  </div>
                ) : (
                  connectedItems.map((item, index) => (
                    <div
                      key={`selected-${item.type}-${item.id}-${index}`}
                      className="p-3 border border-blue-200 bg-blue-50 rounded-lg"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <span className="text-sm">
                            {item.type === 'inventory' ? '📦' : item.type === 'precaution' ? '⚠️' : '📖'}
                          </span>
                          <span className="font-medium text-gray-800">{item.name}</span>
                          <span className="text-xs text-gray-500 bg-white px-2 py-1 rounded">
                            {item.type === 'inventory' ? '재고' : item.type === 'precaution' ? '주의사항' : '메뉴얼'}
                          </span>
                        </div>
                        <button
                          onClick={() => removeConnectedItem(item)}
                          className="text-red-500 hover:text-red-700 text-sm font-medium"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 푸터 */}
        <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200">
          <button
            onClick={handleClose}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
          >
            취소
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            저장 ({connectedItems.length}개 항목)
          </button>
        </div>
      </div>
    </div>
  );
}
