"use client";

import { useEffect, useState } from 'react'

interface Tag { id: string; name: string; color: string; createdAt?: string }

export default function TagsPage() {
  const [tags, setTags] = useState<Tag[]>([])
  const [search, setSearch] = useState('')
  const [newName, setNewName] = useState('')
  const [newColor, setNewColor] = useState('#3B82F6')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')
  const [editingColor, setEditingColor] = useState('#3B82F6')

  async function fetchTags() {
    try {
      const query = search ? `?q=${encodeURIComponent(search)}` : ''
      const res = await fetch(`/api/admin/tags${query}`, { credentials: 'include', cache: 'no-store' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || '목록 조회 실패')
      setTags(data)
    } catch (e: any) { setError(e.message) }
  }

  async function createTag() {
    if (!newName.trim()) { setError('태그 이름을 입력하세요'); return }
    setLoading(true); setError('')
    try {
      const res = await fetch('/api/admin/tags', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: newName, color: newColor }) })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || '생성 실패')
      setNewName(''); setNewColor('#3B82F6'); fetchTags()
    } catch (e: any) { setError(e.message) } finally { setLoading(false) }
  }

  async function deleteTag(id: string) {
    if (!confirm('이 태그를 삭제하시겠습니까?')) return
    try {
      const res = await fetch(`/api/admin/tags/${id}`, { method: 'DELETE', credentials: 'include' })
      if (!res.ok) { const d = await res.json().catch(()=>({})); throw new Error(d.error || '삭제 실패') }
      fetchTags()
    } catch (e: any) { setError(e.message) }
  }

  async function saveEdit() {
    if (!editingId) return
    try {
      const res = await fetch(`/api/admin/tags/${editingId}`, { method: 'PUT', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: editingName, color: editingColor }) })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || '수정 실패')
      setEditingId(null); setEditingName(''); setEditingColor('#3B82F6'); fetchTags()
    } catch (e: any) { setError(e.message) }
  }

  useEffect(() => { fetchTags() }, [search])

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">태그 관리</h1>
        </div>

        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="flex items-center gap-3 flex-wrap">
            <input value={search} onChange={(e)=>setSearch(e.target.value)} placeholder="태그 검색" className="px-3 py-2 border rounded w-48" />
            <button onClick={fetchTags} className="px-3 py-2 border rounded">검색</button>
            <input value={newName} onChange={(e)=>setNewName(e.target.value)} placeholder="태그 이름" className="flex-1 min-w-[160px] px-4 py-2 border rounded" />
            <input type="color" value={newColor} onChange={(e)=>setNewColor(e.target.value)} className="w-12 h-10 border rounded" />
            <button onClick={createTag} disabled={loading} className="px-5 py-2 bg-blue-600 text-white rounded disabled:opacity-50">{loading?'생성 중...':'생성'}</button>
          </div>
          {error && <p className="text-red-600 mt-2">{error}</p>}
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <h2 className="font-semibold mb-3 text-gray-900">등록된 태그 ({tags.length}개)</h2>
          {tags.length === 0 ? (
            <p className="text-gray-500 text-center py-8">등록된 태그가 없습니다.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {tags.map((tag) => (
                <div key={tag.id} className="flex items-center justify-between p-3 border rounded">
                  {editingId === tag.id ? (
                    <div className="flex-1 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <input value={editingName} onChange={(e)=>setEditingName(e.target.value)} className="px-2 py-1 border rounded w-40" />
                        <input type="color" value={editingColor} onChange={(e)=>setEditingColor(e.target.value)} className="w-8 h-8 border rounded" />
                      </div>
                      <div className="flex gap-2">
                        <button onClick={saveEdit} className="px-3 py-1 bg-blue-600 text-white rounded">저장</button>
                        <button onClick={()=>{setEditingId(null); setEditingName(''); setEditingColor('#3B82F6')}} className="px-3 py-1 bg-gray-200 rounded">취소</button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-4 h-4 rounded-full" style={{ backgroundColor: tag.color }} />
                        <span className="font-medium text-gray-800 truncate">{tag.name}</span>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={()=>{setEditingId(tag.id); setEditingName(tag.name); setEditingColor(tag.color)}} className="px-2 py-1 text-gray-600 hover:text-blue-700">수정</button>
                        <button onClick={()=>deleteTag(tag.id)} className="p-1 rounded hover:bg-red-50" aria-label="삭제">
                          <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}


