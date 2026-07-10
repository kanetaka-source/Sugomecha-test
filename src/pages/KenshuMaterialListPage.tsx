import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  trainingMaterialsApi,
  trainingCoursesApi,
  trainingSectionsApi,
  trainingItemsApi,
  type TrainingMaterial,
  type TrainingCourse,
  type TrainingSection,
  type TrainingItem,
} from '../lib/api'
import { MasterChainNav, TRAINING_CHAIN } from '../components/MasterChainNav'

const COLS = 'grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.4fr)_150px]'

export default function KenshuMaterialListPage() {
  const [rows, setRows] = useState<TrainingMaterial[]>([])
  const [courses, setCourses] = useState<TrainingCourse[]>([])
  const [sections, setSections] = useState<TrainingSection[]>([])
  const [items, setItems] = useState<TrainingItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  // 検索・フィルタ
  const [filterCourseId, setFilterCourseId] = useState('')
  const [filterSectionId, setFilterSectionId] = useState('')
  const [filterItemId, setFilterItemId] = useState('')
  const [q, setQ] = useState('')

  async function reload() {
    setLoading(true)
    setError('')
    try {
      const [mats, cs, secs, its] = await Promise.all([
        trainingMaterialsApi.list(),
        trainingCoursesApi.list(),
        trainingSectionsApi.list(),
        trainingItemsApi.list(),
      ])
      setRows(mats)
      setCourses(cs)
      setSections(secs)
      setItems(its)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    reload()
  }, [])

  async function onDelete(row: TrainingMaterial) {
    if (!confirm(`「${row.detail1Title || '教材'}」を削除しますか？`)) return
    setError('')
    try {
      await trainingMaterialsApi.remove(row.id)
      await reload()
    } catch (e: any) {
      setError(e.message)
    }
  }

  const inputCls =
    'w-full rounded-md border border-line px-2 py-1 text-sm text-ink outline-none focus:border-accent'

  // コース→セクション→項目 と段階的に候補を絞り込み
  const sectionOptions = sections.filter(
    (s) => filterCourseId === '' || String(s.courseId ?? '') === filterCourseId,
  )
  const itemOptions = items.filter(
    (it) =>
      (filterCourseId === '' || String(it.section?.course?.id ?? '') === filterCourseId) &&
      (filterSectionId === '' || String(it.sectionId ?? '') === filterSectionId),
  )

  // 一覧の絞り込み
  const filtered = rows.filter(
    (r) =>
      (filterCourseId === '' || String(r.item?.section?.course?.id ?? '') === filterCourseId) &&
      (filterSectionId === '' || String(r.item?.section?.id ?? '') === filterSectionId) &&
      (filterItemId === '' || String(r.itemId ?? '') === filterItemId) &&
      (row_title(r)).includes(q.trim()),
  )

  function row_title(r: TrainingMaterial) {
    return r.detail1Title ?? ''
  }

  return (
    <div>
      <MasterChainNav steps={TRAINING_CHAIN} />
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-lg font-bold text-ink2">研修教材マスタ</h1>
        <Link
          to="/admin/kenshu-material/new"
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
        <label className="flex w-40 flex-col gap-1">
          <span className="text-xs font-bold text-muted">研修コース</span>
          <select
            value={filterCourseId}
            onChange={(e) => {
              setFilterCourseId(e.target.value)
              setFilterSectionId('')
              setFilterItemId('')
            }}
            className={inputCls}
          >
            <option value="">全コース</option>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </label>
        <label className="flex w-44 flex-col gap-1">
          <span className="text-xs font-bold text-muted">研修セクション</span>
          <select
            value={filterSectionId}
            onChange={(e) => {
              setFilterSectionId(e.target.value)
              setFilterItemId('')
            }}
            className={inputCls}
          >
            <option value="">全セクション</option>
            {sectionOptions.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </label>
        <label className="flex w-44 flex-col gap-1">
          <span className="text-xs font-bold text-muted">研修項目</span>
          <select value={filterItemId} onChange={(e) => setFilterItemId(e.target.value)} className={inputCls}>
            <option value="">全項目</option>
            {itemOptions.map((it) => (
              <option key={it.id} value={it.id}>{it.title}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-bold text-muted">教材タイトルで検索</span>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="教材タイトル" className={`${inputCls} w-44`} />
        </label>
      </div>

      <div className="card-grad bg-surface/60 p-4">
        {loading ? (
          <p className="py-8 text-center text-sm text-muted">読み込み中…</p>
        ) : rows.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted">研修教材が登録されていません。</p>
        ) : (
          <div className="space-y-1">
            <div className={`grid ${COLS} gap-3 border-b border-line2 pb-2 text-xs font-bold text-ink2`}>
              <span>研修コース</span>
              <span>研修セクション</span>
              <span>研修項目</span>
              <span>教材タイトル</span>
              <span className="text-center">操作</span>
            </div>
            {filtered.length === 0 && (
              <p className="py-6 text-center text-sm text-muted">該当する研修教材がありません。</p>
            )}
            {filtered.map((row) => (
              <div key={row.id} className={`grid ${COLS} items-center gap-3 border-b border-line py-2 text-sm`}>
                <span className="text-ink">{row.item?.section?.course?.name ?? '—'}</span>
                <span className="text-ink">{row.item?.section?.name ?? '—'}</span>
                <span className="text-ink">{row.item?.title ?? '—'}</span>
                <span className="font-bold text-ink2">{row.detail1Title || '—'}</span>
                <div className="flex justify-center gap-2">
                  <button
                    onClick={() => navigate(`/admin/kenshu-material/${row.id}`)}
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
