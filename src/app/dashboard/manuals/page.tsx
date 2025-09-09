"use client";

// 바삭치킨 관리자 매뉴얼 UI를 참조하여 구현한 Kathario 관리자용 메뉴얼 관리 페이지
// 기능: 목록/검색/필터, 생성/수정/삭제, 태그 연결, 주의사항 연결(기존/신규)

import { useEffect, useMemo, useRef, useState } from 'react'

type Manual = {
  id: string
  title: string
  content: string
  workplace: string
  timeSlot: string
  category: string
  version: string
  mediaUrls: string[]
  createdAt: string
  updatedAt: string
  tags?: { id: string; name: string; color: string }[]
  precautions?: {
    id: string
    title: string
    content: string
    workplace: string
    timeSlot: string
    priority: number
    order: number
    tags?: { id: string; name: string; color: string }[]
  }[]
}

type Tag = { id: string; name: string; color: string }

type Precaution = {
  id: string
  title: string
  content: string
  workplace: string
  timeSlot: string
  priority: number
  tags?: Tag[]
}

export default function AdminManualsPage() {
  const [manuals, setManuals] = useState<Manual[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [filters, setFilters] = useState({ workplace: 'ALL', timeSlot: 'ALL', category: 'ALL', search: '' })

  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    workplace: 'COMMON',
    timeSlot: 'COMMON',
    category: 'MANUAL',
    version: '1.0',
    mediaUrls: [] as string[],
    tags: [] as string[],
    precautions: [] as { title: string; content: string; workplace: string; timeSlot: string; priority: number }[],
    selectedPrecautions: [] as string[],
  })

  const [tags, setTags] = useState<Tag[]>([])
  const [tagSearch, setTagSearch] = useState('')
  const [showTagModal, setShowTagModal] = useState(false)
  const [showNewTagModal, setShowNewTagModal] = useState(false)
  const [newTag, setNewTag] = useState({ name: '', color: '#3B82F6' })

  const [precautions, setPrecautions] = useState<Precaution[]>([])
  const [loadingPrecautions, setLoadingPrecautions] = useState(false)
  const [showPrecautionModal, setShowPrecautionModal] = useState(false)
  const [showNewPrecautionModal, setShowNewPrecautionModal] = useState(false)
  const [newPrecaution, setNewPrecaution] = useState({ title: '', content: '', workplace: 'COMMON', timeSlot: 'COMMON', priority: 1, tags: [] as string[] })
  const [precautionFilter, setPrecautionFilter] = useState({ search: '', workplace: 'ALL', timeSlot: 'ALL', tags: [] as string[] })

  const titleRef = useRef<HTMLInputElement | null>(null)
  const formRef = useRef<HTMLDivElement | null>(null)

  const workplaceOptions = [
    { value: 'ALL', label: '전체' },
    { value: 'HALL', label: '홀' },
    { value: 'KITCHEN', label: '주방' },
    { value: 'COMMON', label: '공통' },
  ]
  const timeSlotOptions = [
    { value: 'ALL', label: '전체' },
    { value: 'PREPARATION', label: '준비' },
    { value: 'IN_PROGRESS', label: '진행' },
    { value: 'CLOSING', label: '마감' },
    { value: 'COMMON', label: '공통' },
  ]
  const categoryOptions = [
    { value: 'ALL', label: '전체' },
    { value: 'MANUAL', label: '메뉴얼' },
    { value: 'PROCEDURE', label: '절차' },
    { value: 'GUIDE', label: '가이드' },
    { value: 'TRAINING', label: '교육' },
  ]

  function getLabel(opts: { value: string; label: string }[], v: string) {
    return opts.find((o) => o.value === v)?.label || v
  }

  async function fetchManuals() {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filters.workplace !== 'ALL') params.set('workplace', filters.workplace)
      if (filters.timeSlot !== 'ALL') params.set('timeSlot', filters.timeSlot)
      if (filters.category !== 'ALL') params.set('category', filters.category)
      if (filters.search) params.set('search', filters.search)
      const res = await fetch(`/api/admin/manuals?${params.toString()}`, { credentials: 'include' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || '조회 실패')
      setManuals(data)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  async function fetchTags() {
    try {
      const res = await fetch('/api/admin/tags', { credentials: 'include' })
      if (res.ok) setTags(await res.json())
    } catch {}
  }

  async function fetchPrecautions() {
    try {
      setLoadingPrecautions(true)
      const res = await fetch('/api/admin/precautions', { credentials: 'include' })
      const data = await res.json().catch(() => [])
      if (Array.isArray(data)) setPrecautions(data)
      else if (Array.isArray(data.precautions)) setPrecautions(data.precautions)
      else setPrecautions([])
    } catch {
      setPrecautions([])
    } finally {
      setLoadingPrecautions(false)
    }
  }

  useEffect(() => {
    fetchManuals(); fetchTags(); fetchPrecautions()
  }, [])

  useEffect(() => { if (success) setTimeout(() => setSuccess(''), 2000) }, [success])

  const filteredManuals = useMemo(() => {
    return manuals.filter((m) => {
      const s = filters.search.trim().toLowerCase()
      const matchS = !s || m.title.toLowerCase().includes(s) || m.content.toLowerCase().includes(s)
      const matchW = filters.workplace === 'ALL' || m.workplace === filters.workplace
      const matchT = filters.timeSlot === 'ALL' || m.timeSlot === filters.timeSlot
      const matchC = filters.category === 'ALL' || m.category === filters.category
      return matchS && matchW && matchT && matchC
    })
  }, [manuals, filters])

  async function submitManual(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    try {
      const url = '/api/admin/manuals'
      const method = editingId ? 'PUT' : 'POST'
      const body = editingId ? { ...formData, id: editingId } : formData
      const res = await fetch(url, { method, credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || '저장 실패')
      setSuccess(editingId ? '수정 완료' : '생성 완료')
      setEditingId(null)
      setFormData({ title: '', content: '', workplace: 'COMMON', timeSlot: 'COMMON', category: 'MANUAL', version: '1.0', mediaUrls: [], tags: [], precautions: [], selectedPrecautions: [] })
      fetchManuals()
    } catch (e: any) { setError(e.message) }
  }

  function startEdit(m: Manual) {
    setEditingId(m.id)
    setFormData({
      title: m.title,
      content: m.content,
      workplace: m.workplace,
      timeSlot: m.timeSlot,
      category: m.category,
      version: m.version,
      mediaUrls: m.mediaUrls || [],
      tags: (m.tags || []).map((t) => t.id),
      precautions: [],
      selectedPrecautions: (m.precautions || []).map((p) => p.id),
    })
    requestAnimationFrame(() => {
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      setTimeout(() => titleRef.current?.focus(), 200)
    })
  }

  async function deleteManual(id: string) {
    if (!confirm('메뉴얼을 삭제하시겠습니까?')) return
    try {
      const res = await fetch(`/api/admin/manuals?id=${id}`, { method: 'DELETE', credentials: 'include' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || '삭제 실패')
      setSuccess('삭제 완료')
      fetchManuals()
    } catch (e: any) { setError(e.message) }
  }

  function toggleTag(tagId: string) {
    setFormData((prev) => ({ ...prev, tags: prev.tags.includes(tagId) ? prev.tags.filter((id) => id !== tagId) : [...prev.tags, tagId] }))
  }

  function addNewPrecautionRow() {
    setFormData((prev) => ({ ...prev, precautions: [...prev.precautions, { title: '', content: '', workplace: 'COMMON', timeSlot: 'COMMON', priority: 1 }] }))
  }
  function updateNewPrecaution(idx: number, field: 'title' | 'content', value: string) {
    setFormData((prev) => ({ ...prev, precautions: prev.precautions.map((p, i) => (i === idx ? { ...p, [field]: value } : p)) }))
  }
  function removeNewPrecaution(idx: number) {
    setFormData((prev) => ({ ...prev, precautions: prev.precautions.filter((_, i) => i !== idx) }))
  }

  function toggleExistingPrecaution(id: string) {
    setFormData((prev) => ({ ...prev, selectedPrecautions: prev.selectedPrecautions.includes(id) ? prev.selectedPrecautions.filter((x) => x !== id) : [...prev.selectedPrecautions, id] }))
  }

  // 주의사항 상세보기 모달
  const [viewingPrecaution, setViewingPrecaution] = useState<Precaution | null>(null)

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* 헤더 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">메뉴얼 관리</h1>
          <p className="text-gray-600">업무 메뉴얼을 생성하고 태그/주의사항을 연결합니다.</p>
        </div>

        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {success && (
          <div className="mb-4 bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-green-800">{success}</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* 메뉴얼 생성/수정 폼 */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow p-6" ref={formRef}>
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                {editingId ? '메뉴얼 수정' : '새 메뉴얼 생성'}
              </h2>
              <form onSubmit={submitManual} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">제목 *</label>
                  <input 
                    ref={titleRef} 
                    value={formData.title} 
                    onChange={(e) => setFormData((p) => ({ ...p, title: e.target.value }))} 
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all" 
                    placeholder="메뉴얼 제목을 입력하세요"
                    required 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">내용 *</label>
                  <textarea 
                    value={formData.content} 
                    onChange={(e) => setFormData((p) => ({ ...p, content: e.target.value }))} 
                    rows={8} 
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all resize-none" 
                    placeholder="메뉴얼 내용을 상세히 입력하세요"
                    required 
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">근무처</label>
                    <select 
                      value={formData.workplace} 
                      onChange={(e) => setFormData((p) => ({ ...p, workplace: e.target.value }))} 
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                    >
                      {workplaceOptions.slice(1).map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">시간대</label>
                    <select 
                      value={formData.timeSlot} 
                      onChange={(e) => setFormData((p) => ({ ...p, timeSlot: e.target.value }))} 
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                    >
                      {timeSlotOptions.slice(1).map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">카테고리</label>
                    <select 
                      value={formData.category} 
                      onChange={(e) => setFormData((p) => ({ ...p, category: e.target.value }))} 
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                    >
                      {categoryOptions.slice(1).map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">버전</label>
                    <input 
                      value={formData.version} 
                      onChange={(e) => setFormData((p) => ({ ...p, version: e.target.value }))} 
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all" 
                      placeholder="1.0"
                    />
                  </div>
                </div>

                {/* 태그 */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <label className="block text-sm font-medium text-gray-700">태그</label>
                    <button 
                      type="button" 
                      onClick={() => setShowNewTagModal(true)} 
                      className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs rounded-lg transition-colors"
                    >
                      태그 추가
                    </button>
                  </div>
                  <div className="space-y-3">
                    <div className="flex flex-wrap gap-2 p-4 border border-gray-300 rounded-xl min-h-[60px] bg-gray-50">
                      {(formData.tags || []).length === 0 ? (
                        <span className="text-sm text-gray-500">선택된 태그가 없습니다</span>
                      ) : (
                        (formData.tags || []).map((tid) => {
                          const t = tags.find((x) => x.id === tid)
                          if (!t) return null
                          return (
                            <span 
                              key={tid} 
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium text-white hover:opacity-80 transition-opacity cursor-pointer" 
                              style={{ backgroundColor: t.color }}
                              onClick={() => toggleTag(tid)}
                            >
                              {t.name}
                              <span className="text-xs">✕</span>
                            </span>
                          )
                        })
                      )}
                    </div>
                    <div className="text-center">
                      <button 
                        type="button" 
                        onClick={() => setShowTagModal(true)} 
                        className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm rounded-lg transition-colors border border-gray-300"
                      >
                        기존 태그 선택
                      </button>
                    </div>
                  </div>
                  {/* 태그 선택 목록 */}
                  {showTagModal && (
                    <div className="mt-2 p-3 border rounded bg-gray-50">
                      <input value={tagSearch} onChange={(e) => setTagSearch(e.target.value)} placeholder="태그 검색" className="mb-2 w-full px-3 py-2 border rounded" />
                      <div className="flex flex-wrap gap-2">
                        {tags.filter((t) => !tagSearch || t.name.toLowerCase().includes(tagSearch.toLowerCase())).map((t) => (
                          <button key={t.id} type="button" onClick={() => toggleTag(t.id)} disabled={formData.tags.includes(t.id)} className="px-2 py-1 rounded-full text-xs font-medium border" style={{ backgroundColor: `${t.color}15`, color: t.color, borderColor: `${t.color}40` }}>
                            {t.name}
                          </button>
                        ))}
                      </div>
                      <div className="mt-2 text-right">
                        <button type="button" onClick={() => setShowTagModal(false)} className="px-3 py-1 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors">닫기</button>
                      </div>
                    </div>
                  )}
                </div>

                {/* 주의사항 */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <label className="block text-sm font-medium text-gray-700">주의사항</label>
                    <div className="flex gap-2">
                      <button 
                        type="button" 
                        onClick={() => setShowPrecautionModal(true)} 
                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded-lg transition-colors"
                      >
                        기존 선택
                      </button>
                      <button 
                        type="button" 
                        onClick={() => setShowNewPrecautionModal(true)} 
                        className="px-3 py-1.5 bg-orange-600 hover:bg-orange-700 text-white text-xs rounded-lg transition-colors"
                      >
                        새로 추가
                      </button>
                    </div>
                  </div>

                  {formData.selectedPrecautions.length > 0 && (
                    <div className="mb-2 space-y-2">
                      {formData.selectedPrecautions.map((pid) => {
                        const p = precautions.find((x) => x.id === pid)
                        if (!p) return null
                        return (
                          <div key={pid} className="flex items-center justify-between p-2 bg-blue-50 border border-blue-200 rounded">
                            <div>
                              <div className="text-sm font-medium text-blue-900">{p.title}</div>
                              <div className="text-xs text-blue-800">{p.content.slice(0, 80)}{p.content.length > 80 ? '...' : ''}</div>
                            </div>
                            <button type="button" onClick={() => toggleExistingPrecaution(pid)} className="text-red-600 hover:text-red-800 transition-colors font-medium">제거</button>
                          </div>
                        )
                      })}
                    </div>
                  )}

                  {formData.precautions.length > 0 && (
                    <div className="space-y-3">
                      <h4 className="text-sm font-medium text-gray-700">새 주의사항</h4>
                      {formData.precautions.map((p, i) => (
                        <div key={i} className="border p-3 rounded bg-white">
                          <div className="flex items-center justify-between mb-2">
                            <div className="text-sm font-medium text-gray-700">새 주의사항 {i + 1}</div>
                            <button type="button" onClick={() => removeNewPrecaution(i)} className="text-red-600 hover:text-red-800 transition-colors font-medium">삭제</button>
                          </div>
                          <div className="space-y-2">
                            <input value={p.title} onChange={(e) => updateNewPrecaution(i, 'title', e.target.value)} placeholder="제목" className="w-full px-3 py-2 border rounded" />
                            <textarea value={p.content} onChange={(e) => updateNewPrecaution(i, 'content', e.target.value)} placeholder="내용" className="w-full px-3 py-2 border rounded" rows={3} />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="pt-2">
                  <button 
                    type="submit" 
                    className={`w-full px-6 py-3 rounded-xl text-white font-medium transition-all transform hover:scale-[1.02] shadow-lg ${
                      editingId 
                        ? 'bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700' 
                        : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700'
                    }`}
                  >
                    {editingId ? '메뉴얼 수정 완료' : '메뉴얼 생성'}
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* 메뉴얼 목록 */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow">
              {/* 필터 */}
              <div className="p-6 border-b border-gray-200">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">근무처</label>
                    <select
                      value={filters.workplace}
                      onChange={(e) => setFilters((p) => ({ ...p, workplace: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-400 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                    >
                      {workplaceOptions.map(option => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">시간대</label>
                    <select
                      value={filters.timeSlot}
                      onChange={(e) => setFilters((p) => ({ ...p, timeSlot: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-400 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                    >
                      {timeSlotOptions.map(option => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">카테고리</label>
                    <select
                      value={filters.category}
                      onChange={(e) => setFilters((p) => ({ ...p, category: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-400 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                    >
                      {categoryOptions.map(option => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">검색</label>
                    <div className="relative">
                      <input
                        type="text"
                        value={filters.search}
                        onChange={(e) => setFilters((p) => ({ ...p, search: e.target.value }))}
                        placeholder="제목 또는 내용 검색"
                        className="w-full pl-10 pr-3 py-2 border border-gray-400 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder-gray-500"
                      />
                      <svg className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>
              {/* 메뉴얼 목록 */}
              <div className="p-6">
                {filteredManuals.length === 0 ? (
                  <div className="text-center py-12">
                    <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <h3 className="mt-2 text-sm font-medium text-gray-900">
                      {manuals.length === 0 ? "메뉴얼이 없습니다" : "필터 조건에 맞는 메뉴얼이 없습니다"}
                    </h3>
                    <p className="mt-1 text-sm text-gray-500">
                      {manuals.length === 0 ? "새로운 메뉴얼을 생성해보세요." : "다른 검색 조건을 시도해보세요."}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {filteredManuals.map((m) => (
                      <div key={m.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
                        <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                          <div className="flex-1">
                            <div className="flex flex-wrap items-center gap-2 mb-2">
                              <h3 className="text-base sm:text-lg font-medium text-gray-900 flex-1 min-w-0 truncate pr-2">{m.title}</h3>
                              <div className="flex items-center gap-2 flex-shrink-0">
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                  v{m.version}
                                </span>
                                {m.precautions && m.precautions.length > 0 && (
                                  <div className="flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 border border-red-200">
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                                    </svg>
                                    <span>{m.precautions.length}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                            
                            <div className="text-gray-600 text-sm mb-3">
                              <p className="line-clamp-3 whitespace-pre-wrap">
                                {m.content}
                              </p>
                              {m.content && m.content.length > 0 && (
                                <button 
                                  className="text-blue-600 hover:text-blue-800 text-xs mt-1"
                                  onClick={() => {
                                    // 전체 내용 보기 기능 (필요시 구현)
                                  }}
                                >
                                  전체 내용 보기
                                </button>
                              )}
                            </div>
                            
                            {/* 태그 표시 */}
                            {m.tags && m.tags.length > 0 && (
                              <div className="flex flex-wrap gap-2 mb-3">
                                {m.tags.map((tag) => (
                                  <span
                                    key={tag.id}
                                    className="px-2 py-1 rounded-full text-xs font-medium text-white"
                                    style={{ backgroundColor: tag.color }}
                                  >
                                    {tag.name}
                                  </span>
                                ))}
                              </div>
                            )}
                            
                            <div className="flex items-center gap-3 text-[11px] sm:text-xs text-gray-500 flex-wrap">
                              <span className="inline-flex items-center gap-1">
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                                {getLabel(workplaceOptions, m.workplace)}
                              </span>
                              <span className="inline-flex items-center gap-1">
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                {getLabel(timeSlotOptions, m.timeSlot)}
                              </span>
                              <span className="inline-flex items-center gap-1">
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                {new Date(m.createdAt).toLocaleDateString()}
                              </span>
                              {m.precautions && m.precautions.length > 0 && (
                                <span className="text-orange-600 hidden sm:inline">
                                  ⚠️ {m.precautions.length}개 주의사항
                                </span>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-1 sm:gap-2 sm:ml-4 self-start">
                            <button
                              onClick={() => startEdit(m)}
                              className="p-1.5 sm:p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                            <button
                              onClick={() => deleteManual(m.id)}
                              className="p-1.5 sm:p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        </div>
                        
                        {/* 연결된 주의사항 표시 */}
                        {m.precautions && m.precautions.length > 0 && (
                          <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                            <div className="flex items-center gap-2 mb-2">
                              <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                              </svg>
                              <span className="text-xs font-medium text-red-800">연결된 주의사항</span>
                              <span className="px-1 py-0.5 rounded-full text-xs font-medium bg-red-200 text-red-800">
                                {m.precautions.length}개
                              </span>
                            </div>
                            <div className="space-y-2">
                              {m.precautions.slice(0, 3).map((precaution, index) => (
                                <div 
                                  key={index} 
                                  className="text-xs cursor-pointer hover:bg-red-100 p-2 rounded transition-colors"
                                  onClick={() => setViewingPrecaution(precaution)}
                                >
                                  <div className="font-medium text-red-900">{precaution.title}</div>
                                  <div className="text-red-700 text-xs leading-relaxed">
                                    {precaution.content.length > 20 
                                      ? precaution.content.substring(0, 20) + '...' 
                                      : precaution.content
                                    }
                                  </div>
                                </div>
                              ))}
                              {m.precautions.length > 3 && (
                                <div className="text-xs text-red-600">
                                  + {m.precautions.length - 3}개 더...
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 기존 주의사항 선택 모달 */}
        {showPrecautionModal && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg w-full max-w-3xl p-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-bold text-gray-900">기존 주의사항 선택</h3>
                <button onClick={() => setShowPrecautionModal(false)} className="text-gray-500 hover:text-gray-700 transition-colors">✕</button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                <input value={precautionFilter.search} onChange={(e) => setPrecautionFilter((p) => ({ ...p, search: e.target.value }))} placeholder="검색" className="px-3 py-2 border rounded" />
                <select value={precautionFilter.workplace} onChange={(e) => setPrecautionFilter((p) => ({ ...p, workplace: e.target.value }))} className="px-3 py-2 border rounded">
                  {workplaceOptions.map((o) => (<option key={o.value} value={o.value}>{o.label}</option>))}
                </select>
                <select value={precautionFilter.timeSlot} onChange={(e) => setPrecautionFilter((p) => ({ ...p, timeSlot: e.target.value }))} className="px-3 py-2 border rounded">
                  {timeSlotOptions.map((o) => (<option key={o.value} value={o.value}>{o.label}</option>))}
                </select>
              </div>
              <div className="max-h-96 overflow-y-auto border rounded">
                {loadingPrecautions ? (
                  <div className="p-6 text-center text-gray-500">불러오는 중...</div>
                ) : (
                  (precautions.filter((p) => {
                    const s = precautionFilter.search.trim().toLowerCase()
                    const ms = !s || p.title.toLowerCase().includes(s) || p.content.toLowerCase().includes(s)
                    const mw = precautionFilter.workplace === 'ALL' || p.workplace === precautionFilter.workplace
                    const mt = precautionFilter.timeSlot === 'ALL' || p.timeSlot === precautionFilter.timeSlot
                    return ms && mw && mt
                  })).map((p) => {
                    const selected = formData.selectedPrecautions.includes(p.id)
                    return (
                      <div key={p.id} className={`p-3 border-b cursor-pointer ${selected ? 'bg-blue-50' : ''}`} onClick={() => toggleExistingPrecaution(p.id)}>
                        <div className="font-medium text-gray-900">{p.title}</div>
                        <div className="text-sm text-gray-700 line-clamp-2">{p.content}</div>
                      </div>
                    )
                  })
                )}
              </div>
              <div className="mt-3 text-right">
                <button onClick={() => setShowPrecautionModal(false)} className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors">닫기</button>
              </div>
            </div>
          </div>
        )}

        {/* 새 주의사항 생성 모달 */}
        {showNewPrecautionModal && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg w-full max-w-2xl p-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-bold text-gray-900">새 주의사항 생성</h3>
                <button onClick={() => setShowNewPrecautionModal(false)} className="text-gray-500 hover:text-gray-700 transition-colors">✕</button>
              </div>
              <form onSubmit={async (e) => {
                e.preventDefault()
                try {
                  const res = await fetch('/api/admin/precautions', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newPrecaution) })
                  const data = await res.json().catch(() => ({}))
                  if (!res.ok) throw new Error(data.error || '생성 실패')
                  if (data?.precaution?.id) setFormData((prev) => ({ ...prev, selectedPrecautions: [...prev.selectedPrecautions, data.precaution.id] }))
                  setShowNewPrecautionModal(false)
                  setNewPrecaution({ title: '', content: '', workplace: 'COMMON', timeSlot: 'COMMON', priority: 1, tags: [] })
                  setSuccess('주의사항 생성 완료')
                  fetchPrecautions()
                } catch (e: any) { setError(e.message) }
              }} className="space-y-3">
                <input value={newPrecaution.title} onChange={(e) => setNewPrecaution((p) => ({ ...p, title: e.target.value }))} placeholder="제목" className="w-full px-3 py-2 border rounded" required />
                <textarea value={newPrecaution.content} onChange={(e) => setNewPrecaution((p) => ({ ...p, content: e.target.value }))} placeholder="내용" className="w-full px-3 py-2 border rounded" rows={4} required />
                <div className="grid grid-cols-3 gap-3">
                  <select value={newPrecaution.workplace} onChange={(e) => setNewPrecaution((p) => ({ ...p, workplace: e.target.value }))} className="px-3 py-2 border rounded">
                    {workplaceOptions.slice(1).map((o) => (<option key={o.value} value={o.value}>{o.label}</option>))}
                  </select>
                  <select value={newPrecaution.timeSlot} onChange={(e) => setNewPrecaution((p) => ({ ...p, timeSlot: e.target.value }))} className="px-3 py-2 border rounded">
                    {timeSlotOptions.slice(1).map((o) => (<option key={o.value} value={o.value}>{o.label}</option>))}
                  </select>
                  <select value={newPrecaution.priority} onChange={(e) => setNewPrecaution((p) => ({ ...p, priority: parseInt(e.target.value) }))} className="px-3 py-2 border rounded">
                    <option value={1}>낮음</option>
                    <option value={2}>보통</option>
                    <option value={3}>높음</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">태그</label>
                  <div className="flex flex-wrap gap-2 p-3 border rounded min-h-[48px] bg-gray-50">
                    {newPrecaution.tags.length === 0 ? (
                      <span className="text-sm text-gray-500">선택된 태그가 없습니다</span>
                    ) : (
                      newPrecaution.tags.map((tagId) => {
                        const tag = tags.find(t => t.id === tagId)
                        if (!tag) return null
                        return (
                          <span 
                            key={tagId} 
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs text-white cursor-pointer hover:opacity-80"
                            style={{ backgroundColor: tag.color }}
                            onClick={() => setNewPrecaution(p => ({ ...p, tags: p.tags.filter(id => id !== tagId) }))}
                          >
                            {tag.name}
                            <span>✕</span>
                          </span>
                        )
                      })
                    )}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {tags.filter(t => !newPrecaution.tags.includes(t.id)).map((tag) => (
                      <button
                        key={tag.id}
                        type="button"
                        onClick={() => setNewPrecaution(p => ({ ...p, tags: [...p.tags, tag.id] }))}
                        className="px-2 py-1 text-xs border rounded-full hover:bg-gray-50 transition-colors"
                        style={{ color: tag.color, borderColor: tag.color }}
                      >
                        {tag.name}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="text-right">
                  <button type="submit" className="px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700 transition-colors">생성</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* 새 태그 생성 모달 */}
        {showNewTagModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-gray-900">새 태그 생성</h3>
                <button 
                  onClick={() => setShowNewTagModal(false)} 
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <form onSubmit={async (e) => {
                e.preventDefault()
                try {
                  const res = await fetch('/api/admin/tags', { 
                    method: 'POST', 
                    credentials: 'include', 
                    headers: { 'Content-Type': 'application/json' }, 
                    body: JSON.stringify(newTag) 
                  })
                  const data = await res.json()
                  if (!res.ok) throw new Error(data.error || '태그 생성 실패')
                  
                  setTags(prev => [...prev, data])
                  setFormData(prev => ({ ...prev, tags: [...prev.tags, data.id] }))
                  setShowNewTagModal(false)
                  setNewTag({ name: '', color: '#3B82F6' })
                  setSuccess('태그가 생성되었습니다')
                } catch (e: any) { 
                  setError(e.message) 
                }
              }} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">태그 이름</label>
                  <input 
                    value={newTag.name} 
                    onChange={(e) => setNewTag(p => ({ ...p, name: e.target.value }))} 
                    placeholder="태그 이름을 입력하세요" 
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all" 
                    required 
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">태그 색상</label>
                  <div className="flex items-center gap-3">
                    <input 
                      type="color" 
                      value={newTag.color} 
                      onChange={(e) => setNewTag(p => ({ ...p, color: e.target.value }))} 
                      className="w-12 h-12 border border-gray-300 rounded-lg cursor-pointer"
                    />
                    <div className="flex-1">
                      <input 
                        type="text" 
                        value={newTag.color} 
                        onChange={(e) => setNewTag(p => ({ ...p, color: e.target.value }))} 
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 font-mono text-sm"
                        placeholder="#3B82F6"
                      />
                    </div>
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <span className="text-sm text-gray-600">미리보기:</span>
                    <span 
                      className="px-3 py-1 rounded-full text-sm text-white font-medium"
                      style={{ backgroundColor: newTag.color }}
                    >
                      {newTag.name || '태그 이름'}
                    </span>
                  </div>
                </div>
                
                <div className="flex gap-3 pt-4">
                  <button 
                    type="button"
                    onClick={() => setShowNewTagModal(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    취소
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                  >
                    생성
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* 주의사항 상세보기 모달 */}
        {viewingPrecaution && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl w-full max-w-2xl p-6 shadow-2xl">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                  주의사항 상세보기
                </h3>
                <button 
                  onClick={() => setViewingPrecaution(null)} 
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-2">{viewingPrecaution.title}</h4>
                  <div className="flex items-center gap-3 mb-4">
                    <span className={`px-3 py-1 text-sm font-medium rounded-full ${
                      viewingPrecaution.priority === 1 ? 'bg-green-100 text-green-700' :
                      viewingPrecaution.priority === 2 ? 'bg-yellow-100 text-yellow-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      우선순위: {viewingPrecaution.priority === 1 ? '낮음' : viewingPrecaution.priority === 2 ? '보통' : '높음'}
                    </span>
                    <span className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-full">
                      {getLabel(workplaceOptions, viewingPrecaution.workplace)}
                    </span>
                    <span className="px-3 py-1 text-sm bg-purple-100 text-purple-700 rounded-full">
                      {getLabel(timeSlotOptions, viewingPrecaution.timeSlot)}
                    </span>
                  </div>
                </div>
                
                <div className="bg-gray-50 rounded-xl p-4">
                  <h5 className="text-sm font-medium text-gray-700 mb-2">내용</h5>
                  <p className="text-gray-800 leading-relaxed whitespace-pre-wrap">{viewingPrecaution.content}</p>
                </div>
                
                {viewingPrecaution.tags && viewingPrecaution.tags.length > 0 && (
                  <div>
                    <h5 className="text-sm font-medium text-gray-700 mb-2">연결된 태그</h5>
                    <div className="flex flex-wrap gap-2">
                      {viewingPrecaution.tags.map((tag) => (
                        <span 
                          key={tag.id} 
                          className="px-3 py-1 rounded-full text-sm text-white font-medium"
                          style={{ backgroundColor: tag.color }}
                        >
                          {tag.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              
              <div className="mt-6 text-right">
                <button 
                  onClick={() => setViewingPrecaution(null)}
                  className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                >
                  닫기
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}


