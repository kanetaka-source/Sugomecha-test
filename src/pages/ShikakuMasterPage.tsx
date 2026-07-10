import { useEffect, useState } from 'react'
import { qualificationsApi, QUALIFICATION_CATEGORIES, type Qualification } from '../lib/api'

const COLS = 'grid-cols-[minmax(0,1.6fr)_140px_150px]'

export default function ShikakuMasterPage() {
  const [rows, setRows] = useState<Qualification[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // 検索・フィルタ
  const [q, setQ] = useState('')
  const [filterCategory, setFilterCategory] = useState('')

  const [newName, setNewName] = useState('')
  const [newCategory, setNewCategory] = useState<string>(QUALIFICATION_CATEGORIES[0])

  const [editId, setEditId] = useState<number | null>(null)
  const [editName, setEditName] = useState('')
  const [editCategory, setEditCategory] = useState<string>(QUALIFICATION_CATEGORIES[0])

  async function reload() {
    setLoading(true)
    setError('')
    try {
      setRows(await qualificationsApi.list())
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
      await qualificationsApi.create({ name: newName.trim(), category: newCategory })
      setNewName('')
      setNewCategory(QUALIFICATION_CATEGORIES[0])
      await reload()
    } catch (e: any) {
      setError(e.message)
    }
  }

  function startEdit(row: Qualification) {
    setEditId(row.id)
    setEditName(row.name)
    setEditCategory(row.category ?? QUALIFICATION_CATEGORIES[0])
    setError('')
  }

  async function onSaveEdit() {
    if (editId == null) return
    setError('')
    try {
      await qualificationsApi.update(editId, { name: editName.trim(), category: editCategory })
      setEditId(null)
      await reload()
    } catch (e: any) {
      setError(e.message)
    }
  }

  async function onDelete(row: Qualification) {
    if (!confirm(`「${row.name}」を削除しますか？`)) return
    setError('')
    try {
      await qualificationsApi.remove(row.id)
      await reload()
    } catch (e: any) {
      setError(e.message)
    }
  }

  const inputCls =
    'w-full rounded-md border border-line px-2 py-1 text-sm text-ink outline-none focus:border-accent'

  const filtered = rows.filter(
    (r) =>
      r.name.includes(q.trim()) &&
      (filterCategory === '' || r.category === filterCategory),
  )

  function CategorySelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
    return (
      <select value={value} onChange={(e) => onChange(e.target.value)} className={inputCls}>
        {QUALIFICATION_CATEGORIES.map((c) => (
          <option key={c} value={c}>{c}</option>
        ))}
      </select>
    )
  }

  return (
    <div>
      <h1 className="mb-1 text-lg font-bold text-ink2">資格マスタ</h1>
      <p className="mb-4 text-xs text-muted">資格名と区分の一覧です。有効期限は社員ごとに「保有資格マスタ」で登録します。</p>

      {error && (
        <p className="mb-3 rounded-md bg-danger/10 px-3 py-2 text-xs font-bold text-danger">{error}</p>
      )}

      {/* 新規追加 */}
      <form onSubmit={onAdd} className="card-grad mb-5 flex flex-wrap items-end gap-3 bg-surface/60 p-4">
        <label className="flex flex-1 flex-col gap-1">
          <span className="text-xs font-bold text-muted">資格名 <span className="text-danger">*</span></span>
          <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="新しい資格名" className={inputCls} />
        </label>
        <label className="flex w-36 flex-col gap-1">
          <span className="text-xs font-bold text-muted">資格区分</span>
          <CategorySelect value={newCategory} onChange={setNewCategory} />
        </label>
        <button type="submit" className="rounded-md bg-brand px-4 py-1.5 text-xs font-bold text-white hover:bg-brand-deep">
          追加
        </button>
      </form>

      {/* 検索・フィルタ */}
      <div className="mb-3 flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1">
          <span className="text-xs font-bold text-muted">資格名で検索</span>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="資格名" className={`${inputCls} w-56`} />
        </label>
        <label className="flex w-40 flex-col gap-1">
          <span className="text-xs font-bold text-muted">資格区分で絞り込み</span>
          <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} className={inputCls}>
            <option value="">全区分</option>
            {QUALIFICATION_CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </label>
      </div>

      {/* 一覧 */}
      <div className="card-grad bg-surface/60 p-4">
        {loading ? (
          <p className="py-8 text-center text-sm text-muted">読み込み中…</p>
        ) : rows.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted">資格が登録されていません。</p>
        ) : (
          <div className="space-y-1">
            <div className={`grid ${COLS} gap-3 border-b border-line2 pb-2 text-xs font-bold text-ink2`}>
              <span>資格名</span>
              <span>資格区分</span>
              <span className="text-center">操作</span>
            </div>
            {filtered.length === 0 && (
              <p className="py-6 text-center text-sm text-muted">該当する資格がありません。</p>
            )}
            {filtered.map((row) => (
              <div key={row.id} className={`grid ${COLS} items-center gap-3 border-b border-line py-2 text-sm`}>
                {editId === row.id ? (
                  <>
                    <input value={editName} onChange={(e) => setEditName(e.target.value)} className={inputCls} />
                    <CategorySelect value={editCategory} onChange={setEditCategory} />
                    <div className="flex justify-center gap-2">
                      <button onClick={onSaveEdit} className="rounded bg-brand px-3 py-1 text-xs font-bold text-white hover:bg-brand-deep">保存</button>
                      <button onClick={() => setEditId(null)} className="rounded bg-disabled px-3 py-1 text-xs font-bold text-white hover:brightness-95">取消</button>
                    </div>
                  </>
                ) : (
                  <>
                    <span className="font-bold text-ink2">{row.name}</span>
                    <span className="text-ink">{row.category ?? '—'}</span>
                    <div className="flex justify-center gap-2">
                      <button onClick={() => startEdit(row)} className="rounded border border-brand/60 px-3 py-1 text-xs font-bold text-brand hover:bg-brand/5">編集</button>
                      <button onClick={() => onDelete(row)} className="rounded border border-danger/60 px-3 py-1 text-xs font-bold text-danger hover:bg-danger/5">削除</button>
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
