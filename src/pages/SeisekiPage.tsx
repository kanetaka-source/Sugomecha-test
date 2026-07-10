import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  employeesApi,
  trainingCoursesApi,
  trainingSectionsApi,
  trainingItemsApi,
  evalStampsApi,
  procedureEvalsApi,
  examApplicationsApi,
  heldQualificationsApi,
  type Employee,
  type TrainingCourse,
  type TrainingSection,
  type TrainingItem,
  type ProcedureEval,
  type ExamApplication,
  type HeldQualItem,
} from '../lib/api'
import { getCurrentUser } from '../lib/currentUser'
import { stampsToSet, countsToMap, isItemEvaluated } from '../lib/evalProgress'
import { ProgressRing } from '../components/ProgressRing'
import { IconAlert } from '../components/icons'

// 日時「2026/07/01 06:47」/ 日付「2026/07/01」に整形
function fmtDateTime(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  return isNaN(d.getTime())
    ? ''
    : d.toLocaleString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
}
function fmtDate(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('ja-JP')
}
// 有効期限までの残日数（負なら期限切れ）
function daysLeft(iso: string | null): number | null {
  if (!iso) return null
  const d = new Date(iso)
  if (isNaN(d.getTime())) return null
  return Math.ceil((d.getTime() - Date.now()) / 86400000)
}

// 進捗グラデーションバー（ロード時に 0→pct へ上昇アニメーション）
function GradientBar({ done, total }: { done: number; total: number }) {
  const pct = total > 0 ? Math.round((done / total) * 100) : 0
  const [w, setW] = useState(0)
  useEffect(() => {
    const id = requestAnimationFrame(() => setW(pct))
    return () => cancelAnimationFrame(id)
  }, [pct])
  return (
    <div className="flex items-center gap-2">
      <div className="h-3 flex-1 overflow-hidden rounded-[5px] border border-line2 bg-white">
        <div className="h-full bg-gauge transition-[width] duration-700 ease-out" style={{ width: `${w}%` }} />
      </div>
      <span className="w-16 shrink-0 text-right text-[10px] text-muted">
        {done}/{total}
      </span>
    </div>
  )
}

// 統計タイル
function StatTile({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-lg border border-line bg-white/70 px-3 py-2 text-center">
      <p className="text-[10px] font-bold text-muted">{label}</p>
      <p className="text-lg font-bold leading-tight text-ink2">{value}</p>
      {sub && <p className="text-[10px] text-muted">{sub}</p>}
    </div>
  )
}

// 見出し
function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="mb-3 text-base font-bold text-ink2">{children}</h2>
}

export default function SeisekiPage() {
  const navigate = useNavigate()
  const currentUser = getCurrentUser()
  const [searchParams] = useSearchParams()
  // ?employeeId= があればその社員の成績を表示（ランキングから遷移）。無ければ自分。
  const paramId = searchParams.get('employeeId')
  const viewId = paramId ? Number(paramId) : currentUser?.id ?? null
  const isOther = viewId != null && viewId !== currentUser?.id

  const [employee, setEmployee] = useState<Employee | null>(null)
  const [courses, setCourses] = useState<TrainingCourse[]>([])
  const [sections, setSections] = useState<TrainingSection[]>([])
  const [items, setItems] = useState<TrainingItem[]>([])
  const [stamps, setStamps] = useState<Set<string>>(new Set())
  const [counts, setCounts] = useState<Map<string, number>>(new Map())
  const [evals, setEvals] = useState<ProcedureEval[]>([])
  const [apps, setApps] = useState<ExamApplication[]>([])
  const [held, setHeld] = useState<HeldQualItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    ;(async () => {
      setLoading(true)
      try {
        const uid = viewId
        const [emp, cs, secs, its, ss, ev, ap, hq] = await Promise.all([
          uid ? employeesApi.get(uid) : Promise.resolve(null),
          trainingCoursesApi.list(),
          trainingSectionsApi.list(),
          trainingItemsApi.list(),
          uid ? evalStampsApi.list(uid) : Promise.resolve([]),
          uid ? procedureEvalsApi.list(uid) : Promise.resolve([]),
          uid ? examApplicationsApi.list({ applicantId: uid }) : Promise.resolve([]),
          uid ? heldQualificationsApi.get(uid) : Promise.resolve(null),
        ])
        setEmployee(emp)
        setCourses(cs)
        setSections(secs)
        setItems(its)
        setStamps(stampsToSet(ss))
        setCounts(countsToMap(ss))
        setEvals(ev)
        setApps(ap)
        setHeld(hq?.held ?? [])
      } catch (e: any) {
        setError(e.message)
      } finally {
        setLoading(false)
      }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewId])

  const itemById = useMemo(() => new Map(items.map((i) => [i.id, i])), [items])
  const sectionById = useMemo(() => new Map(sections.map((s) => [s.id, s])), [sections])
  const courseById = useMemo(() => new Map(courses.map((c) => [c.id, c])), [courses])

  // 履修コース（無ければ全コースを対象に）
  const enrolledCourseIds = useMemo(() => {
    const ids = employee?.enrolledCourses.map((c) => c.id) ?? []
    return ids.length ? ids : courses.map((c) => c.id)
  }, [employee, courses])

  // 対象セクション（履修コースに属するもの）
  const mySections = useMemo(
    () => sections.filter((s) => s.courseId != null && enrolledCourseIds.includes(s.courseId)),
    [sections, enrolledCourseIds],
  )

  // セクションの達成（評価済み項目数 / 全項目数）
  function sectionStats(sec: TrainingSection) {
    const its = items.filter((i) => i.sectionId === sec.id)
    const done = its.filter((i) => isItemEvaluated(i.id, sec, stamps, counts)).length
    return { done, total: its.length }
  }

  // 項目タイトル / 評価列名（idx→adminEval{idx}Name）
  const itemTitle = (itemId: number) => itemById.get(itemId)?.title ?? '研修項目'
  const colName = (itemId: number, idx: number) => {
    const sec = sectionById.get(itemById.get(itemId)?.sectionId ?? -1)
    return (sec as any)?.[`adminEval${idx}Name`] || '評価'
  }

  if (loading) return <p className="py-8 text-center text-sm text-muted">読み込み中…</p>

  // ---- 集計 ----
  const totalDone = mySections.reduce((s, sec) => s + sectionStats(sec).done, 0)
  const totalAll = mySections.reduce((s, sec) => s + sectionStats(sec).total, 0)
  const overallPct = totalAll > 0 ? Math.round((totalDone / totalAll) * 100) : 0

  const passCount = evals.filter((e) => e.result === 'pass').length
  const examPass = apps.filter((a) => a.result === '合格').length

  // ---- 要対応 ----
  // 不合格の手順採点
  const failedEvals = evals.filter((e) => e.result === 'fail')
  // 未取得の必要資格（履修コースの項目に紐づく必要資格 − 保有）
  const heldIds = new Set(held.map((h) => h.qualificationId))
  const missingQuals = computeMissingQuals(items, mySections, heldIds)
  // 期限が近い/切れた資格（60日以内）
  const expiringQuals = held
    .map((h) => ({ ...h, d: daysLeft(h.validUntil) }))
    .filter((h) => h.d != null && h.d <= 60)
    .sort((a, b) => (a.d! - b.d!))

  const hasTodo = failedEvals.length > 0 || missingQuals.length > 0 || expiringQuals.length > 0

  return (
    <div className="space-y-7">
      {isOther && (
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1 text-xs font-bold text-brand hover:underline"
        >
          ← ランキングへ戻る
        </button>
      )}
      {error && <p className="rounded-md bg-danger/10 px-3 py-2 text-xs font-bold text-danger">{error}</p>}

      {/* ===== 総合サマリー ===== */}
      <section>
        <div className="card-grad bg-surface/60 p-5">
          <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-center">
            {/* 達成率リング */}
            <ProgressRing value={overallPct} size={128} stroke={12}>
              <div>
                <p className="text-2xl font-bold text-ink2">{overallPct}%</p>
                <p className="text-[10px] text-muted">達成率</p>
              </div>
            </ProgressRing>
            {/* 氏名＋統計タイル */}
            <div className="min-w-0 flex-1">
              <p className="mb-3 text-sm text-muted">
                <span className="text-base font-bold text-ink2">{employee?.name ?? currentUser?.name ?? 'ゲスト'}</span>
                {employee && <>　さんの成績（{employee.department?.name ?? '—'} ・ {employee.role}）</>}
              </p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <StatTile label="評価済み項目" value={`${totalDone}/${totalAll}`} />
                <StatTile label="手順採点 合格" value={`${passCount}`} sub={`採点 ${evals.length} 件`} />
                <StatTile label="筆記試験 合格" value={`${examPass}`} sub={`受験 ${apps.length} 件`} />
                <StatTile label="保有資格" value={`${held.length}`} />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== 要対応 ===== */}
      {hasTodo && (
        <section>
          <SectionTitle>要対応</SectionTitle>
          <div className="space-y-2 rounded-xl border border-gold/40 bg-gold/5 p-4">
            {failedEvals.map((e) => (
              <div key={`f${e.itemId}-${e.idx}`} className="flex items-start gap-2 text-[13px]">
                <span className="mt-0.5 shrink-0 rounded bg-danger px-1.5 py-0.5 text-[10px] font-bold text-white">不合格</span>
                <span className="text-ink">
                  <span className="font-bold text-ink2">{itemTitle(e.itemId)}</span>（{colName(e.itemId, e.idx)}）
                  {e.comment && <span className="text-muted"> — {e.comment}</span>}
                </span>
              </div>
            ))}
            {missingQuals.map((q) => (
              <div key={`mq${q.id}`} className="flex items-center gap-2 text-[13px]">
                <span className="shrink-0 rounded bg-brand px-1.5 py-0.5 text-[10px] font-bold text-white">要取得</span>
                <span className="text-ink">必要資格が未取得：<span className="font-bold text-ink2">{q.name}</span></span>
              </div>
            ))}
            {expiringQuals.map((q) => (
              <div key={`eq${q.qualificationId}`} className="flex items-center gap-2 text-[13px]">
                <span className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold text-white ${q.d! < 0 ? 'bg-danger' : 'bg-gold'}`}>
                  {q.d! < 0 ? '期限切れ' : '期限間近'}
                </span>
                <span className="text-ink">
                  <span className="font-bold text-ink2">{q.name}</span>
                  <span className="text-muted">（有効期限 {fmtDate(q.validUntil)}{q.d! >= 0 && ` ・ あと${q.d}日`}）</span>
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ===== コース別 進捗 ===== */}
      <section>
        <SectionTitle>コース別 進捗</SectionTitle>
        <div className="card-grad space-y-4 bg-surface/50 p-4">
          {enrolledCourseIds.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted">履修中のコースがありません。</p>
          ) : (
            enrolledCourseIds.map((cid) => {
              const course = courseById.get(cid)
              const secs = mySections.filter((s) => s.courseId === cid)
              const done = secs.reduce((a, sec) => a + sectionStats(sec).done, 0)
              const total = secs.reduce((a, sec) => a + sectionStats(sec).total, 0)
              return (
                <div key={cid}>
                  <div className="mb-1 flex items-center gap-3">
                    <span className="grid w-24 shrink-0 place-items-center rounded-[5px] bg-gauge py-1 text-[11px] font-bold text-white">
                      {course?.name ?? 'コース'}
                    </span>
                    <div className="min-w-0 flex-1"><GradientBar done={done} total={total} /></div>
                  </div>
                  {/* セクション内訳 */}
                  <div className="ml-3 space-y-1.5 border-l-2 border-line pl-3 pt-1">
                    {secs.map((sec) => {
                      const st = sectionStats(sec)
                      return (
                        <div key={sec.id} className="flex items-center gap-3">
                          <span className="w-20 shrink-0 truncate text-[11px] font-bold text-muted">{sec.name}</span>
                          <div className="min-w-0 flex-1"><GradientBar done={st.done} total={st.total} /></div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })
          )}
        </div>
      </section>

      {/* ===== 手順書 採点結果 ===== */}
      <section>
        <SectionTitle>手順書 採点結果</SectionTitle>
        {evals.length === 0 ? (
          <div className="card-grad bg-surface/50 p-6 text-center text-sm text-muted">まだ採点された項目はありません。</div>
        ) : (
          <div className="space-y-2">
            {evals.map((e) => (
              <div
                key={`${e.itemId}-${e.idx}`}
                className="flex items-start gap-3 rounded-lg border border-line bg-white/70 p-3"
              >
                <span
                  className={`mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full border-2 text-[13px] font-bold ${
                    e.result === 'pass' ? 'border-ok text-ok' : 'border-danger text-danger'
                  }`}
                >
                  {e.result === 'pass' ? '合' : '否'}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-bold text-ink2">
                    {itemTitle(e.itemId)} <span className="text-[11px] font-normal text-muted">/ {colName(e.itemId, e.idx)}</span>
                  </p>
                  {e.comment && <p className="mt-0.5 whitespace-pre-wrap text-[12px] text-ink">{e.comment}</p>}
                  {(e.gradedByName || e.gradedAt) && (
                    <p className="mt-1 text-[10px] text-muted">
                      採点：{e.gradedByName ?? '—'}{e.gradedAt && `（${fmtDateTime(e.gradedAt)}）`}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ===== 筆記試験 結果 ===== */}
      <section>
        <SectionTitle>筆記試験 結果</SectionTitle>
        {apps.length === 0 ? (
          <div className="card-grad bg-surface/50 p-6 text-center text-sm text-muted">筆記試験の申請・受験履歴はありません。</div>
        ) : (
          <div className="space-y-2">
            {apps.map((a) => {
              const badge =
                a.result === '合格'
                  ? { cls: 'bg-ok', text: '合格' }
                  : a.result === '不合格'
                    ? { cls: 'bg-danger', text: '不合格' }
                    : a.status === '承認済'
                      ? { cls: 'bg-accent', text: '受験可' }
                      : { cls: 'bg-gold', text: '申請中' }
              return (
                <div key={a.id} className="flex items-center justify-between gap-3 rounded-lg border border-line bg-white/70 p-3">
                  <div className="min-w-0">
                    <p className="text-[13px] font-bold text-ink2">{a.section?.name ?? '—'}</p>
                    <p className="text-[11px] text-muted">{a.section?.course?.name ?? '—'} ・ 申請 {fmtDate(a.appliedAt)}</p>
                  </div>
                  <span className={`shrink-0 rounded px-2.5 py-1 text-[11px] font-bold text-white ${badge.cls}`}>{badge.text}</span>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* ===== 保有資格 ===== */}
      <section>
        <SectionTitle>保有資格</SectionTitle>
        {held.length === 0 ? (
          <div className="card-grad bg-surface/50 p-6 text-center text-sm text-muted">
            登録された保有資格はありません。
            <button onClick={() => navigate('/shikaku')} className="ml-2 font-bold text-brand underline">資格ページへ</button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {held.map((h) => {
              const d = daysLeft(h.validUntil)
              return (
                <div key={h.qualificationId} className="flex items-center justify-between gap-3 rounded-lg border border-line bg-white/70 p-3">
                  <div className="min-w-0">
                    <p className="text-[13px] font-bold text-ink2">{h.name}</p>
                    <p className="text-[11px] text-muted">{h.category ?? '—'} ・ 期限 {fmtDate(h.validUntil)}</p>
                  </div>
                  {d != null && d <= 60 && (
                    <span className={`flex shrink-0 items-center gap-1 rounded px-2 py-1 text-[10px] font-bold text-white ${d < 0 ? 'bg-danger' : 'bg-gold'}`}>
                      <IconAlert className="h-3 w-3" />
                      {d < 0 ? '期限切れ' : `あと${d}日`}
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}

// 履修コースの項目に紐づく必要資格のうち、未保有のものを一意に返す
function computeMissingQuals(items: TrainingItem[], mySections: TrainingSection[], heldIds: Set<number>) {
  const secIds = new Set(mySections.map((s) => s.id))
  const map = new Map<number, { id: number; name: string }>()
  for (const it of items) {
    if (it.sectionId == null || !secIds.has(it.sectionId)) continue
    for (const q of it.requiredQualifications) {
      if (!heldIds.has(q.id) && !map.has(q.id)) map.set(q.id, { id: q.id, name: q.name })
    }
  }
  return [...map.values()]
}
