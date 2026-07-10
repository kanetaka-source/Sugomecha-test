import { useEffect, useState } from 'react'
import { departmentsApi, locationsApi, type Department, type Location } from '../lib/api'
import { MasterChainNav, LOCATION_CHAIN } from '../components/MasterChainNav'

const COLS = 'grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)_minmax(0,1.2fr)_84px_150px]'

export default function BumonMasterPage() {
  const [rows, setRows] = useState<Department[]>([])
  const [locations, setLocations] = useState<Location[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // 検索・フィルタ
  const [q, setQ] = useState('')
  const [filterLocationId, setFilterLocationId] = useState('') // '' = 全拠点

  // 新規追加フォーム
  const [newName, setNewName] = useState('')
  const [newNote, setNewNote] = useState('')
  const [newLocationId, setNewLocationId] = useState('') // '' = 未設定

  // 編集中の行
  const [editId, setEditId] = useState<number | null>(null)
  const [editName, setEditName] = useState('')
  const [editNote, setEditNote] = useState('')
  const [editLocationId, setEditLocationId] = useState('')

  async function reload() {
    setLoading(true)
    setError('')
    try {
      const [deps, locs] = await Promise.all([departmentsApi.list(), locationsApi.list()])
      setRows(deps)
      setLocations(locs)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    reload()
  }, [])

  // '' → null に変換
  const toLocationId = (v: string) => (v === '' ? null : Number(v))

  async function onAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!newName.trim()) return
    setError('')
    try {
      await departmentsApi.create({
        name: newName.trim(),
        note: newNote.trim(),
        locationId: toLocationId(newLocationId),
      })
      setNewName('')
      setNewNote('')
      setNewLocationId('')
      await reload()
    } catch (e: any) {
      setError(e.message)
    }
  }

  function startEdit(row: Department) {
    setEditId(row.id)
    setEditName(row.name)
    setEditNote(row.note ?? '')
    setEditLocationId(row.locationId != null ? String(row.locationId) : '')
    setError('')
  }

  async function onSaveEdit() {
    if (editId == null) return
    setError('')
    try {
      await departmentsApi.update(editId, {
        name: editName.trim(),
        note: editNote.trim(),
        locationId: toLocationId(editLocationId),
      })
      setEditId(null)
      await reload()
    } catch (e: any) {
      setError(e.message)
    }
  }

  async function onDelete(row: Department) {
    if (!confirm(`「${row.name}」を削除しますか？`)) return
    setError('')
    try {
      await departmentsApi.remove(row.id)
      await reload()
    } catch (e: any) {
      setError(e.message)
    }
  }

  const inputCls =
    'w-full rounded-md border border-line px-2 py-1 text-sm text-ink outline-none focus:border-accent'

  // 検索・拠点で絞り込み
  const filtered = rows.filter(
    (r) =>
      r.name.includes(q.trim()) &&
      (filterLocationId === '' || String(r.locationId ?? '') === filterLocationId),
  )

  // 拠点選択プルダウン
  function LocationSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
    return (
      <select value={value} onChange={(e) => onChange(e.target.value)} className={inputCls}>
        <option value="">未設定</option>
        {locations.map((loc) => (
          <option key={loc.id} value={loc.id}>
            {loc.name}
          </option>
        ))}
      </select>
    )
  }

  return (
    <div>
      <MasterChainNav steps={LOCATION_CHAIN} />
      <h1 className="mb-4 text-lg font-bold text-ink2">部門マスタ</h1>

      {error && (
        <p className="mb-3 rounded-md bg-danger/10 px-3 py-2 text-xs font-bold text-danger">
          {error}
        </p>
      )}

      {/* 新規追加 */}
      <form onSubmit={onAdd} className="card-grad mb-5 flex flex-wrap items-end gap-3 bg-surface/60 p-4">
        <label className="flex flex-1 flex-col gap-1">
          <span className="text-xs font-bold text-muted">部署名 <span className="text-danger">*</span></span>
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="新しい部署名"
            className={inputCls}
          />
        </label>
        <label className="flex w-40 flex-col gap-1">
          <span className="text-xs font-bold text-muted">拠点</span>
          <LocationSelect value={newLocationId} onChange={setNewLocationId} />
        </label>
        <label className="flex flex-1 flex-col gap-1">
          <span className="text-xs font-bold text-muted">備考</span>
          <input
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            placeholder="任意"
            className={inputCls}
          />
        </label>
        <button
          type="submit"
          className="rounded-md bg-brand px-4 py-1.5 text-xs font-bold text-white hover:bg-brand-deep"
        >
          追加
        </button>
      </form>

      {/* 検索・フィルタ */}
      <div className="mb-3 flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1">
          <span className="text-xs font-bold text-muted">部門名で検索</span>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="部門名" className={`${inputCls} w-56`} />
        </label>
        <label className="flex w-44 flex-col gap-1">
          <span className="text-xs font-bold text-muted">拠点で絞り込み</span>
          <select value={filterLocationId} onChange={(e) => setFilterLocationId(e.target.value)} className={inputCls}>
            <option value="">全拠点</option>
            {locations.map((loc) => (
              <option key={loc.id} value={loc.id}>{loc.name}</option>
            ))}
          </select>
        </label>
      </div>

      {/* 一覧 */}
      <div className="card-grad bg-surface/60 p-4">
        {loading ? (
          <p className="py-8 text-center text-sm text-muted">読み込み中…</p>
        ) : rows.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted">部署が登録されていません。</p>
        ) : (
          <div className="space-y-1">
            {/* ヘッダー */}
            <div className={`grid ${COLS} gap-3 border-b border-line2 pb-2 text-xs font-bold text-ink2`}>
              <span>部署名</span>
              <span>拠点</span>
              <span>備考</span>
              <span className="text-center">部署所属数</span>
              <span className="text-center">操作</span>
            </div>
            {filtered.length === 0 && (
              <p className="py-6 text-center text-sm text-muted">該当する部署がありません。</p>
            )}
            {filtered.map((row) => (
              <div
                key={row.id}
                className={`grid ${COLS} items-center gap-3 border-b border-line py-2 text-sm`}
              >
                {editId === row.id ? (
                  <>
                    <input value={editName} onChange={(e) => setEditName(e.target.value)} className={inputCls} />
                    <LocationSelect value={editLocationId} onChange={setEditLocationId} />
                    <input value={editNote} onChange={(e) => setEditNote(e.target.value)} className={inputCls} />
                    <span className="text-center text-muted">{row.memberCount}人</span>
                    <div className="flex justify-center gap-2">
                      <button
                        onClick={onSaveEdit}
                        className="rounded bg-brand px-3 py-1 text-xs font-bold text-white hover:bg-brand-deep"
                      >
                        保存
                      </button>
                      <button
                        onClick={() => setEditId(null)}
                        className="rounded bg-disabled px-3 py-1 text-xs font-bold text-white hover:brightness-95"
                      >
                        取消
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <span className="font-bold text-ink2">{row.name}</span>
                    <span className="text-ink">{row.location?.name ?? '—'}</span>
                    <span className="truncate text-ink">{row.note || '—'}</span>
                    <span className="text-center text-ink">{row.memberCount}人</span>
                    <div className="flex justify-center gap-2">
                      <button
                        onClick={() => startEdit(row)}
                        className="rounded border border-brand/60 px-3 py-1 text-xs font-bold text-brand hover:bg-brand/5"
                      >
                        編集
                      </button>
                      <button
                        onClick={() => onDelete(row)}
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
