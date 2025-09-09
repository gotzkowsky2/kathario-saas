"use client";

import { useEffect, useState } from 'react'

interface Tag { id: string; name: string; color: string }
interface Precaution {
  id: string
  title: string
  content: string
  workplace: string
  timeSlot: string
  priority: number
  isActive?: boolean
  createdAt?: string
  updatedAt?: string
  tags?: Tag[]
}

const workplaceOptions = [
  { value: 'HALL', label: '홀' },
  { value: 'KITCHEN', label: '주방' },
  { value: 'COMMON', label: '공통' },
]
const timeSlotOptions = [
  { value: 'PREPARATION', label: '준비' },
  { value: 'IN_PROGRESS', label: '진행' },
  { value: 'CLOSING', label: '마감' },
  { value: 'COMMON', label: '공통' },
]
const priorityOptions = [
  { value: 1, label: '높음' },
  { value: 2, label: '보통' },
  { value: 3, label: '낮음' },
]

export default function PrecautionsAdminPage() {
  const [precautions, setPrecautions] = useState<Precaution[]>([])
  const [tags, setTags] = useState<Tag[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [filters, setFilters] = useState({ search: '', workplace: '', timeSlot: '', priority: '' })
  const [showFilters, setShowFilters] = useState(false)
  const [filterTags, setFilterTags] = useState<string[]>([])

  const [form, setForm] = useState({ title: '', content: '', workplace: 'HALL', timeSlot: 'PREPARATION', priority: 1, tags: [] as string[] })
  const [editingId, setEditingId] = useState<string | null>(null)
  const [edit, setEdit] = useState({ title: '', content: '', workplace: 'HALL', timeSlot: 'PREPARATION', priority: 1, tags: [] as string[] })

  const [pickerSearch, setPickerSearch] = useState('')
  const [editPickerSearch, setEditPickerSearch] = useState('')
  const [filterTagSearch, setFilterTagSearch] = useState('')
  const [showTagModal, setShowTagModal] = useState(false)
  const [newTagName, setNewTagName] = useState('')
  const [newTagColor, setNewTagColor] = useState('#3B82F6')

  async function fetchPrecautions() {
    try {
      setLoading(true)
      const res = await fetch('/api/admin/precautions', { credentials: 'include' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || '조회 실패')
      setPrecautions(Array.isArray(data) ? data : (data.precautions || []))
    } catch (e: any) { setError(e.message) } finally { setLoading(false) }
  }
  async function fetchTags() {
    try { const r = await fetch('/api/admin/tags', { credentials: 'include' }); if (r.ok) setTags(await r.json()) } catch {}
  }

  useEffect(() => { fetchPrecautions(); fetchTags() }, [])
  useEffect(() => { if (success) setTimeout(() => setSuccess(''), 2000) }, [success])

  const filtered = precautions.filter((p) => {
    const s = filters.search.trim().toLowerCase()
    const ms = !s || p.title.toLowerCase().includes(s) || p.content.toLowerCase().includes(s)
    const mw = !filters.workplace || p.workplace === filters.workplace
    const mt = !filters.timeSlot || p.timeSlot === filters.timeSlot
    const mp = !filters.priority || p.priority === parseInt(filters.priority)
    const mtags = filterTags.length === 0 || filterTags.every((tid) => (p.tags || []).some((t) => t.id === tid))
    return ms && mw && mt && mp && mtags
  })

  async function createPrecaution(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      const res = await fetch('/api/admin/precautions', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || '등록 실패')
      setForm({ title: '', content: '', workplace: 'HALL', timeSlot: 'PREPARATION', priority: 1, tags: [] })
      setSuccess('등록 완료')
      fetchPrecautions()
    } catch (e: any) { 
      setError(e.message) 
    } finally {
      setSubmitting(false)
    }
  }

  function startEdit(p: Precaution) {
    setEditingId(p.id)
    setEdit({ title: p.title, content: p.content, workplace: p.workplace, timeSlot: p.timeSlot, priority: p.priority, tags: (p.tags || []).map((t) => t.id) })
  }
  function cancelEdit() { 
    setEditingId(null); 
    setEdit({ title: '', content: '', workplace: 'HALL', timeSlot: 'PREPARATION', priority: 1, tags: [] });
    setEditPickerSearch('');
  }

  async function submitEdit(e: React.FormEvent) {
    e.preventDefault(); setError('')
    if (!editingId) return
    try {
      const res = await fetch('/api/admin/precautions', { method: 'PUT', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...edit, id: editingId }) })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || '수정 실패')
      cancelEdit(); setSuccess('수정 완료'); fetchPrecautions()
    } catch (e: any) { setError(e.message) }
  }

  async function remove(id: string) {
    if (!confirm('삭제하시겠습니까?')) return
    try {
      const res = await fetch(`/api/admin/precautions?id=${id}`, { method: 'DELETE', credentials: 'include' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || '삭제 실패')
      setSuccess('삭제 완료'); fetchPrecautions()
    } catch (e: any) { setError(e.message) }
  }

  async function createTag() {
    if (!newTagName.trim()) return
    try {
      const res = await fetch('/api/admin/tags', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: newTagName.trim(), color: newTagColor }) })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || '태그 생성 실패')
      setNewTagName(''); setNewTagColor('#3B82F6'); setShowTagModal(false); fetchTags()
      setSuccess('태그 생성 완료')
    } catch (e: any) { setError(e.message) }
  }

  function clearFilters() {
    setFilters({ search: '', workplace: '', timeSlot: '', priority: '' })
    setFilterTags([])
    setFilterTagSearch('')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-red-50 to-pink-50 p-3 sm:p-4 overflow-x-hidden">
      <div className="max-w-6xl mx-auto w-full max-w-full">
        {/* 헤더 */}
        <div className="mb-6 sm:mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl flex items-center justify-center shadow-lg">
              <svg className="w-4 h-4 sm:w-5 sm:h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">주의사항 관리</h1>
          </div>
          <p className="text-gray-600 text-sm sm:text-base ml-11 sm:ml-13">안전하고 효율적인 업무를 위한 주의사항을 관리합니다</p>
        </div>

        {/* 알림 메시지 */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 border-l-4 border-red-400 rounded-r-xl shadow-sm">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-red-400 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-red-800 text-sm font-medium">{error}</p>
            </div>
          </div>
        )}
        
        {success && (
          <div className="mb-4 p-4 bg-green-50 border-l-4 border-green-400 rounded-r-xl shadow-sm">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-green-400 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-green-800 text-sm font-medium">{success}</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8 w-full max-w-full overflow-hidden">
          {/* 등록 폼 */}
          <div className="lg:col-span-1 w-full max-w-full overflow-hidden">
            <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl border border-white/50 p-4 sm:p-6 w-full max-w-full overflow-hidden">
              <div className="flex items-center gap-3 mb-4 sm:mb-6">
                <div className="w-6 h-6 bg-gradient-to-br from-orange-500 to-red-600 rounded-lg flex items-center justify-center">
                  <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </div>
                <h2 className="text-lg sm:text-xl font-bold text-gray-800">새 주의사항 등록</h2>
              </div>
              <form onSubmit={createPrecaution} className="space-y-4 sm:space-y-5">
                {/* 빠른 설정 */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                      <svg className="w-4 h-4 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                      근무지 *
                    </label>
                    <div className="relative">
                      <select
                        value={form.workplace}
                        onChange={(e)=>setForm((p)=>({ ...p, workplace: e.target.value }))}
                        className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent text-gray-800 text-sm bg-gray-50 hover:bg-white transition-colors appearance-none"
                        required
                      >
                        {workplaceOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                      <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                      <svg className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>

                  <div>
                    <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                      <svg className="w-4 h-4 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      시간대 *
                    </label>
                    <div className="relative">
                      <select
                        value={form.timeSlot}
                        onChange={(e)=>setForm((p)=>({ ...p, timeSlot: e.target.value }))}
                        className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent text-gray-800 text-sm bg-gray-50 hover:bg-white transition-colors appearance-none"
                        required
                      >
                        {timeSlotOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                      <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <svg className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>

                  <div>
                    <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                      <svg className="w-4 h-4 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11.5V14m0-2.5v-6a1.5 1.5 0 113 0m-3 6a1.5 1.5 0 00-3 0v2a7.5 7.5 0 0015 0v-5a1.5 1.5 0 00-3 0m-6-3V11m0-5.5v-1a1.5 1.5 0 013 0v1m0 0V11m0-5.5a1.5 1.5 0 013 0v3m0 0V11" />
                      </svg>
                      우선순위 *
                    </label>
                    <div className="relative">
                      <select
                        value={form.priority}
                        onChange={(e)=>setForm((p)=>({ ...p, priority: parseInt(e.target.value) }))}
                        className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent text-gray-800 text-sm bg-gray-50 hover:bg-white transition-colors appearance-none"
                        required
                      >
                        {priorityOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                      <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11.5V14m0-2.5v-6a1.5 1.5 0 113 0m-3 6a1.5 1.5 0 00-3 0v2a7.5 7.5 0 0015 0v-5a1.5 1.5 0 00-3 0m-6-3V11m0-5.5v-1a1.5 1.5 0 013 0v1m0 0V11m0-5.5a1.5 1.5 0 013 0v3m0 0V11" />
                      </svg>
                      <svg className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                </div>
                {/* 제목 */}
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                    <svg className="w-4 h-4 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                    </svg>
                    제목 *
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={form.title}
                      onChange={(e)=>setForm((p)=>({ ...p, title: e.target.value }))}
                      className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent text-gray-800 text-sm bg-gray-50 hover:bg-white transition-colors placeholder-gray-400"
                      placeholder="주의사항 제목을 입력하세요"
                      required
                    />
                    <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                    </svg>
                  </div>
                </div>

                {/* 내용 */}
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                    <svg className="w-4 h-4 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    내용 *
                  </label>
                  <div className="relative">
                    <textarea
                      value={form.content}
                      onChange={(e)=>setForm((p)=>({ ...p, content: e.target.value }))}
                      rows={4}
                      className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent text-gray-800 text-sm bg-gray-50 hover:bg-white transition-colors resize-y placeholder-gray-400"
                      placeholder="주의사항 내용을 상세히 입력하세요"
                      required
                    />
                    <svg className="absolute left-3 top-3 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                </div>
                {/* 태그 선택 */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                      <svg className="w-4 h-4 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                      </svg>
                      태그
                    </label>
                    <button 
                      type="button" 
                      onClick={() => setShowTagModal(true)} 
                      className="flex items-center gap-1 px-3 py-1.5 bg-gradient-to-r from-orange-500 to-red-600 text-white text-xs font-medium rounded-lg hover:from-orange-600 hover:to-red-700 transition-all shadow-sm"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      태그 추가
                    </button>
                  </div>
                  <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                    <div className="relative mb-3">
                      <input 
                        value={pickerSearch} 
                        onChange={(e)=>setPickerSearch(e.target.value)} 
                        placeholder="태그 검색..." 
                        className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-orange-500 focus:border-transparent placeholder-gray-400" 
                      />
                      <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
                      </svg>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {tags.filter(t=>!pickerSearch||t.name.toLowerCase().includes(pickerSearch.toLowerCase())).map((t)=>{
                        const selected = form.tags.includes(t.id)
                        return (
                          <button 
                            key={t.id} 
                            type="button" 
                            onClick={()=>setForm((p)=>({ ...p, tags: selected ? p.tags.filter(id=>id!==t.id) : [...p.tags, t.id] }))} 
                            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all transform hover:scale-105 ${selected ? 'shadow-md' : 'hover:shadow-sm'}`}
                            style={{ 
                              backgroundColor: selected ? t.color : `${t.color}15`, 
                              color: selected ? 'white' : t.color, 
                              border: `2px solid ${selected ? t.color : `${t.color}40`}` 
                            }}
                          >
                            {selected && (
                              <svg className="w-3 h-3 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                            {t.name}
                          </button>
                        )
                      })}
                      {tags.filter(t=>!pickerSearch||t.name.toLowerCase().includes(pickerSearch.toLowerCase())).length === 0 && (
                        <p className="text-gray-500 text-sm py-2">검색 결과가 없습니다</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* 제출 버튼 */}
                <button 
                  type="submit" 
                  disabled={submitting} 
                  className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-orange-500 to-red-600 text-white font-semibold rounded-xl hover:from-orange-600 hover:to-red-700 focus:ring-4 focus:ring-orange-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl transform hover:scale-[1.02] active:scale-[0.98]"
                >
                  {submitting ? (
                    <>
                      <svg className="animate-spin w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      등록 중...
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      주의사항 등록
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>

          {/* 목록 */}
          <div className="lg:col-span-2 w-full max-w-full overflow-hidden">
            <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl border border-white/50 p-4 sm:p-6 mb-4 w-full max-w-full overflow-hidden">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 bg-gradient-to-br from-orange-500 to-red-600 rounded-lg flex items-center justify-center">
                    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-bold text-gray-900">검색 및 필터</h3>
                </div>
                <div className="flex gap-2">
                  <button 
                    type="button" 
                    onClick={clearFilters} 
                    className="flex items-center gap-1 px-3 py-1.5 text-xs bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    초기화
                  </button>
                  <button 
                    type="button" 
                    onClick={()=>setShowFilters(!showFilters)} 
                    className="flex items-center gap-1 px-3 py-1.5 text-xs bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200 transition-colors"
                  >
                    <svg className={`w-3 h-3 transition-transform ${showFilters ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                    {showFilters ? '접기' : '펼치기'}
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 w-full max-w-full overflow-hidden">
                <input value={filters.search} onChange={(e)=>setFilters((p)=>({ ...p, search: e.target.value }))} placeholder="검색" className="w-full px-3 py-2 border rounded text-gray-900 min-w-0" />
                <select value={filters.workplace} onChange={(e)=>setFilters((p)=>({ ...p, workplace: e.target.value }))} className="w-full px-3 py-2 border rounded text-gray-900 min-w-0"><option value="">전체 근무처</option>{workplaceOptions.map((o)=>(<option key={o.value} value={o.value}>{o.label}</option>))}</select>
                <select value={filters.timeSlot} onChange={(e)=>setFilters((p)=>({ ...p, timeSlot: e.target.value }))} className="w-full px-3 py-2 border rounded text-gray-900 min-w-0"><option value="">전체 시간대</option>{timeSlotOptions.map((o)=>(<option key={o.value} value={o.value}>{o.label}</option>))}</select>
                <select value={filters.priority} onChange={(e)=>setFilters((p)=>({ ...p, priority: e.target.value }))} className="w-full px-3 py-2 border rounded text-gray-900 min-w-0"><option value="">전체 우선순위</option>{priorityOptions.map((o)=>(<option key={o.value} value={o.value}>{o.label}</option>))}</select>
              </div>
              {showFilters && (
                <div className="mt-4 w-full max-w-full overflow-hidden">
                  <label className="block text-sm font-medium text-gray-700 mb-2">태그 필터</label>
                  <input value={filterTagSearch} onChange={(e)=>setFilterTagSearch(e.target.value)} placeholder="태그 검색" className="w-full px-2 py-2 border rounded mb-2 min-w-0" />
                  <div className="flex flex-wrap gap-2 max-h-28 overflow-y-auto w-full max-w-full overflow-x-hidden">
                    {tags.filter(t=>!filterTagSearch||t.name.toLowerCase().includes(filterTagSearch.toLowerCase())).map((t)=>{
                      const sel = filterTags.includes(t.id)
                      return (
                        <button key={t.id} type="button" onClick={()=>setFilterTags((prev)=> sel? prev.filter(id=>id!==t.id): [...prev, t.id])} className={`px-3 py-1 rounded-full text-sm ${sel? 'bg-blue-600 text-white':'bg-gray-100 text-gray-700 hover:bg-gray-200'}`} style={{ backgroundColor: sel? undefined : `${t.color}20`, color: sel? undefined : t.color }}>
                          {t.name}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* 주의사항 목록 */}
            <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-full overflow-hidden">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-gray-800">등록된 주의사항 목록</h2>
                <span className="text-sm text-gray-600">
                  총 {filtered.length}개 (전체 {precautions.length}개)
                </span>
              </div>
              
              {filtered.length === 0 ? (
                <div className="text-center text-gray-500 py-8">
                  {precautions.length === 0 ? "등록된 주의사항이 없습니다." : "필터 조건에 맞는 주의사항이 없습니다."}
                </div>
              ) : (
                <div className="space-y-4">
                  {filtered.map((p) => (
                    <div key={p.id} className="border border-gray-200 rounded-lg p-4">
                      {editingId === p.id ? (
                        <form onSubmit={submitEdit} className="space-y-3">
                          <div className="grid grid-cols-3 gap-3">
                            <select value={edit.workplace} onChange={(e)=>setEdit((s)=>({ ...s, workplace: e.target.value }))} className="px-3 py-2 border rounded text-gray-900">{workplaceOptions.map((o)=>(<option key={o.value} value={o.value}>{o.label}</option>))}</select>
                            <select value={edit.timeSlot} onChange={(e)=>setEdit((s)=>({ ...s, timeSlot: e.target.value }))} className="px-3 py-2 border rounded text-gray-900">{timeSlotOptions.map((o)=>(<option key={o.value} value={o.value}>{o.label}</option>))}</select>
                            <select value={edit.priority} onChange={(e)=>setEdit((s)=>({ ...s, priority: parseInt(e.target.value) }))} className="px-3 py-2 border rounded text-gray-900">{priorityOptions.map((o)=>(<option key={o.value} value={o.value}>{o.label}</option>))}</select>
                          </div>
                          <input value={edit.title} onChange={(e)=>setEdit((s)=>({ ...s, title: e.target.value }))} className="w-full px-3 py-2 border rounded text-gray-900" required />
                          <textarea value={edit.content} onChange={(e)=>setEdit((s)=>({ ...s, content: e.target.value }))} className="w-full px-3 py-2 border rounded text-gray-900" rows={4} required />
                          {/* 태그 선택 */}
                          <div>
                            <div className="flex items-center justify-between mb-3">
                              <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                                <svg className="w-4 h-4 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                                </svg>
                                태그
                              </label>
                              <button 
                                type="button" 
                                onClick={() => setShowTagModal(true)} 
                                className="flex items-center gap-1 px-3 py-1.5 bg-gradient-to-r from-orange-500 to-red-600 text-white text-xs font-medium rounded-lg hover:from-orange-600 hover:to-red-700 transition-all shadow-sm"
                              >
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                </svg>
                                태그 추가
                              </button>
                            </div>
                            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                              <div className="relative mb-3">
                                <input 
                                  value={editPickerSearch} 
                                  onChange={(e)=>setEditPickerSearch(e.target.value)} 
                                  placeholder="태그 검색..." 
                                  className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-orange-500 focus:border-transparent placeholder-gray-400" 
                                />
                                <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
                                </svg>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                {tags.filter(t=>!editPickerSearch||t.name.toLowerCase().includes(editPickerSearch.toLowerCase())).map((t)=>{
                                  const selected = edit.tags.includes(t.id)
                                  return (
                                    <button 
                                      key={t.id} 
                                      type="button" 
                                      onClick={()=>setEdit((s)=>({ ...s, tags: selected ? s.tags.filter(id=>id!==t.id) : [...s.tags, t.id] }))} 
                                      className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all transform hover:scale-105 ${selected ? 'shadow-md' : 'hover:shadow-sm'}`}
                                      style={{ 
                                        backgroundColor: selected ? t.color : `${t.color}15`, 
                                        color: selected ? 'white' : t.color, 
                                        border: `2px solid ${selected ? t.color : `${t.color}40`}` 
                                      }}
                                    >
                                      {selected && (
                                        <svg className="w-3 h-3 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                      )}
                                      {t.name}
                                    </button>
                                  )
                                })}
                                {tags.filter(t=>!editPickerSearch||t.name.toLowerCase().includes(editPickerSearch.toLowerCase())).length === 0 && (
                                  <p className="text-gray-500 text-sm py-2">검색 결과가 없습니다</p>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex gap-3">
                            <button 
                              type="submit" 
                              className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-orange-500 to-red-600 text-white font-semibold rounded-xl hover:from-orange-600 hover:to-red-700 focus:ring-4 focus:ring-orange-200 transition-all shadow-lg hover:shadow-xl transform hover:scale-[1.02] active:scale-[0.98]"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                              수정 완료
                            </button>
                            <button 
                              type="button" 
                              onClick={cancelEdit} 
                              className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gray-500 text-white font-semibold rounded-xl hover:bg-gray-600 focus:ring-4 focus:ring-gray-200 transition-all shadow-lg hover:shadow-xl transform hover:scale-[1.02] active:scale-[0.98]"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                              취소
                            </button>
                          </div>
                        </form>
                      ) : (
                        <div>
                          <div className="flex justify-between items-start mb-3">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 sm:gap-3 mb-2">
                                <h3 className="text-base sm:text-lg font-semibold text-gray-800">{p.title}</h3>
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                  p.priority === 1 ? 'bg-red-100 text-red-800' :
                                  p.priority === 2 ? 'bg-yellow-100 text-yellow-800' :
                                  'bg-green-100 text-green-800'
                                }`}>
                                  {({1:'높음',2:'보통',3:'낮음'} as Record<number,string>)[p.priority] || String(p.priority)}
                                </span>
                                <div className="ml-auto flex items-center gap-1 sm:gap-2">
                                  <button
                                    onClick={() => startEdit(p)}
                                    className="p-1.5 sm:p-2 bg-yellow-500 text-white rounded hover:bg-yellow-600 transition"
                                    title="수정"
                                  >
                                    <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                    </svg>
                                  </button>
                                  <button
                                    onClick={() => remove(p.id)}
                                    className="p-1.5 sm:p-2 bg-red-500 text-white rounded hover:bg-red-600 transition"
                                    title="삭제"
                                  >
                                    <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                  </button>
                                </div>
                              </div>
                              <p className="text-gray-700 mb-3 whitespace-pre-wrap">{p.content}</p>
                              
                              {/* 태그 표시 */}
                              {p.tags && p.tags.length > 0 && (
                                <div className="flex flex-wrap gap-2 mb-3">
                                  {p.tags.map((tag) => (
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
                              
                              <div className="flex items-center gap-2 text-xs text-gray-600 flex-wrap sm:flex-nowrap sm:overflow-x-auto">
                                <span className="flex items-center gap-1 whitespace-nowrap">
                                  <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                  </svg>
                                  <span className="truncate">{workplaceOptions.find(o=>o.value===p.workplace)?.label||p.workplace}</span>
                                </span>
                                <span className="flex items-center gap-1 whitespace-nowrap">
                                  <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                  <span className="truncate">{timeSlotOptions.find(o=>o.value===p.timeSlot)?.label||p.timeSlot}</span>
                                </span>
                                <span className="flex items-center gap-1 whitespace-nowrap">
                                  <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                  </svg>
                                  <span className="truncate">{new Date(p.createdAt || Date.now()).toLocaleDateString('ko-KR')}</span>
                                </span>
                              </div>
                            </div>
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

      {showTagModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-gray-900">새 태그 생성</h3>
              <button onClick={() => setShowTagModal(false)} className="text-gray-500">✕</button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">태그 이름 *</label>
                <input value={newTagName} onChange={(e)=>setNewTagName(e.target.value)} placeholder="예: 청소용품" className="w-full px-3 py-2 border rounded text-gray-900" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">태그 색상</label>
                <div className="flex items-center gap-2">
                  <input type="color" value={newTagColor} onChange={(e)=>setNewTagColor(e.target.value)} className="w-12 h-10 border rounded" />
                  <input value={newTagColor} onChange={(e)=>setNewTagColor(e.target.value)} className="flex-1 px-3 py-2 border rounded text-gray-900" />
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <button onClick={createTag} className="flex-1 px-4 py-2 bg-blue-600 text-white rounded">생성</button>
                <button onClick={()=>setShowTagModal(false)} className="flex-1 px-4 py-2 bg-gray-600 text-white rounded">취소</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

{/* 태그 생성 모달 */}
{/* 컴포넌트 파일이 client 컴포넌트이므로 동일 파일 내 조건부 렌더링 */}
// 아래 블록은 컴포넌트 반환 밖에서는 렌더되지 않으므로, 상단 반환 내에 포함해야 함.


