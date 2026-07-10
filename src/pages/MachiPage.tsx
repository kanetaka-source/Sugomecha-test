import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  trainingCoursesApi,
  trainingSectionsApi,
  trainingItemsApi,
  employeesApi,
  waitingOrdersApi,
  type TrainingCourse,
  type TrainingSection,
  type TrainingItem,
  type Employee,
} from '../lib/api'
import { getCurrentUser } from '../lib/currentUser'
import { loadPrioritySet } from '../lib/evalProgress'
import { orderWaiting, reorder, sameOrder } from '../lib/waiting'

// 作業待ちは常に5枠表示
const WAITING_SLOTS = 5
// 作業待ちカードの番号ヘッダー色（順番に応じて色分け）
const CARD_COLORS = ['bg-brand', 'bg-accent', 'bg-magenta', 'bg-danger', 'bg-gold']

export default function MachiPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const currentUser = getCurrentUser()
  const category = params.get('category') || '' // 研修コース名（研修メニューから遷移時に指定）
  const [courses, setCourses] = useState<TrainingCourse[]>([])
  const [sections, setSections] = useState<TrainingSection[]>([])
  const [items, setItems] = useState<TrainingItem[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [waitingOrders, setWaitingOrders] = useState<Map<number, number[]>>(new Map()) // itemId→社員ID並び順
  const [drag, setDrag] = useState<{ itemId: number; idx: number } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [courseId, setCourseId] = useState<number | null>(null)
  const [activeSectionId, setActiveSectionId] = useState<number | null>(null)

  useEffect(() => {
    ;(async () => {
      setLoading(true)
      try {
        const [cs, secs, its, emps, orders] = await Promise.all([
          trainingCoursesApi.list(),
          trainingSectionsApi.list(),
          trainingItemsApi.list(),
          employeesApi.list(),
          waitingOrdersApi.list(),
        ])
        setCourses(cs)
        setSections(secs)
        setItems(its)
        setEmployees(emps)
        // itemId → 並び順(employeeId配列) を構築（GETは position 昇順）
        const om = new Map<number, number[]>()
        for (const o of orders) {
          const arr = om.get(o.itemId) ?? []
          arr.push(o.employeeId)
          om.set(o.itemId, arr)
        }
        setWaitingOrders(om)
        // 初期コース: URLのcategory（コース名）優先、なければ先頭
        const initial = category ? cs.find((c) => c.name === category) : null
        setCourseId(initial?.id ?? cs[0]?.id ?? null)
      } catch (e: any) {
        setError(e.message)
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  // 選択コースのセクション
  const courseSections = useMemo(
    () => sections.filter((s) => s.course?.id === courseId),
    [sections, courseId],
  )

  // コース変更時に先頭セクションを選択
  useEffect(() => {
    setActiveSectionId(courseSections[0]?.id ?? null)
  }, [courseId, courseSections.length])

  const activeSection = courseSections.find((s) => s.id === activeSectionId) || null
  const rows = activeSection ? items.filter((it) => it.sectionId === activeSection.id) : []

  // 工程・内容の列（セクションの研修ヘッダー設定から）
  const headerCols = activeSection
    ? [1, 2, 3, 4, 5]
        .filter((i) => (activeSection as any)[`header${i}Flag`])
        .map((i) => ({ i, name: (activeSection as any)[`header${i}Name`] || `項目${i}` }))
    : []

  // 優先フラグ（自己評価で★を付けた研修項目ID）
  const priority = useMemo(() => loadPrioritySet(), [])

  // 受講者のうち、この研修コースを履修している人
  const enrolled = useMemo(
    () =>
      courseId == null
        ? []
        : employees.filter(
            (e) => e.role === '受講者' && e.enrolledCourses.some((c) => c.id === courseId),
          ),
    [employees, courseId],
  )

  // 研修項目ごとの作業待ち（履修者のみ。ただし★優先の項目は履修に関係なく全受講者）
  function waitingFor(item: TrainingItem): Employee[] {
    if (priority.has(item.id)) {
      return employees.filter((e) => e.role === '受講者')
    }
    return enrolled
  }

  // ログイン者のロール → 評価者/管理者なら並び替え可
  const myRole = employees.find((e) => e.id === currentUser?.id)?.role
  const canReorder = myRole === '評価者' || myRole === '管理者'
  const courseName = courses.find((c) => c.id === courseId)?.name ?? ''

  // 並び替え保存（表示中の5枠＋残りメンバーの順で全件保存）。
  // 既定順に戻ったら並び順データをクリア（手動表記も消える）。
  function persistOrder(itemId: number, newTop: Employee[], ordered: Employee[], members: Employee[]) {
    const full = [...newTop, ...ordered.slice(WAITING_SLOTS)]
    const ids = sameOrder(full, members) ? [] : full.map((e) => e.id)
    setWaitingOrders((m) => new Map(m).set(itemId, ids))
    waitingOrdersApi.save(itemId, ids).catch((e: any) => setError(e?.message || '並び替えの保存に失敗しました'))
  }

  if (loading) {
    return <p className="py-8 text-center text-sm text-muted">読み込み中…</p>
  }

  const selectCls =
    'rounded-md border border-line px-2 py-1 text-sm text-ink outline-none focus:border-accent'

  // このセクションの作業待ち合計人数（各項目の作業待ち人数の合計）
  const sectionWaitingTotal = rows.reduce((s, r) => s + waitingFor(r).length, 0)

  return (
    <div>
      {/* タイトル + コース選択 */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-bold text-ink2">作業待ち</h1>
          {activeSection && (
            <span className="rounded-full bg-brand/10 px-3 py-1 text-xs font-bold text-brand">
              {activeSection.name} 合計 {sectionWaitingTotal}人
            </span>
          )}
        </div>
        <label className="flex items-center gap-2 text-xs font-bold text-muted">
          研修コース
          <select
            value={courseId ?? ''}
            onChange={(e) => setCourseId(e.target.value === '' ? null : Number(e.target.value))}
            className={selectCls}
          >
            {courses.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </label>
      </div>

      {error && (
        <p className="mb-3 rounded-md bg-danger/10 px-3 py-2 text-xs font-bold text-danger">{error}</p>
      )}

      {courses.length === 0 ? (
        <div className="card-grad bg-surface/70 p-8 text-center text-sm text-muted">
          研修コースが登録されていません。
        </div>
      ) : courseSections.length === 0 ? (
        <div className="card-grad bg-surface/70 p-8 text-center text-sm text-muted">
          この研修コースの研修セクションが登録されていません。
        </div>
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

          {/* 右: 作業待ち（横長カードの縦並び） */}
          <div className="card-grad relative z-10 min-w-0 flex-1 bg-surface/70 p-4 shadow-sm">
            <div className="scroll-area max-h-[66vh] overflow-y-auto pr-1">
              {rows.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted">このセクションの研修項目が登録されていません。</p>
              ) : (
                <div className="space-y-3">
                  {rows.map((row, idx) => {
                    const members = waitingFor(row)
                    const { list: ordered, manual } = orderWaiting(members, waitingOrders.get(row.id))
                    const shown = ordered.slice(0, WAITING_SLOTS)
                    const defaultRank = new Map(members.map((e, i) => [e.id, i]))
                    return (
                      <div
                        key={row.id}
                        className="flex flex-wrap items-center gap-x-4 gap-y-3 rounded-lg border border-line bg-white/70 p-3"
                      >
                        {/* No */}
                        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-gauge text-[11px] font-bold text-white">
                          {idx + 1}
                        </span>
                        {/* 工程・内容（クリックで詳細へ） */}
                        <div
                          onClick={() => navigate(`/machi/${row.id}`)}
                          title="クリックで作業待ち詳細（最大10人）"
                          className="min-w-[150px] flex-1 cursor-pointer space-y-0.5 rounded-md p-1 hover:bg-brand/5"
                        >
                          {headerCols.map((c) => (
                            <p key={`v${c.i}`} className="text-[12px] leading-snug">
                              <span className="text-muted">{c.name}：</span>
                              <span className="font-bold text-ink2">{(row as any)[`value${c.i}`] || '—'}</span>
                            </p>
                          ))}
                        </div>
                        {/* 作業待ち（常に5枠。優先項目は履修に関係なく全受講者） */}
                        <div className="flex shrink-0 flex-col gap-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className="flex items-center gap-1 text-[11px] font-bold text-muted">
                              作業待ち
                              {manual && (
                                <span className="rounded-full bg-gold/20 px-1.5 text-[9px] font-bold text-gold">手動</span>
                              )}
                            </span>
                            <span className="text-[11px] font-bold text-brand">{ordered.length}人 ›</span>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {Array.from({ length: WAITING_SLOTS }).map((_, i) => {
                              const e = shown[i]
                              if (!e) {
                                return (
                                  <div key={`slot-${i}`} className="w-16 shrink-0 overflow-hidden rounded-md border border-line bg-white text-center shadow-sm">
                                    <div className="bg-disabled py-0.5 text-[10px] font-bold text-white">{i + 1}</div>
                                    <div className="px-1 py-2 text-[11px] font-bold leading-tight text-muted/40">—</div>
                                  </div>
                                )
                              }
                              const di = defaultRank.get(e.id)
                              const moved = di != null && di !== i // 本来の位置と違う＝移動済み
                              return (
                                <div
                                  key={`emp-${e.id}`}
                                  draggable={canReorder}
                                  onDragStart={(ev) => { ev.stopPropagation(); setDrag({ itemId: row.id, idx: i }) }}
                                  onDragOver={(ev) => { if (canReorder && drag?.itemId === row.id) ev.preventDefault() }}
                                  onDrop={(ev) => {
                                    ev.stopPropagation()
                                    if (drag && drag.itemId === row.id && drag.idx !== i) {
                                      persistOrder(row.id, reorder(shown, drag.idx, i), ordered, members)
                                    }
                                    setDrag(null)
                                  }}
                                  onClick={(ev) => {
                                    ev.stopPropagation()
                                    navigate(`/shinchoku?employeeId=${e.id}${courseName ? `&category=${encodeURIComponent(courseName)}` : ''}`)
                                  }}
                                  title={canReorder ? 'ドラッグで並び替え／クリックで進捗状況へ' : 'クリックで進捗状況へ'}
                                  className={`relative w-16 shrink-0 cursor-pointer overflow-hidden rounded-md border-2 bg-white text-center shadow-sm transition-shadow hover:shadow-md ${
                                    drag?.itemId === row.id && drag?.idx === i ? 'border-brand opacity-60' : moved ? 'border-gold' : 'border-line'
                                  }`}
                                >
                                  {moved && (
                                    <span className="absolute right-0 top-0 rounded-bl bg-gold px-1 text-[8px] font-bold leading-tight text-white">
                                      元{(di as number) + 1}
                                    </span>
                                  )}
                                  <div className={`${CARD_COLORS[i % CARD_COLORS.length]} py-0.5 text-[10px] font-bold text-white`}>{i + 1}</div>
                                  <div className="px-1 py-2 text-[11px] font-bold leading-tight text-ink2">{e.name}</div>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
