import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  trainingItemsApi,
  trainingCoursesApi,
  trainingSectionsApi,
  type TrainingItem,
  type TrainingCourse,
  type TrainingSection,
} from '../lib/api'
import { MasterChainNav, TRAINING_CHAIN } from '../components/MasterChainNav'

const COLS = 'grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.1fr)_minmax(0,1.4fr)_150px]'

function valuesPreview(row: TrainingItem) {
  const vals = [row.value1, row.value2, row.value3, row.value4, row.value5].filter(Boolean)
  return vals.length ? vals.join(' / ') : '—'
}

export default function KenshuItemListPage() {
  const [rows, setRows] = useState<TrainingItem[]>([])
  const [courses, setCourses] = useState<TrainingCourse[]>([])
  const [sections, setSections] = useState<TrainingSection[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  // 検索・フィルタ
  const [filterCourseId, setFilterCourseId] = useState('')
  const [filterSectionId, setFilterSectionId] = useState('')
  const [q, setQ] = useState('')

  async function reload() {
    setLoading(true)
    setError('')
    try {
      const [items, cs, secs] = await Promise.all([
        trainingItemsApi.list(),
        trainingCoursesApi.list(),
        trainingSectionsApi.list(),
      ])
      setRows(items)
      setCourses(cs)
      setSections(secs)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    reload()
  }, [])

  async function onDelete(row: TrainingItem) {
    if (!confirm(`「${row.title}」を削除しますか？`)) return
    setError('')
    try {
      await trainingItemsApi.remove(row.id)
      await reload()
    } catch (e: any) {
      setError(e.message)
    }
  }

  const inputCls =
    'w-full rounded-md border border-line px-2 py-1 text-sm text-ink outline-none focus:border-accent'

  // コース選択に応じてセクション候補を絞り込み
  const sectionOptions = sections.filter(
    (s) => filterCourseId === '' || String(s.courseId ?? '') === filterCourseId,
  )

  // 一覧の絞り込み
  const filtered = rows.filter(
    (r) =>
      (filterCourseId === '' || String(r.section?.course?.id ?? '') === filterCourseId) &&
      (filterSectionId === '' || String(r.sectionId ?? '') === filterSectionId) &&
      r.title.includes(q.trim()),
  )

  return (
    <div>
      <MasterChainNav steps={TRAINING_CHAIN} />
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-lg font-bold text-ink2">研修項目マスタ</h1>
        <Link
          to="/admin/kenshu-item/new"
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
        <label className="flex w-44 flex-col gap-1">
          <span className="text-xs font-bold text-muted">研修コース</span>
          <select
            value={filterCourseId}
            onChange={(e) => {
              setFilterCourseId(e.target.value)
              setFilterSectionId('') // コース変更時はセクション選択をリセット
            }}
            className={inputCls}
          >
            <option value="">全コース</option>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </label>
        <label className="flex w-48 flex-col gap-1">
          <span className="text-xs font-bold text-muted">研修セクション</span>
          <select value={filterSectionId} onChange={(e) => setFilterSectionId(e.target.value)} className={inputCls}>
            <option value="">全セクション</option>
            {sectionOptions.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-bold text-muted">タイトルで検索</span>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="タイトル" className={`${inputCls} w-48`} />
        </label>
      </div>

      <div className="card-grad bg-surface/60 p-4">
        {loading ? (
          <p className="py-8 text-center text-sm text-muted">読み込み中…</p>
        ) : rows.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted">研修項目が登録されていません。</p>
        ) : (
          <div className="space-y-1">
            <div className={`grid ${COLS} gap-3 border-b border-line2 pb-2 text-xs font-bold text-ink2`}>
              <span>研修コース</span>
              <span>研修セクション</span>
              <span>タイトル</span>
              <span>内容</span>
              <span className="text-center">操作</span>
            </div>
            {filtered.length === 0 && (
              <p className="py-6 text-center text-sm text-muted">該当する研修項目がありません。</p>
            )}
            {filtered.map((row) => (
              <div key={row.id} className={`grid ${COLS} items-center gap-3 border-b border-line py-2 text-sm`}>
                <span className="text-ink">{row.section?.course?.name ?? '—'}</span>
                <span className="text-ink">{row.section?.name ?? '—'}</span>
                <span className="font-bold text-ink2">{row.title}</span>
                <span className="truncate text-ink">{valuesPreview(row)}</span>
                <div className="flex justify-center gap-2">
                  <button
                    onClick={() => navigate(`/admin/kenshu-item/${row.id}`)}
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
