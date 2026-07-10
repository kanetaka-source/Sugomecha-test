import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { examApi, type ExamSection } from '../lib/api'

const COLS = 'grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)_90px_110px_120px]'

export default function ShikenMasterListPage() {
  const [rows, setRows] = useState<ExamSection[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  // 検索・フィルタ
  const [filterCourse, setFilterCourse] = useState('')
  const [qName, setQName] = useState('')

  useEffect(() => {
    ;(async () => {
      setLoading(true)
      try {
        setRows(await examApi.sections())
      } catch (e: any) {
        setError(e.message)
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  const courseOptions = useMemo(
    () => Array.from(new Set(rows.map((r) => r.course?.name).filter((c): c is string => !!c))),
    [rows],
  )

  const filtered = rows.filter(
    (r) =>
      (filterCourse === '' || r.course?.name === filterCourse) &&
      r.name.includes(qName.trim()),
  )

  const inputCls =
    'w-full rounded-md border border-line px-2 py-1 text-sm text-ink outline-none focus:border-accent'
  const labelCls = 'flex flex-col gap-1 text-xs font-bold text-muted'

  return (
    <div>
      <h1 className="mb-1 text-lg font-bold text-ink2">筆記試験マスタ</h1>
      <p className="mb-4 text-xs text-muted">
        研修セクションを選び、その筆記試験の設問（YES/NO形式）と合格ラインを登録／確認します。
      </p>

      {error && (
        <p className="mb-3 rounded-md bg-danger/10 px-3 py-2 text-xs font-bold text-danger">{error}</p>
      )}

      {/* 検索・フィルタ */}
      <div className="mb-3 flex flex-wrap items-end gap-3">
        <label className={labelCls}>
          研修コース
          <select value={filterCourse} onChange={(e) => setFilterCourse(e.target.value)} className={`${inputCls} w-48`}>
            <option value="">全コース</option>
            {courseOptions.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </label>
        <label className={labelCls}>
          研修セクション名
          <input value={qName} onChange={(e) => setQName(e.target.value)} placeholder="セクション名" className={`${inputCls} w-48`} />
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
              <span>研修コース</span>
              <span>研修セクション</span>
              <span className="text-center">設問数</span>
              <span className="text-center">合格ライン</span>
              <span className="text-center">操作</span>
            </div>
            {filtered.length === 0 && (
              <p className="py-6 text-center text-sm text-muted">該当する研修セクションがありません。</p>
            )}
            {filtered.map((row) => (
              <div key={row.id} className={`grid ${COLS} items-center gap-3 border-b border-line py-2 text-sm`}>
                <span className="text-ink">{row.course?.name ?? '—'}</span>
                <span className="font-bold text-ink2">{row.name}</span>
                <span className="text-center text-ink">{row.questionCount}問</span>
                <span className="text-center text-ink">
                  {row.examPassLine == null ? '未設定' : `${row.examPassLine}%`}
                </span>
                <div className="flex justify-center">
                  <button
                    onClick={() => navigate(`/admin/shiken/${row.id}`)}
                    className="rounded border border-brand/60 px-3 py-1 text-xs font-bold text-brand hover:bg-brand/5"
                  >
                    試験管理
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
