"use client";

import { useEffect, useState } from 'react';

interface Notice {
  id: string;
  title: string;
  content: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  author?: { name: string } | null;
}

export default function NoticesAdminPage() {
  const [notices, setNotices] = useState<Notice[]>([])
  const [search, setSearch] = useState('')
  const [active, setActive] = useState('')
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Notice | null>(null)
  const [form, setForm] = useState({ title: '', content: '', isActive: true })
  const [toast, setToast] = useState('')

  async function fetchList() {
    setLoading(true)
    const params = new URLSearchParams()
    if (search) params.set('search', search)
    if (active !== '') params.set('isActive', active)
    const res = await fetch(`/api/admin/notices?${params.toString()}`, { credentials: 'include' })
    if (res.ok) {
      const data = await res.json()
      setNotices(data.notices || [])
    }
    setLoading(false)
  }

  useEffect(() => { fetchList() }, [])

  const openCreate = () => { setEditing(null); setForm({ title: '', content: '', isActive: true }); setShowModal(true) }
  const openEdit = (n: Notice) => { setEditing(n); setForm({ title: n.title, content: n.content, isActive: n.isActive }); setShowModal(true) }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.title.trim() || !form.content.trim()) { alert('제목/내용을 입력하세요'); return }
    const url = editing ? `/api/admin/notices/${editing.id}` : '/api/admin/notices'
    const method = editing ? 'PUT' : 'POST'
    const res = await fetch(url, { method, credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
    if (res.ok) { setShowModal(false); fetchList(); setToast(editing? '공지 수정 완료':'공지 생성 완료'); setTimeout(()=>setToast(''), 2000) } else { const e = await res.json().catch(()=>({})); alert(e.error || '실패') }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">공지사항 관리</h1>
        <button onClick={openCreate} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">새 공지</button>
      </div>
      {toast && (<div className="px-4 py-2 rounded bg-green-600 text-white font-semibold">{toast}</div>)}

      <div className="bg-white border rounded-lg p-4 flex flex-col sm:flex-row gap-3">
        <input value={search} onChange={e=>setSearch(e.target.value)} onKeyDown={e=>e.key==='Enter'&&fetchList()} placeholder="검색(제목/내용)" className="flex-1 px-4 py-3 border-2 rounded text-gray-900 font-semibold placeholder-gray-700" />
        <select value={active} onChange={e=>setActive(e.target.value)} className="px-4 py-3 border-2 rounded text-gray-900 font-semibold">
          <option value="">전체</option>
          <option value="true">활성</option>
          <option value="false">비활성</option>
        </select>
        <button onClick={fetchList} className="px-5 py-3 bg-gray-900 text-white rounded font-semibold">검색</button>
      </div>

      <div className="bg-white border rounded-lg">
        {loading ? (
          <div className="p-8 text-center text-gray-500">로딩...</div>
        ) : notices.length === 0 ? (
          <div className="p-8 text-center text-gray-500">공지 없음</div>
        ) : (
          <div className="divide-y">
            {notices.map(n => (
              <div key={n.id} className="p-4 hover:bg-gray-50">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-gray-900">{n.title}</h3>
                      <span className={`px-2 py-0.5 text-xs rounded-full ${n.isActive? 'bg-green-100 text-green-800':'bg-gray-100 text-gray-700'}`}>{n.isActive? '활성':'비활성'}</span>
                    </div>
                    <p className="text-gray-700 line-clamp-2">{n.content}</p>
                    <div className="text-xs text-gray-500 mt-1">작성자: {n.author?.name || '-'} • {new Date(n.createdAt).toLocaleString('ko-KR')}</div>
                  </div>
                  <div className="ml-3 flex gap-2">
                    <button onClick={()=>openEdit(n)} className="px-3 py-1 bg-blue-600 text-white rounded">수정</button>
                    <button onClick={async()=>{ if(!confirm('정말 삭제하시겠습니까?')) return; const r=await fetch(`/api/admin/notices/${n.id}`,{ method:'DELETE', credentials:'include' }); if(r.ok){ fetchList(); } }} className="px-3 py-1 bg-red-700 text-white rounded">삭제</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg w-full max-w-2xl p-6 text-gray-900">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-bold text-gray-900">{editing ? '공지 수정' : '새 공지'}</h2>
              <button onClick={()=>setShowModal(false)} className="text-gray-500">✕</button>
            </div>
            <form onSubmit={submit} className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-900">제목</label>
                <input value={form.title} onChange={e=>setForm(f=>({ ...f, title: e.target.value }))} className="w-full px-3 py-2 border-2 border-gray-400 rounded text-gray-900 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white" placeholder="제목을 입력하세요" required />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-900">내용</label>
                <textarea value={form.content} onChange={e=>setForm(f=>({ ...f, content: e.target.value }))} className="w-full px-3 py-2 border-2 border-gray-400 rounded h-48 text-gray-900 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white" placeholder="내용을 입력하세요" required />
              </div>
              <label className="inline-flex items-center gap-2 text-gray-900">
                <input type="checkbox" checked={form.isActive} onChange={e=>setForm(f=>({ ...f, isActive: e.target.checked }))} />
                <span className="text-gray-900">활성화</span>
              </label>
              <div className="pt-2 flex gap-2">
                <button type="submit" className="px-4 py-2 bg-red-600 text-white rounded">저장</button>
                <button type="button" onClick={()=>setShowModal(false)} className="px-4 py-2 bg-gray-600 text-white rounded">취소</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}


