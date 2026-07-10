import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { permissionsApi, PERMISSION_GROUPS, ALL_PERMISSIONS, type PermissionDetail } from '../lib/api'

export default function KengenDetailPage() {
  const { employeeId } = useParams()
  const navigate = useNavigate()
  const id = Number(employeeId)

  const [user, setUser] = useState<PermissionDetail | null>(null)
  const [granted, setGranted] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    ;(async () => {
      setLoading(true)
      try {
        const u = await permissionsApi.get(id)
        setUser(u)
        setGranted(new Set(u.granted))
      } catch (e: any) {
        setError(e.message)
      } finally {
        setLoading(false)
      }
    })()
  }, [id])

  function toggle(label: string) {
    setSaved(false)
    setGranted((prev) => {
      const next = new Set(prev)
      if (next.has(label)) next.delete(label)
      else next.add(label)
      return next
    })
  }

  function setAll(on: boolean) {
    setSaved(false)
    setGranted(on ? new Set(ALL_PERMISSIONS) : new Set())
  }

  async function onSave() {
    setSaving(true)
    setError('')
    try {
      await permissionsApi.save(id, Array.from(granted))
      setSaved(true)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <p className="py-8 text-center text-sm text-muted">読み込み中…</p>
  }
  if (!user) {
    return <p className="py-8 text-center text-sm text-danger">{error || '対象が見つかりません'}</p>
  }

  return (
    <div>
      <h1 className="mb-1 text-lg font-bold text-ink2">権限設定</h1>
      <p className="mb-4 text-sm text-muted">
        {user.employeeNo} / <span className="font-bold text-ink2">{user.name}</span>
        {user.departmentName ? `（${user.departmentName}）` : ''} ・ {user.role}
      </p>

      {error && (
        <p className="mb-3 rounded-md bg-danger/10 px-3 py-2 text-xs font-bold text-danger">{error}</p>
      )}

      <div className="mb-3 flex items-center gap-2">
        <button onClick={() => setAll(true)} className="rounded border border-brand/60 px-3 py-1 text-xs font-bold text-brand hover:bg-brand/5">
          全選択
        </button>
        <button onClick={() => setAll(false)} className="rounded border border-line2 px-3 py-1 text-xs font-bold text-muted hover:bg-line/40">
          全解除
        </button>
        <span className="ml-auto text-xs text-muted">{granted.size} / {ALL_PERMISSIONS.length} 件 付与</span>
      </div>

      <div className="space-y-4">
        {PERMISSION_GROUPS.map((group) => (
          <div key={group.title} className="card-grad bg-surface/60 p-4">
            <h2 className="mb-2 border-b border-line2 pb-1 text-sm font-bold text-ink2">{group.title}</h2>
            <div className="grid grid-cols-1 gap-x-4 gap-y-1 sm:grid-cols-2 lg:grid-cols-3">
              {group.items.map((label) => (
                <label key={label} className="flex items-center gap-2 py-1 text-sm text-ink">
                  <input
                    type="checkbox"
                    checked={granted.has(label)}
                    onChange={() => toggle(label)}
                    className="h-4 w-4 accent-brand"
                  />
                  {label}
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 flex items-center gap-2">
        <button onClick={onSave} disabled={saving} className="rounded-md bg-brand px-5 py-1.5 text-xs font-bold text-white hover:bg-brand-deep disabled:opacity-60">
          {saving ? '保存中…' : '保存'}
        </button>
        <button onClick={() => navigate('/admin/kengen')} className="rounded-md bg-disabled px-5 py-1.5 text-xs font-bold text-white hover:brightness-95">
          一覧へ戻る
        </button>
        {saved && <span className="text-xs font-bold text-ok">保存しました</span>}
      </div>
    </div>
  )
}
