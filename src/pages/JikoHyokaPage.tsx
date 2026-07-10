import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  trainingCoursesApi,
  trainingSectionsApi,
  trainingItemsApi,
  trainingMaterialsApi,
  examApplicationsApi,
  heldQualificationsApi,
  evalStampsApi,
  procedureEvalsApi,
  procedureGradesApi,
  type TrainingCourse,
  type TrainingSection,
  type TrainingItem,
  type ExamApplication,
  type ProcedureResult,
  type Procedure,
} from '../lib/api'
import { stampsToSet, countsToMap, loadPrioritySet, savePrioritySet } from '../lib/evalProgress'
import { getCurrentUser } from '../lib/currentUser'
import { IconStar, IconAlert } from '../components/icons'

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

// 手順書を「採点単位」に展開（工程ごとに、見るべきポイント有ればポイント単位／無ければ工程自体を1単位）
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

// 評価の押印セル（クリックでON/OFF。readOnly のときは押せない＝管理者評価用）。チェック済みは合格の印「合」。
function StampCell({ filled, onToggle, readOnly }: { filled: boolean; onToggle: () => void; readOnly?: boolean }) {
  return (
    <button
      type="button"
      disabled={readOnly}
      title={readOnly ? '管理者評価は評価者が入力します' : ''}
      onClick={(e) => {
        e.stopPropagation()
        if (!readOnly) onToggle()
      }}
      className={`mx-auto grid h-10 w-10 place-items-center rounded-full border-2 transition-transform ${
        readOnly ? 'cursor-not-allowed opacity-50' : 'hover:scale-105'
      } ${filled ? 'border-ok text-ok' : 'border-line2 text-muted/50'}`}
    >
      <span className="text-[13px] font-bold leading-none">{filled ? '合' : '印'}</span>
    </button>
  )
}

// カウント評価セル。現在回数/目標回数を ＋−で操作。目標到達で達成(緑)。readOnly=閲覧のみ。
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
      <div className={`flex items-center gap-1 rounded-full border-2 px-1.5 py-1 ${done ? 'border-ok text-ok' : 'border-line2 text-ink'}`}>
        <button
          type="button"
          disabled={readOnly || count <= 0}
          onClick={(e) => { e.stopPropagation(); onChange(count - 1) }}
          className={`${btn} hover:bg-line`}
        >
          −
        </button>
        <span className="min-w-[34px] text-center text-[13px] font-bold leading-none">{count}/{target}</span>
        <button
          type="button"
          disabled={readOnly || count >= target}
          onClick={(e) => { e.stopPropagation(); onChange(count + 1) }}
          className={`${btn} hover:bg-line`}
        >
          ＋
        </button>
      </div>
      {done && <span className="rounded-full bg-ok/10 px-1.5 text-[9px] font-bold text-ok">達成</span>}
    </div>
  )
}

// 手順書採点の結果表示セル（閲覧専用）。合格=合(緑)/不合格=否(赤)/未採点=印(灰)。
// 採点済み（onClick あり）のときはクリックで詳細（ポイント別合否＋コメント）を表示。
function ResultStampCell({ result, onClick }: { result: 'pass' | 'fail' | null; onClick?: () => void }) {
  const style =
    result === 'pass'
      ? 'border-ok text-ok'
      : result === 'fail'
        ? 'border-danger text-danger'
        : 'border-line2 text-muted/50'
  const label = result === 'pass' ? '合' : result === 'fail' ? '否' : '印'
  const clickable = !!onClick
  return (
    <button
      type="button"
      disabled={!clickable}
      title={clickable ? '採点の詳細を見る' : '未採点'}
      onClick={(e) => {
        e.stopPropagation()
        onClick?.()
      }}
      className={`mx-auto grid h-10 w-10 place-items-center rounded-full border-2 ${
        clickable ? 'hover:scale-105' : 'cursor-default opacity-90'
      } ${style}`}
    >
      <span className="text-[13px] font-bold leading-none">{label}</span>
    </button>
  )
}

export default function JikoHyokaPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const category = params.get('category') || ''

  const [courses, setCourses] = useState<TrainingCourse[]>([])
  const [courseId, setCourseId] = useState<number | null>(null)
  const [sections, setSections] = useState<TrainingSection[]>([])
  const [items, setItems] = useState<TrainingItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeId, setActiveId] = useState<number | null>(null)
  const [stamps, setStamps] = useState<Set<string>>(new Set())
  const [counts, setCounts] = useState<Map<string, number>>(new Map())
  const [priority, setPriority] = useState<Set<number>>(() => loadPrioritySet())
  // 研修項目ID → 手順書（管理者評価の採点結果を閲覧表示する対象）
  const [procByItem, setProcByItem] = useState<Map<number, Procedure>>(new Map())
  // `${itemId}-${idx}` → 管理者の採点結果（閲覧用）
  const [evalByCell, setEvalByCell] = useState<Map<string, ProcedureResult>>(new Map())

  // 採点詳細の閲覧モーダル（受講者は閲覧のみ）
  const [viewModal, setViewModal] = useState<
    {
      title: string
      colName: string
      units: GradeUnit[]
      passByKey: Record<string, boolean>
      result: ProcedureResult | null
      comment: string
      gradedByName: string | null
      gradedAt: string | null
    } | null
  >(null)
  const [viewLoading, setViewLoading] = useState(false)

  // 筆記試験申請（ログイン社員の申請状況）
  const currentUser = getCurrentUser()
  const [apps, setApps] = useState<ExamApplication[]>([])
  const [applying, setApplying] = useState(false)
  // ログイン社員が保有している資格IDの集合（必要資格の保有チェック用）
  const [heldQualIds, setHeldQualIds] = useState<Set<number>>(new Set())

  async function loadApps() {
    if (!currentUser) return
    try {
      setApps(await examApplicationsApi.list({ applicantId: currentUser.id }))
    } catch {
      /* 申請状況の取得失敗は致命的ではないので無視 */
    }
  }

  useEffect(() => {
    ;(async () => {
      setLoading(true)
      try {
        const [cs, secs, its, mats] = await Promise.all([
          trainingCoursesApi.list(),
          trainingSectionsApi.list(),
          trainingItemsApi.list(),
          trainingMaterialsApi.list(),
        ])
        setCourses(cs)
        setSections(secs)
        setItems(its)
        // 手順書（steps が1件以上）を持つ研修項目の procedure を記録
        const pm = new Map<number, Procedure>()
        for (const m of mats) {
          if (m.itemId != null && m.procedure?.steps?.length && !pm.has(m.itemId)) {
            pm.set(m.itemId, m.procedure)
          }
        }
        setProcByItem(pm)
        // 初期コース: URLのcategory（コース名）優先、なければ先頭
        const initial = category ? cs.find((c) => c.name === category) : null
        setCourseId(initial?.id ?? cs[0]?.id ?? null)
        await loadApps()
        if (currentUser) {
          try {
            const [me, ss, evals] = await Promise.all([
              heldQualificationsApi.get(currentUser.id),
              evalStampsApi.list(currentUser.id),
              procedureEvalsApi.list(currentUser.id),
            ])
            setHeldQualIds(new Set(me.held.map((h) => h.qualificationId)))
            setStamps(stampsToSet(ss))
            setCounts(countsToMap(ss))
            setEvalByCell(new Map(evals.map((e) => [`${e.itemId}-${e.idx}`, e.result])))
          } catch {
            /* 保有資格・評価実績の取得失敗は致命的ではない */
          }
        }
      } catch (e: any) {
        setError(e.message)
      } finally {
        setLoading(false)
      }
    })()
  }, [category])

  // 選択コースのセクション
  const courseSections = useMemo(
    () => sections.filter((s) => s.course?.id === courseId),
    [sections, courseId],
  )

  // コース変更時に先頭セクションを選択
  useEffect(() => {
    setActiveId(courseSections[0]?.id ?? null)
  }, [courseId, courseSections.length])

  const activeSection = courseSections.find((s) => s.id === activeId) || null
  const rows = activeSection ? items.filter((it) => it.sectionId === activeSection.id) : []

  // 表の列構成（セクションマスタの設定から組み立て）
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
            kind: 'self',
            i,
            name: (activeSection as any)[`selfEval${i}Name`] || '自己評価',
            type: (activeSection as any)[`selfEval${i}Type`] as string | null,
            target: (activeSection as any)[`selfEval${i}Count`] as number,
          })),
        ...[1, 2, 3]
          .filter((i) => (activeSection as any)[`adminEval${i}Flag`])
          .map((i) => ({
            kind: 'admin',
            i,
            name: (activeSection as any)[`adminEval${i}Name`] || '評価',
            type: (activeSection as any)[`adminEval${i}Type`] as string | null,
            target: (activeSection as any)[`adminEval${i}Count`] as number,
          })),
      ]
    : []

  // 押印ON/OFF（ログイン社員の評価実績としてDBに保存）
  function toggleStamp(itemId: number, kind: 'self' | 'admin', idx: number) {
    if (!currentUser) return
    const key = `${itemId}-${kind}-${idx}`
    const value = !stamps.has(key)
    setStamps((prev) => {
      const n = new Set(prev)
      value ? n.add(key) : n.delete(key)
      return n
    })
    evalStampsApi.set(currentUser.id, itemId, kind, idx, value).catch(() => {
      // 失敗時はロールバック
      setStamps((prev) => {
        const n = new Set(prev)
        value ? n.delete(key) : n.add(key)
        return n
      })
    })
  }

  // 管理者の採点詳細（ポイント別合否＋コメント）を閲覧表示
  async function openViewModal(itemId: number, idx: number, colName: string) {
    if (!currentUser) return
    const proc = procByItem.get(itemId)
    if (!proc) return
    const title = items.find((it) => it.id === itemId)?.title ?? '研修項目'
    const units = procedureUnits(proc)
    setViewModal({ title, colName, units, passByKey: {}, result: null, comment: '', gradedByName: null, gradedAt: null })
    setViewLoading(true)
    try {
      const detail = await procedureGradesApi.get(currentUser.id, itemId, idx)
      const passByKey: Record<string, boolean> = {}
      for (const u of units) {
        passByKey[`${u.stepIndex}-${u.pointIndex}`] =
          detail.grades.find((g) => g.stepIndex === u.stepIndex && g.pointIndex === u.pointIndex)?.pass ?? false
      }
      setViewModal({
        title,
        colName,
        units,
        passByKey,
        result: detail.result,
        comment: detail.comment ?? '',
        gradedByName: detail.gradedByName,
        gradedAt: detail.gradedAt,
      })
    } catch {
      /* 取得失敗は無視（初期表示のまま） */
    } finally {
      setViewLoading(false)
    }
  }

  // カウント種別の回数変更（自己評価のみ本人が操作可）
  function changeCount(itemId: number, kind: 'self' | 'admin', idx: number, target: number, next: number) {
    if (!currentUser) return
    const key = `${itemId}-${kind}-${idx}`
    const clamped = Math.max(0, Math.min(target, next))
    const prev = counts.get(key) ?? 0
    setCounts((m) => new Map(m).set(key, clamped))
    evalStampsApi.setCount(currentUser.id, itemId, kind, idx, clamped).catch(() => {
      setCounts((m) => new Map(m).set(key, prev))
    })
  }

  // 優先（星）のON/OFF。設定できるのは最大5つまで。
  const PRIORITY_MAX = 5
  function togglePriority(itemId: number) {
    if (!priority.has(itemId) && priority.size >= PRIORITY_MAX) {
      setError(`優先フラグは最大${PRIORITY_MAX}つまでです。`)
      return
    }
    setError('')
    setPriority((prev) => {
      const n = new Set(prev)
      n.has(itemId) ? n.delete(itemId) : n.add(itemId)
      savePrioritySet(n)
      return n
    })
  }

  // 選択中セクションに対する、ログイン社員の筆記試験申請
  const appForActive = activeId != null ? apps.find((a) => a.sectionId === activeId) ?? null : null

  async function onApplyExam() {
    if (!currentUser || activeId == null || applying) return
    setApplying(true)
    setError('')
    try {
      await examApplicationsApi.create(activeId, currentUser.id)
      await loadApps()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setApplying(false)
    }
  }

  function onStartExam() {
    if (activeId != null) navigate(`/exam/${activeId}`)
  }

  if (loading) {
    return <p className="py-8 text-center text-sm text-muted">読み込み中…</p>
  }

  return (
    <div>
      {/* タイトル（左）＋ 研修コース選択・筆記試験ボタン（右） */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-lg font-bold text-ink2">自己評価</h1>
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-xs font-bold text-muted">
            研修コース
            <select
              value={courseId ?? ''}
              onChange={(e) => setCourseId(e.target.value === '' ? null : Number(e.target.value))}
              className="rounded-md border border-line px-2 py-1 text-sm text-ink outline-none focus:border-accent"
            >
              {courses.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </label>
          {appForActive?.status === '承認済' ? (
            <button
              onClick={onStartExam}
              className="rounded-md bg-ok px-4 py-1.5 text-xs font-bold text-white hover:brightness-95"
            >
              筆記試験開始
            </button>
          ) : appForActive?.status === '申請中' ? (
            <button
              disabled
              title="管理者の承認待ちです"
              className="cursor-default rounded-md bg-gold px-4 py-1.5 text-xs font-bold text-white opacity-90"
            >
              申請中
            </button>
          ) : (
            <button
              onClick={onApplyExam}
              disabled={!currentUser || activeId == null || applying}
              title={!currentUser ? 'ログインユーザーが未設定です' : ''}
              className="rounded-md bg-brand px-4 py-1.5 text-xs font-bold text-white hover:bg-brand-deep disabled:opacity-60"
            >
              {applying ? '申請中…' : '筆記試験申請'}
            </button>
          )}
        </div>
      </div>

      {error && (
        <p className="mb-3 rounded-md bg-danger/10 px-3 py-2 text-xs font-bold text-danger">{error}</p>
      )}

      {courseSections.length === 0 ? (
        <div className="card-grad bg-surface/70 p-8 text-center text-sm text-muted">
          この研修コースの研修セクションが登録されていません。
        </div>
      ) : (
        <div className="flex items-start">
          {/* 左: セクションタブ（研修セクションマスタ） */}
          <div className="-mr-2 flex shrink-0 flex-col gap-2 pt-2">
            {courseSections.map((s) => {
              const active = s.id === activeId
              return (
                <button
                  key={s.id}
                  onClick={() => setActiveId(s.id)}
                  className={`flex w-28 items-center px-2 py-1.5 text-[11px] font-bold text-white transition-[filter] ${
                    active ? 'tab-grad-active' : 'tab-grad-idle hover:brightness-95'
                  }`}
                >
                  <span className="truncate">{s.name}</span>
                </button>
              )
            })}
          </div>

          {/* 右: 評価テーブル（研修項目マスタ） */}
          <div className="card-grad relative z-10 min-w-0 flex-1 bg-surface/70 p-4 shadow-sm">
            {/* 研修項目を横長カードで縦並び表示 */}
            <div className="scroll-area max-h-[66vh] overflow-y-auto pr-1">
              {rows.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted">このセクションの研修項目が登録されていません。</p>
              ) : (
                <div className="space-y-3">
                  {rows.map((row) => (
                    <div
                      key={row.id}
                      onClick={() => navigate(`/kenshu-detail/${row.id}`)}
                      className="flex cursor-pointer flex-wrap items-center gap-x-4 gap-y-3 rounded-lg border border-line bg-white/70 p-3 transition-shadow hover:border-brand/40 hover:shadow-md"
                    >
                      {/* 優先（星）。行クリックの遷移は止める */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          togglePriority(row.id)
                        }}
                        title={priority.has(row.id) ? '優先を解除' : '優先に設定'}
                        className="shrink-0 transition-transform hover:scale-110"
                      >
                        <IconStar className="h-6 w-6 text-muted/40" filled={priority.has(row.id)} />
                      </button>

                      {/* 工程・内容 ＋ 必要資格 */}
                      <div className="min-w-[160px] flex-1 space-y-0.5">
                        {headerCols.map((c) => (
                          <p key={`cv${c.i}`} className="text-[12px] leading-snug">
                            <span className="text-muted">{c.name}：</span>
                            <span className="font-bold text-ink2">{(row as any)[`value${c.i}`] || '—'}</span>
                          </p>
                        ))}
                        {/* 必要資格（研修項目マスタ）。本人が未保有なら警告表示 */}
                        {row.requiredQualifications.length > 0 && (
                          <div className="mt-1 flex flex-wrap items-center gap-1.5">
                            <span className="text-[11px] text-muted">必要資格：</span>
                            {row.requiredQualifications.map((q) => {
                              const held = heldQualIds.has(q.id)
                              return (
                                <span
                                  key={q.id}
                                  title={held ? '保有済み' : '未保有です'}
                                  className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-bold ${
                                    held ? 'bg-brand/10 text-brand' : 'bg-danger/10 text-danger'
                                  }`}
                                >
                                  {!held && <IconAlert className="h-3 w-3" />}
                                  {q.name}
                                </span>
                              )
                            })}
                          </div>
                        )}
                        {row.requiredQualifications.some((q) => !heldQualIds.has(q.id)) && (
                          <p className="mt-1 flex items-center gap-1 text-[11px] font-bold text-danger">
                            <IconAlert className="h-3.5 w-3.5" />
                            必要資格が未取得です
                          </p>
                        )}
                      </div>

                      {/* 評価（ラベル＋スタンプ。横並び） */}
                      <div className="flex shrink-0 items-end gap-5">
                        {evalCols.map((c) => {
                          const key = `${row.id}-${c.kind}-${c.i}`
                          const isCount = c.type === 'カウント'
                          const target = Math.max(1, c.target || 0)
                          // 管理者評価で手順書があれば、管理者の採点結果（合/否）を閲覧表示（カウント以外）
                          const showResult = c.kind === 'admin' && !isCount && procByItem.has(row.id)
                          const cellResult = evalByCell.get(`${row.id}-${c.i}`) ?? null
                          return (
                            <div key={key} className="flex flex-col items-center gap-1">
                              <span className="text-[11px] font-bold text-muted">{c.name}</span>
                              {isCount ? (
                                <CountCell
                                  count={counts.get(key) ?? 0}
                                  target={target}
                                  onChange={(n) => changeCount(row.id, c.kind as 'self' | 'admin', c.i, target, n)}
                                  readOnly={c.kind === 'admin'}
                                />
                              ) : showResult ? (
                                <ResultStampCell
                                  result={cellResult}
                                  onClick={cellResult ? () => openViewModal(row.id, c.i, c.name) : undefined}
                                />
                              ) : (
                                <StampCell
                                  filled={stamps.has(key)}
                                  onToggle={() => toggleStamp(row.id, c.kind as 'self' | 'admin', c.i)}
                                  readOnly={c.kind === 'admin'}
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

      {/* 採点詳細の閲覧モーダル（受講者は閲覧のみ） */}
      {viewModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setViewModal(null)}
        >
          <div
            className="flex max-h-[88vh] w-full max-w-lg flex-col overflow-hidden rounded-xl bg-surface shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* ヘッダー */}
            <div className="flex items-center justify-between border-b border-line px-5 py-3">
              <div>
                <p className="text-[11px] font-bold text-muted">採点結果（{viewModal.colName}）</p>
                <h2 className="text-base font-bold text-ink2">{viewModal.title}</h2>
              </div>
              <button
                type="button"
                onClick={() => setViewModal(null)}
                className="grid h-7 w-7 place-items-center rounded-full text-muted hover:bg-line"
              >
                ✕
              </button>
            </div>

            {/* 総合結果 */}
            <div className="border-b border-line px-5 py-2 text-center text-[12px] font-bold">
              {viewModal.result === 'pass' ? (
                <span className="text-ok">総合結果：合格</span>
              ) : viewModal.result === 'fail' ? (
                <span className="text-danger">総合結果：不合格</span>
              ) : (
                <span className="text-muted">未採点</span>
              )}
            </div>

            {/* 見るべきポイントごとの合否 */}
            <div className="scroll-area flex-1 overflow-y-auto px-5 py-4">
              {viewLoading ? (
                <p className="py-6 text-center text-sm text-muted">読み込み中…</p>
              ) : (
                <div className="space-y-3">
                  {viewModal.units.map((u, i) => {
                    const pass = viewModal.passByKey[`${u.stepIndex}-${u.pointIndex}`]
                    const isNewStep = i === 0 || viewModal.units[i - 1].stepIndex !== u.stepIndex
                    return (
                      <div key={`${u.stepIndex}-${u.pointIndex}`}>
                        {isNewStep && (
                          <p className="mb-1 mt-2 text-[12px] font-bold text-ink2">
                            工程 {u.stepIndex + 1}：{u.stepName || '—'}
                          </p>
                        )}
                        <div className="flex items-center justify-between gap-3 rounded-lg border border-line bg-white/70 px-3 py-2">
                          <span className="min-w-0 text-[12px] text-ink">
                            {u.pointText || '（工程全体）'}
                          </span>
                          <span
                            className={`shrink-0 rounded-md px-2.5 py-1 text-[11px] font-bold text-white ${
                              pass ? 'bg-ok' : 'bg-danger'
                            }`}
                          >
                            {pass ? '合格' : '不合格'}
                          </span>
                        </div>
                      </div>
                    )
                  })}

                  {/* コメント */}
                  <div className="pt-2">
                    <p className="mb-1 text-[12px] font-bold text-muted">コメント</p>
                    <div className="min-h-[3rem] whitespace-pre-wrap rounded-md border border-line bg-canvas/50 px-3 py-2 text-sm text-ink">
                      {viewModal.comment || <span className="text-muted">（コメントなし）</span>}
                    </div>
                  </div>

                  {/* 採点者・採点日時 */}
                  {(viewModal.gradedByName || viewModal.gradedAt) && (
                    <div className="border-t border-line pt-2 text-[11px] text-muted">
                      {viewModal.gradedByName && <p>採点者：{viewModal.gradedByName}</p>}
                      {viewModal.gradedAt && <p>採点日時：{formatDateTime(viewModal.gradedAt)}</p>}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* フッター */}
            <div className="border-t border-line px-5 py-3 text-right">
              <button
                type="button"
                onClick={() => setViewModal(null)}
                className="rounded-md bg-brand px-4 py-1.5 text-xs font-bold text-white hover:bg-brand-deep"
              >
                閉じる
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
