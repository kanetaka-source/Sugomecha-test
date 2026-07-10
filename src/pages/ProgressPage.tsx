import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  trainingCoursesApi,
  trainingSectionsApi,
  trainingItemsApi,
  trainingMaterialsApi,
  employeesApi,
  evalStampsApi,
  procedureGradesApi,
  procedureEvalsApi,
  type TrainingCourse,
  type TrainingSection,
  type TrainingItem,
  type Employee,
  type Procedure,
  type ProcedureResult,
} from '../lib/api'

// 手順書を「採点単位」に展開（工程ごとに、見るべきポイントが有ればポイント単位／無ければ工程自体を1単位）
type GradeUnit = { stepIndex: number; pointIndex: number; stepName: string; pointText: string }
function procedureUnits(procedure: Procedure): GradeUnit[] {
  const units: GradeUnit[] = []
  procedure.steps.forEach((step, si) => {
    const nonEmpty = (step.points || [])
      .map((p, pi) => ({ p, pi }))
      .filter((x) => x.p && x.p.trim())
    if (nonEmpty.length) {
      nonEmpty.forEach(({ p, pi }) =>
        units.push({ stepIndex: si, pointIndex: pi, stepName: step.name || '', pointText: p }),
      )
    } else {
      units.push({ stepIndex: si, pointIndex: 0, stepName: step.name || '', pointText: '' })
    }
  })
  return units
}
import { getCurrentUser } from '../lib/currentUser'
import { stampsToSet, countsToMap } from '../lib/evalProgress'

// 評価の押印セル（readOnly のときは押せない）。チェック済みは合格の印「合」を表示。
function StampCell({ filled, onToggle, readOnly }: { filled: boolean; onToggle: () => void; readOnly?: boolean }) {
  return (
    <button
      type="button"
      disabled={readOnly}
      title={readOnly ? '評価者・管理者のみ入力できます' : ''}
      onClick={() => !readOnly && onToggle()}
      className={`mx-auto grid h-10 w-10 place-items-center rounded-full border-2 transition-transform ${
        readOnly ? 'cursor-not-allowed opacity-50' : 'hover:scale-105'
      } ${filled ? 'border-ok text-ok' : 'border-line2 text-muted/50'}`}
    >
      <span className="text-[13px] font-bold leading-none">{filled ? '合' : '印'}</span>
    </button>
  )
}

// 手順書採点セル。結果に応じて 合格(合)／不合格(否)／未採点(印) を表示。クリックで採点モーダル。
function ResultStampCell({
  result,
  onClick,
  readOnly,
}: {
  result: ProcedureResult | null
  onClick: () => void
  readOnly?: boolean
}) {
  const style =
    result === 'pass'
      ? 'border-ok text-ok'
      : result === 'fail'
        ? 'border-danger text-danger'
        : 'border-line2 text-muted/50'
  const label = result === 'pass' ? '合' : result === 'fail' ? '否' : '印'
  return (
    <button
      type="button"
      disabled={readOnly}
      title={readOnly ? '評価者・管理者のみ採点できます' : '手順書で採点する'}
      onClick={() => !readOnly && onClick()}
      className={`mx-auto grid h-10 w-10 place-items-center rounded-full border-2 transition-transform ${
        readOnly ? 'cursor-not-allowed opacity-50' : 'hover:scale-105'
      } ${style}`}
    >
      <span className="text-[13px] font-bold leading-none">{label}</span>
    </button>
  )
}

// ISO日時を「2026/07/01 06:47」形式（日本時間）に整形
function formatDateTime(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ''
  return d.toLocaleString('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// カウント評価セル。現在回数/目標回数を ＋−で操作。目標到達で達成(緑)。
function CountCell({
  count,
  target,
  onChange,
  readOnly,
}: {
  count: number
  target: number
  onChange: (next: number) => void
  readOnly?: boolean
}) {
  const done = count >= target
  const btn = 'grid h-6 w-6 place-items-center rounded-full text-sm font-bold disabled:opacity-30'
  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className={`flex items-center gap-1 rounded-full border-2 px-1.5 py-1 ${
          done ? 'border-ok text-ok' : 'border-line2 text-ink'
        }`}
      >
        <button type="button" disabled={readOnly || count <= 0} onClick={() => onChange(count - 1)} className={`${btn} hover:bg-line`}>
          −
        </button>
        <span className="min-w-[34px] text-center text-[13px] font-bold leading-none">{count}/{target}</span>
        <button type="button" disabled={readOnly || count >= target} onClick={() => onChange(count + 1)} className={`${btn} hover:bg-line`}>
          ＋
        </button>
      </div>
      {done && <span className="rounded-full bg-ok/10 px-1.5 text-[9px] font-bold text-ok">達成</span>}
    </div>
  )
}

const uniq = (arr: (string | null | undefined)[]) =>
  Array.from(new Set(arr.filter((v): v is string => !!v)))

export default function ProgressPage() {
  const [params] = useSearchParams()
  const category = params.get('category') || ''
  const initialEmployeeId = params.get('employeeId') // 作業待ち等からの遷移で対象社員を指定
  const currentUser = getCurrentUser()

  const [courses, setCourses] = useState<TrainingCourse[]>([])
  const [sections, setSections] = useState<TrainingSection[]>([])
  const [items, setItems] = useState<TrainingItem[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // フィルタ
  const [filterLocation, setFilterLocation] = useState('')
  const [filterDept, setFilterDept] = useState('')
  const [employeeId, setEmployeeId] = useState<number | null>(null)
  const [courseId, setCourseId] = useState<number | null>(null)
  const [activeSectionId, setActiveSectionId] = useState<number | null>(null)

  // 選択社員の評価押印
  const [stamps, setStamps] = useState<Set<string>>(new Set())
  // カウント種別の現在回数（`${itemId}-${kind}-${idx}` → count）
  const [counts, setCounts] = useState<Map<string, number>>(new Map())

  // 研修項目ID → 手順書（手順書が登録されている項目のみ）
  const [procByItem, setProcByItem] = useState<Map<number, Procedure>>(new Map())
  // `${itemId}-${idx}` → 採点の総合結果（選択社員。合格/不合格スタンプの表示に使う。管理者評価の列ごとに独立）
  const [evalByCell, setEvalByCell] = useState<Map<string, { result: ProcedureResult; comment: string }>>(
    new Map(),
  )

  // 手順書採点モーダル
  const [gradeModal, setGradeModal] = useState<
    { itemId: number; idx: number; title: string; units: GradeUnit[] } | null
  >(null)
  const [pointDraft, setPointDraft] = useState<Record<string, boolean>>({}) // `${stepIndex}-${pointIndex}` → 合否
  const [gradeComment, setGradeComment] = useState('')
  const [gradeInfo, setGradeInfo] = useState<{ gradedByName: string | null; gradedAt: string | null }>({
    gradedByName: null,
    gradedAt: null,
  })
  const [gradeLoading, setGradeLoading] = useState(false)
  const [gradeSaving, setGradeSaving] = useState(false)

  useEffect(() => {
    ;(async () => {
      setLoading(true)
      try {
        const [cs, secs, its, emps, mats] = await Promise.all([
          trainingCoursesApi.list(),
          trainingSectionsApi.list(),
          trainingItemsApi.list(),
          employeesApi.list(),
          trainingMaterialsApi.list(),
        ])
        setCourses(cs)
        setSections(secs)
        setItems(its)
        setEmployees(emps)
        // 手順書（steps が1件以上）を持つ教材から itemId→procedure マップを作成
        const pm = new Map<number, Procedure>()
        for (const m of mats) {
          if (m.itemId != null && m.procedure?.steps?.length && !pm.has(m.itemId)) {
            pm.set(m.itemId, m.procedure)
          }
        }
        setProcByItem(pm)
        const initial = category ? cs.find((c) => c.name === category) : null
        setCourseId(initial?.id ?? cs[0]?.id ?? null)
        // URLで対象社員が指定されていれば初期選択
        if (initialEmployeeId && emps.some((e) => e.id === Number(initialEmployeeId))) {
          setEmployeeId(Number(initialEmployeeId))
        }
      } catch (e: any) {
        setError(e.message)
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  // ログイン者のロール → 評価者/管理者なら編集可
  const myRole = employees.find((e) => e.id === currentUser?.id)?.role
  const canEdit = myRole === '評価者' || myRole === '管理者'

  // フィルタ候補
  const locationOptions = useMemo(
    () => uniq(employees.map((e) => e.department?.location?.name)),
    [employees],
  )
  const deptOptions = useMemo(
    () =>
      uniq(
        employees
          .filter((e) => !filterLocation || e.department?.location?.name === filterLocation)
          .map((e) => e.department?.name),
      ),
    [employees, filterLocation],
  )
  const filteredEmployees = useMemo(
    () =>
      employees.filter(
        (e) =>
          (!filterLocation || e.department?.location?.name === filterLocation) &&
          (!filterDept || e.department?.name === filterDept),
      ),
    [employees, filterLocation, filterDept],
  )

  // フィルタ変更時、選択社員が候補外なら先頭に
  useEffect(() => {
    if (!filteredEmployees.some((e) => e.id === employeeId)) {
      setEmployeeId(filteredEmployees[0]?.id ?? null)
    }
  }, [filteredEmployees])

  // 選択社員の評価実績（押印＋手順書採点の総合結果）を取得
  useEffect(() => {
    ;(async () => {
      if (employeeId == null) {
        setStamps(new Set())
        setEvalByCell(new Map())
        return
      }
      try {
        const [stampList, evals] = await Promise.all([
          evalStampsApi.list(employeeId),
          procedureEvalsApi.list(employeeId),
        ])
        setStamps(stampsToSet(stampList))
        setCounts(countsToMap(stampList))
        setEvalByCell(
          new Map(evals.map((e) => [`${e.itemId}-${e.idx}`, { result: e.result, comment: e.comment ?? '' }])),
        )
      } catch {
        setStamps(new Set())
        setCounts(new Map())
        setEvalByCell(new Map())
      }
    })()
  }, [employeeId])

  const courseSections = useMemo(
    () => sections.filter((s) => s.course?.id === courseId),
    [sections, courseId],
  )
  useEffect(() => {
    setActiveSectionId(courseSections[0]?.id ?? null)
  }, [courseId, courseSections.length])

  const selectedEmployee = employees.find((e) => e.id === employeeId) || null
  const activeSection = courseSections.find((s) => s.id === activeSectionId) || null
  const rows = activeSection ? items.filter((it) => it.sectionId === activeSection.id) : []

  const headerCols = activeSection
    ? [1, 2, 3, 4, 5]
        .filter((i) => (activeSection as any)[`header${i}Flag`])
        .map((i) => ({ i, name: (activeSection as any)[`header${i}Name`] || `項目${i}` }))
    : []
  const evalCols = activeSection
    ? [
        ...[1, 2]
          .filter((i) => (activeSection as any)[`selfEval${i}Flag`])
          .map((i) => ({
            kind: 'self' as const,
            i,
            name: (activeSection as any)[`selfEval${i}Name`] || '自己評価',
            type: (activeSection as any)[`selfEval${i}Type`] as string | null,
            target: (activeSection as any)[`selfEval${i}Count`] as number,
          })),
        ...[1, 2, 3]
          .filter((i) => (activeSection as any)[`adminEval${i}Flag`])
          .map((i) => ({
            kind: 'admin' as const,
            i,
            name: (activeSection as any)[`adminEval${i}Name`] || '評価',
            type: (activeSection as any)[`adminEval${i}Type`] as string | null,
            target: (activeSection as any)[`adminEval${i}Count`] as number,
          })),
      ]
    : []

  // 評価セルのクリック。管理者評価で手順書があれば採点モーダル、それ以外は単純トグル。
  function handleStampClick(itemId: number, kind: 'self' | 'admin', idx: number) {
    if (!canEdit || employeeId == null) return
    const proc = procByItem.get(itemId)
    if (kind === 'admin' && proc) {
      openGradeModal(itemId, idx, proc)
    } else {
      toggleStamp(itemId, kind, idx)
    }
  }

  // 押印ON/OFF（選択社員の評価実績をDB保存）
  function toggleStamp(itemId: number, kind: 'self' | 'admin', idx: number) {
    if (!canEdit || employeeId == null) return
    const key = `${itemId}-${kind}-${idx}`
    const value = !stamps.has(key)
    setStamps((prev) => {
      const n = new Set(prev)
      value ? n.add(key) : n.delete(key)
      return n
    })
    evalStampsApi.set(employeeId, itemId, kind, idx, value, currentUser?.name).catch(() => {
      setStamps((prev) => {
        const n = new Set(prev)
        value ? n.delete(key) : n.add(key)
        return n
      })
    })
  }

  // カウント種別の回数変更（選択社員の評価実績をDB保存）
  function changeCount(itemId: number, kind: 'self' | 'admin', idx: number, target: number, next: number) {
    if (!canEdit || employeeId == null) return
    const key = `${itemId}-${kind}-${idx}`
    const clamped = Math.max(0, Math.min(target, next))
    const prev = counts.get(key) ?? 0
    setCounts((m) => new Map(m).set(key, clamped))
    evalStampsApi.setCount(employeeId, itemId, kind, idx, clamped, currentUser?.name).catch(() => {
      setCounts((m) => new Map(m).set(key, prev))
    })
  }

  // 採点モーダルを開く（既存の合否・コメントを読み込んで初期表示）
  async function openGradeModal(itemId: number, idx: number, procedure: Procedure) {
    if (employeeId == null) return
    const title = items.find((it) => it.id === itemId)?.title ?? '研修項目'
    const units = procedureUnits(procedure)
    setGradeModal({ itemId, idx, title, units })
    setPointDraft(Object.fromEntries(units.map((u) => [`${u.stepIndex}-${u.pointIndex}`, false])))
    setGradeComment('')
    setGradeInfo({ gradedByName: null, gradedAt: null })
    setGradeLoading(true)
    try {
      const detail = await procedureGradesApi.get(employeeId, itemId, idx)
      const saved: Record<string, boolean> = {}
      for (const u of units) {
        const key = `${u.stepIndex}-${u.pointIndex}`
        saved[key] = detail.grades.find((g) => g.stepIndex === u.stepIndex && g.pointIndex === u.pointIndex)?.pass ?? false
      }
      setPointDraft(saved)
      setGradeComment(detail.comment ?? '')
      setGradeInfo({ gradedByName: detail.gradedByName, gradedAt: detail.gradedAt })
    } catch {
      // 取得失敗時は初期値（全て不合格・コメント空）のまま
    } finally {
      setGradeLoading(false)
    }
  }

  // 全ポイント合格かどうか（モーダルのプレビュー＆保存で使用）
  const draftAllPass =
    gradeModal != null &&
    gradeModal.units.length > 0 &&
    gradeModal.units.every((u) => pointDraft[`${u.stepIndex}-${u.pointIndex}`])

  // 採点を保存。全ポイント合格なら結果=合格＋管理者評価スタンプON、不合格ありなら結果=不合格＋スタンプOFF。
  async function saveGrades() {
    if (gradeModal == null || employeeId == null) return
    const { itemId, idx, units } = gradeModal
    const grades = units.map((u) => ({
      stepIndex: u.stepIndex,
      pointIndex: u.pointIndex,
      pass: !!pointDraft[`${u.stepIndex}-${u.pointIndex}`],
    }))
    const allPass = grades.length > 0 && grades.every((g) => g.pass)
    const result: ProcedureResult = allPass ? 'pass' : 'fail'
    const key = `${itemId}-admin-${idx}`
    setGradeSaving(true)
    try {
      await procedureGradesApi.save(
        employeeId,
        itemId,
        idx,
        grades,
        result,
        gradeComment,
        currentUser ? { id: currentUser.id, name: currentUser.name } : undefined,
      )
      await evalStampsApi.set(employeeId, itemId, 'admin', idx, allPass)
      // 画面を即時更新（このセル idx の結果のみ更新）
      setEvalByCell((prev) => new Map(prev).set(`${itemId}-${idx}`, { result, comment: gradeComment }))
      setStamps((prev) => {
        const n = new Set(prev)
        allPass ? n.add(key) : n.delete(key)
        return n
      })
      setGradeModal(null)
    } catch (e: any) {
      setError(e?.message || '採点の保存に失敗しました')
    } finally {
      setGradeSaving(false)
    }
  }

  if (loading) {
    return <p className="py-8 text-center text-sm text-muted">読み込み中…</p>
  }

  const selectCls =
    'rounded-md border border-line px-2 py-1 text-sm text-ink outline-none focus:border-accent'
  const labelCls = 'flex flex-col gap-1 text-xs font-bold text-muted'

  return (
    <div>
      {/* タイトル + 研修コース */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-lg font-bold text-ink2">進捗状況</h1>
        <label className="flex items-center gap-2 text-xs font-bold text-muted">
          研修コース
          <select value={courseId ?? ''} onChange={(e) => setCourseId(e.target.value === '' ? null : Number(e.target.value))} className={selectCls}>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </label>
      </div>

      {error && (
        <p className="mb-3 rounded-md bg-danger/10 px-3 py-2 text-xs font-bold text-danger">{error}</p>
      )}

      {/* フィルタ: 拠点 / 部署 / 社員 */}
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <label className={labelCls}>
          拠点
          <select value={filterLocation} onChange={(e) => { setFilterLocation(e.target.value); setFilterDept('') }} className={`${selectCls} w-36`}>
            <option value="">全拠点</option>
            {locationOptions.map((l) => (<option key={l} value={l}>{l}</option>))}
          </select>
        </label>
        <label className={labelCls}>
          部署
          <select value={filterDept} onChange={(e) => setFilterDept(e.target.value)} className={`${selectCls} w-36`}>
            <option value="">全部署</option>
            {deptOptions.map((d) => (<option key={d} value={d}>{d}</option>))}
          </select>
        </label>
        <label className={labelCls}>
          社員
          <select value={employeeId ?? ''} onChange={(e) => setEmployeeId(e.target.value === '' ? null : Number(e.target.value))} className={`${selectCls} w-48`}>
            {filteredEmployees.length === 0 && <option value="">該当なし</option>}
            {filteredEmployees.map((e) => (
              <option key={e.id} value={e.id}>{e.employeeNo} {e.name}</option>
            ))}
          </select>
        </label>
        {!canEdit && (
          <span className="pb-1 text-[11px] text-muted">※閲覧のみ（評価入力は評価者・管理者）</span>
        )}
      </div>

      {selectedEmployee == null ? (
        <div className="card-grad bg-surface/70 p-8 text-center text-sm text-muted">対象の社員を選択してください。</div>
      ) : courseSections.length === 0 ? (
        <div className="card-grad bg-surface/70 p-8 text-center text-sm text-muted">この研修コースの研修セクションが登録されていません。</div>
      ) : (
        <div className="flex items-start">
          {/* 左: セクションタブ */}
          <div className="-mr-2 flex shrink-0 flex-col gap-2 pt-2">
            {courseSections.map((s) => {
              const active = s.id === activeSectionId
              return (
                <button
                  key={s.id}
                  onClick={() => setActiveSectionId(s.id)}
                  className={`flex w-28 items-center px-2 py-1.5 text-[11px] font-bold text-white transition-[filter] ${
                    active ? 'tab-grad-active' : 'tab-grad-idle hover:brightness-95'
                  }`}
                >
                  <span className="truncate">{s.name}</span>
                </button>
              )
            })}
          </div>

          {/* 右: 評価カード（選択社員） */}
          <div className="card-grad relative z-10 min-w-0 flex-1 bg-surface/70 p-4 shadow-sm">
            <p className="mb-3 text-xs text-muted">
              対象：<span className="font-bold text-ink2">{selectedEmployee.name}</span>
              （{selectedEmployee.employeeNo} ・ {selectedEmployee.department?.name ?? '—'} ・ {selectedEmployee.role}）
            </p>
            <div className="scroll-area max-h-[64vh] overflow-y-auto pr-1">
              {rows.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted">このセクションの研修項目が登録されていません。</p>
              ) : (
                <div className="space-y-3">
                  {rows.map((row) => (
                    <div key={row.id} className="flex flex-wrap items-center gap-x-4 gap-y-3 rounded-lg border border-line bg-white/70 p-3">
                      <div className="min-w-[160px] flex-1 space-y-0.5">
                        {headerCols.map((c) => (
                          <p key={`cv${c.i}`} className="text-[12px] leading-snug">
                            <span className="text-muted">{c.name}：</span>
                            <span className="font-bold text-ink2">{(row as any)[`value${c.i}`] || '—'}</span>
                          </p>
                        ))}
                      </div>
                      <div className="flex shrink-0 items-end gap-5">
                        {evalCols.map((c) => {
                          const key = `${row.id}-${c.kind}-${c.i}`
                          const isCount = c.type === 'カウント'
                          const target = Math.max(1, c.target || 0)
                          const hasProc = c.kind === 'admin' && !isCount && procByItem.has(row.id)
                          return (
                            <div key={key} className="flex flex-col items-center gap-1">
                              <span className="text-[11px] font-bold text-muted">{c.name}</span>
                              {isCount ? (
                                <CountCell
                                  count={counts.get(key) ?? 0}
                                  target={target}
                                  onChange={(n) => changeCount(row.id, c.kind, c.i, target, n)}
                                  readOnly={!canEdit}
                                />
                              ) : hasProc ? (
                                <ResultStampCell
                                  result={evalByCell.get(`${row.id}-${c.i}`)?.result ?? null}
                                  onClick={() => handleStampClick(row.id, c.kind, c.i)}
                                  readOnly={!canEdit}
                                />
                              ) : (
                                <StampCell
                                  filled={stamps.has(key)}
                                  onToggle={() => handleStampClick(row.id, c.kind, c.i)}
                                  readOnly={!canEdit}
                                />
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 手順書 採点モーダル */}
      {gradeModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => !gradeSaving && setGradeModal(null)}
        >
          <div
            className="flex max-h-[88vh] w-full max-w-lg flex-col overflow-hidden rounded-xl bg-surface shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* ヘッダー */}
            <div className="flex items-center justify-between border-b border-line px-5 py-3">
              <div>
                <p className="text-[11px] font-bold text-muted">手順書 採点</p>
                <h2 className="text-base font-bold text-ink2">{gradeModal.title}</h2>
              </div>
              <button
                type="button"
                onClick={() => !gradeSaving && setGradeModal(null)}
                className="grid h-7 w-7 place-items-center rounded-full text-muted hover:bg-line"
              >
                ✕
              </button>
            </div>

            {/* 見るべきポイントごとの採点 */}
            <div className="scroll-area flex-1 overflow-y-auto px-5 py-4">
              {gradeLoading ? (
                <p className="py-6 text-center text-sm text-muted">読み込み中…</p>
              ) : (
                <div className="space-y-3">
                  <p className="text-[11px] text-muted">見るべきポイントごとに合否を入力してください。</p>
                  {gradeModal.units.map((u, i) => {
                    const key = `${u.stepIndex}-${u.pointIndex}`
                    const pass = !!pointDraft[key]
                    const isNewStep = i === 0 || gradeModal.units[i - 1].stepIndex !== u.stepIndex
                    return (
                      <div key={key}>
                        {/* 工程見出し（工程が変わるところで表示） */}
                        {isNewStep && (
                          <p className="mb-1 mt-2 text-[12px] font-bold text-ink2">
                            工程 {u.stepIndex + 1}：{u.stepName || '—'}
                          </p>
                        )}
                        <div className="flex items-center justify-between gap-3 rounded-lg border border-line bg-white/70 px-3 py-2">
                          <span className="min-w-0 text-[12px] text-ink">
                            {u.pointText || '（ポイント未登録：工程全体を採点）'}
                          </span>
                          {/* 合格 / 不合格 トグル */}
                          <div className="flex shrink-0 overflow-hidden rounded-md border border-line">
                            <button
                              type="button"
                              onClick={() => setPointDraft((prev) => ({ ...prev, [key]: true }))}
                              className={`px-3 py-1 text-[11px] font-bold transition-colors ${
                                pass ? 'bg-ok text-white' : 'bg-transparent text-muted hover:bg-line'
                              }`}
                            >
                              合格
                            </button>
                            <button
                              type="button"
                              onClick={() => setPointDraft((prev) => ({ ...prev, [key]: false }))}
                              className={`px-3 py-1 text-[11px] font-bold transition-colors ${
                                !pass ? 'bg-danger text-white' : 'bg-transparent text-muted hover:bg-line'
                              }`}
                            >
                              不合格
                            </button>
                          </div>
                        </div>
                      </div>
                    )
                  })}

                  {/* コメント */}
                  <div className="pt-2">
                    <label className="mb-1 block text-[12px] font-bold text-muted">コメント（任意）</label>
                    <textarea
                      value={gradeComment}
                      onChange={(e) => setGradeComment(e.target.value)}
                      rows={3}
                      placeholder="指導内容・申し送りなど"
                      className="w-full resize-none rounded-md border border-line px-3 py-2 text-sm text-ink outline-none focus:border-accent"
                    />
                  </div>

                  {/* 前回の採点者・採点日時 */}
                  {gradeInfo.gradedByName && (
                    <p className="text-[11px] text-muted">
                      前回の採点：{gradeInfo.gradedByName}
                      {gradeInfo.gradedAt && `（${formatDateTime(gradeInfo.gradedAt)}）`}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* フッター */}
            <div className="border-t border-line px-5 py-3">
              <p className="mb-2 text-center text-[11px] font-bold">
                {draftAllPass ? (
                  <span className="text-ok">全ポイント合格 → 合格スタンプ（合）を付けます</span>
                ) : (
                  <span className="text-danger">不合格のポイントあり → 不合格スタンプ（否）を付けます</span>
                )}
              </p>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setGradeModal(null)}
                  disabled={gradeSaving}
                  className="rounded-md border border-line px-4 py-1.5 text-xs font-bold text-muted hover:bg-line disabled:opacity-50"
                >
                  キャンセル
                </button>
                <button
                  type="button"
                  onClick={saveGrades}
                  disabled={gradeSaving || gradeLoading}
                  className="rounded-md bg-brand px-4 py-1.5 text-xs font-bold text-white hover:bg-brand-deep disabled:opacity-50"
                >
                  {gradeSaving ? '保存中…' : '採点を保存'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
