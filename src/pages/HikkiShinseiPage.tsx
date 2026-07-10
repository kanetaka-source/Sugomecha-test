import { useEffect, useMemo, useState } from 'react'
import { examApplicationsApi, type ExamApplication } from '../lib/api'

const COLS =
  'grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,0.9fr)_minmax(0,0.9fr)_150px_120px_170px]'

// ISO日時 → 'YYYY/MM/DD HH:MM'
function fmt(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (isNaN(d.getTime())) return '—'
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}/${p(d.getMonth() + 1)}/${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
}

export default function HikkiShinseiPage() {
  const [rows, setRows] = useState<ExamApplication[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // フィルタ（初期は「申請中」＝対応が必要な申請を最初に表示）
  const [filterStatus, setFilterStatus] = useState('申請中') // ''=全て / 申請中 / 承認済
  const [filterCourse, setFilterCourse] = useState('')
  const [qApplicant, setQApplicant] = useState('')

  async function reload() {
    setError('')
    try {
      setRows(await examApplicationsApi.list())
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
  }, [])

  const courseOptions = useMemo(
    () => Array.from(new Set(rows.map((r) => r.section?.course?.name).filter((c): c is string => !!c))),
    [rows],
  )

  const filtered = rows.filter(
    (r) =>
      (filterStatus === '' || r.status === filterStatus) &&
      (filterCourse === '' || r.section?.course?.name === filterCourse) &&
      (r.applicant?.name ?? '').includes(qApplicant.trim()),
  )

  async function onApprove(r: ExamApplication) {
    if (!confirm(`${r.applicant?.name ?? ''} さんの申請を承認しますか？`)) return
    setError('')
    try {
      await examApplicationsApi.approve(r.id)
      await reload()
      // メニューの申請中バッジを更新
      window.dispatchEvent(new Event('exam-apps-changed'))
    } catch (e: any) {
      setError(e.message)
    }
  }

  const inputCls =
    'w-full rounded-md border border-line px-2 py-1 text-sm text-ink outline-none focus:border-accent'
  const labelCls = 'flex flex-col gap-1 text-xs font-bold text-muted'

  return (
    <div>
      <h1 className="mb-1 text-lg font-bold text-ink2">筆記試験申請</h1>
      <p className="mb-4 text-xs text-muted">
        受講者からの筆記試験申請を承認します。承認後の申請もフィルタで閲覧できます。
      </p>

      {error && (
        <p className="mb-3 rounded-md bg-danger/10 px-3 py-2 text-xs font-bold text-danger">{error}</p>
      )}

      {/* フィルタ */}
      <div className="mb-3 flex flex-wrap items-end gap-3">
        <label className={labelCls}>
          状態
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className={`${inputCls} w-32`}>
            <option value="">全て</option>
            <option value="申請中">申請中</option>
            <option value="承認済">承認済</option>
          </select>
        </label>
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
          申請者
          <input value={qApplicant} onChange={(e) => setQApplicant(e.target.value)} placeholder="氏名" className={`${inputCls} w-40`} />
        </label>
      </div>

      <div className="card-grad bg-surface/60 p-4">
        {loading ? (
          <p className="py-8 text-center text-sm text-muted">読み込み中…</p>
        ) : rows.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted">筆記試験の申請がありません。</p>
        ) : (
          <div className="space-y-1">
            <div className={`grid ${COLS} gap-3 border-b border-line2 pb-2 text-xs font-bold text-ink2`}>
              <span>研修コース</span>
              <span>研修セクション</span>
              <span>部署</span>
              <span>申請者</span>
              <span>申請日時</span>
              <span className="text-center">合否結果</span>
              <span className="text-center">承認</span>
            </div>
            {filtered.length === 0 && (
              <p className="py-6 text-center text-sm text-muted">該当する申請がありません。</p>
            )}
            {filtered.map((r) => (
              <div key={r.id} className={`grid ${COLS} items-center gap-3 border-b border-line py-2 text-sm`}>
                <span className="text-ink">{r.section?.course?.name ?? '—'}</span>
                <span className="font-bold text-ink2">{r.section?.name ?? '—'}</span>
                <span className="text-ink">{r.applicant?.department?.name ?? '—'}</span>
                <span className="text-ink">
                  {r.applicant?.name ?? '—'}
                  {r.applicant?.employeeNo ? <span className="text-muted">（{r.applicant.employeeNo}）</span> : null}
                </span>
                <span className="text-ink">{fmt(r.appliedAt)}</span>
                {/* 合否結果は筆記試験（受験）の結果を表示（手動設定はしない） */}
                <div className="flex justify-center">
                  {r.result === '合格' ? (
                    <span className="rounded-full bg-ok px-3 py-1 text-[11px] font-bold text-white">合格</span>
                  ) : r.result === '不合格' ? (
                    <span className="rounded-full bg-danger px-3 py-1 text-[11px] font-bold text-white">不合格</span>
                  ) : (
                    <span className="rounded-full bg-line px-3 py-1 text-[11px] font-bold text-muted">未受験</span>
                  )}
                </div>
                <div className="flex flex-col items-center gap-0.5">
                  {r.status === '承認済' ? (
                    <>
                      <span className="rounded-full bg-ok px-3 py-1 text-[11px] font-bold text-white">承認済</span>
                      <span className="text-[10px] text-muted">{fmt(r.approvedAt)}</span>
                    </>
                  ) : (
                    <button
                      onClick={() => onApprove(r)}
                      className="rounded-md bg-brand px-4 py-1.5 text-xs font-bold text-white hover:bg-brand-deep"
                    >
                      承認
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
