'use client'

import { useEffect, useState } from 'react'

export default function AdminSettingsPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [ownerEmail, setOwnerEmail] = useState<string>('')
  const [submissionEmails, setSubmissionEmails] = useState<string>('')

  useEffect(()=>{
    ;(async()=>{
      try {
        const r = await fetch('/api/admin/settings', { credentials: 'include' })
        if (!r.ok) throw new Error('설정 조회 실패')
        const data = await r.json()
        const emails: string[] = Array.isArray(data?.settings?.submissionEmails) ? data.settings.submissionEmails : []
        setSubmissionEmails(emails.join(', '))
        setOwnerEmail(data?.defaults?.ownerEmail || '')
      } catch(e:any) { setError(e.message||'오류') } finally { setLoading(false) }
    })()
  },[])

  const save = async ()=>{
    try {
      setLoading(true)
      const emails = submissionEmails.split(',').map(s=>s.trim()).filter(Boolean)
      const r = await fetch('/api/admin/settings', {
        method: 'PUT', credentials: 'include', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings: { submissionEmails: emails } })
      })
      if (!r.ok) {
        const e = await r.json().catch(()=>({}))
        throw new Error(e.error||'저장 실패')
      }
      alert('저장되었습니다')
    } catch(e:any) { alert(e.message||'저장 실패') } finally { setLoading(false) }
  }

  if (loading) return (
    <div className="min-h-screen bg-gray-50 p-6"><div className="max-w-3xl mx-auto"><div className="animate-pulse h-10 bg-gray-200 rounded"/></div></div>
  )

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-3xl mx-auto bg-white rounded-lg shadow p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">⚙️ 관리자 설정</h1>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-800 rounded">{error}</div>
        )}

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-800 mb-2">기본 관리자 이메일(참고)</label>
            <input value={ownerEmail} onChange={e=>setOwnerEmail(e.target.value)} className="w-full border rounded px-3 py-2" disabled />
            <p className="text-xs text-gray-500 mt-1">Tenant.ownerEmail 값(읽기 전용)</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-800 mb-2">체크리스트 제출 알림 수신 이메일</label>
            <input value={submissionEmails} onChange={e=>setSubmissionEmails(e.target.value)} className="w-full border rounded px-3 py-2" placeholder="콤마로 여러 개 입력 (예: a@x.com, b@y.com)" />
            <p className="text-xs text-gray-500 mt-1">비워두면 기본 관리자 이메일로 발송합니다.</p>
          </div>

          <div className="flex justify-end gap-3">
            <button onClick={save} disabled={loading} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50">저장</button>
          </div>
        </div>
      </div>
    </div>
  )
}


