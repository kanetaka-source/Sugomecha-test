import { useEffect, useState } from 'react'
import { locationsApi, type Location } from '../lib/api'
import { MasterChainNav, LOCATION_CHAIN } from '../components/MasterChainNav'

const COLS = 'grid-cols-[minmax(0,1.2fr)_minmax(0,1.6fr)_90px_150px]'

export default function KyotenMasterPage() {
  const [rows, setRows] = useState<Location[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // 検索
  const [q, setQ] = useState('')

  // 新規追加フォーム
  const [newName, setNewName] = useState('')
  const [newNote, setNewNote] = useState('')

  // 編集中の行
  const [editId, setEditId] = useState<number | null>(null)
  const [editName, setEditName] = useState('')
  const [editNote, setEditNote] = useState('')

  async function reload() {
    setLoading(true)
    setError('')
    try {
      setRows(await locationsApi.list())
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    reload()
  }, [])

  async function onAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!newName.trim()) return
    setError('')
    try {
      await locationsApi.create({ name: newName.trim(), note: newNote.trim() })
      setNewName('')
      setNewNote('')
      await reload()
    } catch (e: any) {
      setError(e.message)
    }
  }

  function startEdit(row: Location) {
    setEditId(row.id)
    setEditName(row.name)
    setEditNote(row.note ?? '')
    setError('')
  }

  async function onSaveEdit() {
    if (editId == null) return
    setError('')
    try {
      await locationsApi.update(editId, { name: editName.trim(), note: editNote.trim() })
      setEditId(null)
      await reload()
    } catch (e: any) {
      setError(e.message)
    }
  }

  async function onDelete(row: Location) {
    if (!confirm(`「${row.name}」を削除しますか？`)) return
    setError('')
    try {
      await locationsApi.remove(row.id)
      await reload()
    } catch (e: any) {
      setError(e.message)
    }
  }

  const inputCls =
    'w-full rounded-md border border-line px-2 py-1 text-sm text-ink outline-none focus:border-accent'

  // 検索で絞り込み
  const filtered = rows.filter((r) => r.name.includes(q.trim()))

  return (
    <div>
      <MasterChainNav steps={LOCATION_CHAIN} />
      <h1 className="mb-4 text-lg font-bold text-ink2">拠点マスタ</h1>

      {error && (
        <p className="mb-3 rounded-md bg-danger/10 px-3 py-2 text-xs font-bold text-danger">
          {error}
        </p>
      )}

      {/* 新規追加 */}
      <form onSubmit={onAdd} className="card-grad mb-5 flex flex-wrap items-end gap-3 bg-surface/60 p-4">
        <label className="flex flex-1 flex-col gap-1">
          <span className="text-xs font-bold text-muted">拠点名 <span className="text-danger">*</span></span>
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="新しい拠点名"
            className={inputCls}
          />
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

      {/* 検索 */}
      <div className="mb-3 flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1">
          <span className="text-xs font-bold text-muted">拠点名で検索</span>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="拠点名" className={`${inputCls} w-56`} />
        </label>
      </div>

      {/* 一覧 */}
      <div className="card-grad bg-surface/60 p-4">
        {loading ? (
          <p className="py-8 text-center text-sm text-muted">読み込み中…</p>
        ) : rows.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted">拠点が登録されていません。</p>
        ) : (
          <div className="space-y-1">
            {/* ヘッダー */}
            <div className={`grid ${COLS} gap-3 border-b border-line2 pb-2 text-xs font-bold text-ink2`}>
              <span>拠点名</span>
              <span>備考</span>
              <span className="text-center">拠点所属数</span>
              <span className="text-center">操作</span>
            </div>
            {filtered.length === 0 && (
              <p className="py-6 text-center text-sm text-muted">該当する拠点がありません。</p>
            )}
            {filtered.map((row) => (
              <div
                key={row.id}
                className={`grid ${COLS} items-center gap-3 border-b border-line py-2 text-sm`}
              >
                {editId === row.id ? (
                  <>
                    <input value={editName} onChange={(e) => setEditName(e.target.value)} className={inputCls} />
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
