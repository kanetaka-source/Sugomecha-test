import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { trainingSectionsApi, trainingCoursesApi, type TrainingSection, type TrainingCourse } from '../lib/api'
import { MasterChainNav, TRAINING_CHAIN } from '../components/MasterChainNav'

const COLS = 'grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_100px_150px]'

export default function KenshuSectionListPage() {
  const [rows, setRows] = useState<TrainingSection[]>([])
  const [courses, setCourses] = useState<TrainingCourse[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  // 検索・フィルタ
  const [q, setQ] = useState('')
  const [filterCourseId, setFilterCourseId] = useState('')

  async function reload() {
    setLoading(true)
    setError('')
    try {
      const [secs, cs] = await Promise.all([trainingSectionsApi.list(), trainingCoursesApi.list()])
      setRows(secs)
      setCourses(cs)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    reload()
  }, [])

  const inputCls =
    'w-full rounded-md border border-line px-2 py-1 text-sm text-ink outline-none focus:border-accent'

  // 検索・コースで絞り込み
  const filtered = rows.filter(
    (r) =>
      r.name.includes(q.trim()) &&
      (filterCourseId === '' || String(r.courseId ?? '') === filterCourseId),
  )

  async function onDelete(row: TrainingSection) {
    if (!confirm(`「${row.name}」を削除しますか？`)) return
    setError('')
    try {
      await trainingSectionsApi.remove(row.id)
      await reload()
    } catch (e: any) {
      setError(e.message)
    }
  }

  return (
    <div>
      <MasterChainNav steps={TRAINING_CHAIN} />
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-lg font-bold text-ink2">研修セクションマスタ</h1>
        <Link
          to="/admin/kenshu-section/new"
          className="rounded-md bg-brand px-4 py-1.5 text-xs font-bold text-white hover:bg-brand-deep"
        >
          ＋ 新規登録
        </Link>
      </div>

      {error && (
        <p className="mb-3 rounded-md bg-danger/10 px-3 py-2 text-xs font-bold text-danger">{error}</p>
      )}

      {/* 検索・フィルタ */}
      <div className="mb-3 flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1">
          <span className="text-xs font-bold text-muted">研修セクション名で検索</span>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="研修セクション名" className={`${inputCls} w-56`} />
        </label>
        <label className="flex w-48 flex-col gap-1">
          <span className="text-xs font-bold text-muted">研修コースで絞り込み</span>
          <select value={filterCourseId} onChange={(e) => setFilterCourseId(e.target.value)} className={inputCls}>
            <option value="">全コース</option>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </label>
      </div>

      <div className="card-grad bg-surface/60 p-4">
        {loading ? (
          <p className="py-8 text-center text-sm text-muted">読み込み中…</p>
        ) : rows.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted">研修セクションが登録されていません。</p>
        ) : (
          <div className="space-y-1">
            <div className={`grid ${COLS} gap-3 border-b border-line2 pb-2 text-xs font-bold text-ink2`}>
              <span>研修セクション名</span>
              <span>研修コース</span>
              <span className="text-center">研修項目数</span>
              <span className="text-center">操作</span>
            </div>
            {filtered.length === 0 && (
              <p className="py-6 text-center text-sm text-muted">該当する研修セクションがありません。</p>
            )}
            {filtered.map((row) => (
              <div key={row.id} className={`grid ${COLS} items-center gap-3 border-b border-line py-2 text-sm`}>
                <span className="font-bold text-ink2">{row.name}</span>
                <span className="text-ink">{row.course?.name ?? '—'}</span>
                <span className="text-center text-ink">{row.itemCount}件</span>
                <div className="flex justify-center gap-2">
                  <button
                    onClick={() => navigate(`/admin/kenshu-section/${row.id}`)}
                    className="rounded border border-brand/60 px-3 py-1 text-xs font-bold text-brand hover:bg-brand/5"
                  >
                    詳細・編集
                  </button>
                  <button
                    onClick={() => onDelete(row)}
                    className="rounded border border-danger/60 px-3 py-1 text-xs font-bold text-danger hover:bg-danger/5"
                  >
                    削除
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
