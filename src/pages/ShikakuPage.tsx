import { useEffect, useState } from 'react'
import {
  heldQualificationsApi,
  qualificationsApi,
  type HeldQualDetail,
  type Qualification,
} from '../lib/api'
import { getCurrentUser } from '../lib/currentUser'

const COLS = 'grid-cols-[minmax(0,1.4fr)_110px_140px_140px_140px]'
const toDateInput = (iso: string | null) => (iso ? iso.slice(0, 10) : '')

// ログイン社員自身の保有資格を管理する画面（保有資格マスタ詳細と同等）
export default function ShikakuPage() {
  const currentUser = getCurrentUser()
  const id = currentUser?.id ?? null

  const [user, setUser] = useState<HeldQualDetail | null>(null)
  const [allQuals, setAllQuals] = useState<Qualification[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // 追加フォーム
  const [pick, setPick] = useState('')
  const [newAcquired, setNewAcquired] = useState('')
  const [newValid, setNewValid] = useState('')

  // 編集中の行（qualificationId）
  const [editQid, setEditQid] = useState<number | null>(null)
  const [editAcquired, setEditAcquired] = useState('')
  const [editValid, setEditValid] = useState('')

  async function reload() {
    if (id == null) return
    setError('')
    try {
      const [u, quals] = await Promise.all([heldQualificationsApi.get(id), qualificationsApi.list()])
      setUser(u)
      setAllQuals(quals)
    } catch (e: any) {
      setError(e.message)
    }
  }

  useEffect(() => {
    ;(async () => {
      setLoading(true)
      await reload()
      setLoading(false)
    })()
  }, [id])

  async function onAdd(e: React.FormEvent) {
    e.preventDefault()
    if (id == null || pick === '') return
    setError('')
    try {
      await heldQualificationsApi.add(id, Number(pick), { acquiredDate: newAcquired, validUntil: newValid })
      setPick('')
      setNewAcquired('')
      setNewValid('')
      await reload()
    } catch (e: any) {
      setError(e.message)
    }
  }

  function startEdit(qid: number, acquired: string | null, valid: string | null) {
    setEditQid(qid)
    setEditAcquired(toDateInput(acquired))
    setEditValid(toDateInput(valid))
    setError('')
  }

  async function onSaveEdit() {
    if (id == null || editQid == null) return
    setError('')
    try {
      await heldQualificationsApi.update(id, editQid, { acquiredDate: editAcquired, validUntil: editValid })
      setEditQid(null)
      await reload()
    } catch (e: any) {
      setError(e.message)
    }
  }

  async function onRemove(qualificationId: number, name: string) {
    if (id == null) return
    if (!confirm(`「${name}」を保有資格から外しますか？`)) return
    setError('')
    try {
      await heldQualificationsApi.remove(id, qualificationId)
      await reload()
    } catch (e: any) {
      setError(e.message)
    }
  }

  if (!currentUser) {
    return <p className="py-8 text-center text-sm text-danger">ログイン情報が見つかりません。再度ログインしてください。</p>
  }
  if (loading) {
    return <p className="py-8 text-center text-sm text-muted">読み込み中…</p>
  }
  if (!user) {
    return <p className="py-8 text-center text-sm text-danger">{error || '対象が見つかりません'}</p>
  }

  // まだ保有していない資格のみ追加候補に
  const heldIds = new Set(user.held.map((h) => h.qualificationId))
  const candidates = allQuals.filter((q) => !heldIds.has(q.id))

  const inputCls =
    'w-full rounded-md border border-line px-2 py-1 text-sm text-ink outline-none focus:border-accent'

  return (
    <div>
      <h1 className="mb-1 text-lg font-bold text-ink2">保有資格</h1>
      <p className="mb-4 text-sm text-muted">
        {user.employeeNo} / <span className="font-bold text-ink2">{user.name}</span>
        {user.departmentName ? `（${user.departmentName}）` : ''} ・ {user.role}
      </p>

      {error && (
        <p className="mb-3 rounded-md bg-danger/10 px-3 py-2 text-xs font-bold text-danger">{error}</p>
      )}

      {/* 追加 */}
      <form onSubmit={onAdd} className="card-grad mb-5 flex flex-wrap items-end gap-3 bg-surface/60 p-4">
        <label className="flex flex-1 flex-col gap-1">
          <span className="text-xs font-bold text-muted">資格（資格マスタから選択）</span>
          <select value={pick} onChange={(e) => setPick(e.target.value)} className={inputCls}>
            <option value="">選択してください</option>
            {candidates.map((q) => (
              <option key={q.id} value={q.id}>
                {q.name}{q.category ? `（${q.category}）` : ''}
              </option>
            ))}
          </select>
        </label>
        <label className="flex w-40 flex-col gap-1">
          <span className="text-xs font-bold text-muted">取得日</span>
          <input type="date" value={newAcquired} onChange={(e) => setNewAcquired(e.target.value)} className={inputCls} />
        </label>
        <label className="flex w-40 flex-col gap-1">
          <span className="text-xs font-bold text-muted">有効期限</span>
          <input type="date" value={newValid} onChange={(e) => setNewValid(e.target.value)} className={inputCls} />
        </label>
        <button
          type="submit"
          disabled={pick === ''}
          className="rounded-md bg-brand px-4 py-1.5 text-xs font-bold text-white hover:bg-brand-deep disabled:opacity-60"
        >
          追加
        </button>
      </form>

      {/* 保有資格一覧 */}
      <div className="card-grad bg-surface/60 p-4">
        {user.held.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted">保有資格が登録されていません。</p>
        ) : (
          <div className="space-y-1">
            <div className={`grid ${COLS} gap-3 border-b border-line2 pb-2 text-xs font-bold text-ink2`}>
              <span>資格名</span>
              <span>資格区分</span>
              <span>取得日</span>
              <span>有効期限</span>
              <span className="text-center">操作</span>
            </div>
            {user.held.map((h) => (
              <div key={h.qualificationId} className={`grid ${COLS} items-center gap-3 border-b border-line py-2 text-sm`}>
                <span className="font-bold text-ink2">{h.name}</span>
                <span className="text-ink">{h.category ?? '—'}</span>
                {editQid === h.qualificationId ? (
                  <>
                    <input type="date" value={editAcquired} onChange={(e) => setEditAcquired(e.target.value)} className={inputCls} />
                    <input type="date" value={editValid} onChange={(e) => setEditValid(e.target.value)} className={inputCls} />
                    <div className="flex justify-center gap-2">
                      <button onClick={onSaveEdit} className="rounded bg-brand px-3 py-1 text-xs font-bold text-white hover:bg-brand-deep">保存</button>
                      <button onClick={() => setEditQid(null)} className="rounded bg-disabled px-3 py-1 text-xs font-bold text-white hover:brightness-95">取消</button>
                    </div>
                  </>
                ) : (
                  <>
                    <span className="text-ink">{toDateInput(h.acquiredDate) || '—'}</span>
                    <span className="text-ink">{toDateInput(h.validUntil) || '—'}</span>
                    <div className="flex justify-center gap-2">
                      <button
                        onClick={() => startEdit(h.qualificationId, h.acquiredDate, h.validUntil)}
                        className="rounded border border-brand/60 px-3 py-1 text-xs font-bold text-brand hover:bg-brand/5"
                      >
                        編集
                      </button>
                      <button
                        onClick={() => onRemove(h.qualificationId, h.name)}
                        className="rounded border border-danger/60 px-3 py-1 text-xs font-bold text-danger hover:bg-danger/5"
                      >
                        削除
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
  )
}
