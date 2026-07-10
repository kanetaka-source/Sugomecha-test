import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  trainingCoursesApi,
  trainingSectionsApi,
  trainingItemsApi,
  employeesApi,
  evalStampsApi,
  scoreUpdatesApi,
  type TrainingCourse,
  type TrainingSection,
  type TrainingItem,
  type Employee,
} from '../lib/api'
import { isItemAllPassed } from '../lib/evalProgress'
import { getCurrentUser } from '../lib/currentUser'

// ランキングの集計対象外ロール（管理者のみ除外＝受講者・評価者が対象）
const EXCLUDED_ROLE = '管理者'
const TOTAL = 'total' // 合計タブのキー
const PREV_KEY = 'izumi.rankPrev' // 前回順位のスナップショット（指標ごと）

// 前回順位スナップショットの読み書き（{ [指標]: { [社員ID]: 順位 } }）
type Snapshot = Record<string, Record<number, number>>
function readSnapshot(): Snapshot {
  try {
    return JSON.parse(localStorage.getItem(PREV_KEY) || '{}') as Snapshot
  } catch {
    return {}
  }
}

// 日付を YYYY/MM/DD で表示
function fmtDate(iso: string | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (isNaN(d.getTime())) return '—'
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}/${p(d.getMonth() + 1)}/${p(d.getDate())}`
}

// メダルアイコン（1〜3位＝金銀銅のメダル、4位以降＝番号ディスク）
function Medal({ rank }: { rank: number }) {
  const c = { 1: { disc: '#f2b705', ring: '#f7d774' }, 2: { disc: '#a7adb8', ring: '#cdd2da' }, 3: { disc: '#c07a3e', ring: '#dda06a' } }[
    rank
  ]
  if (!c) {
    return <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-line text-sm font-bold text-ink2">{rank}</span>
  }
  return (
    <svg width="36" height="40" viewBox="0 0 36 40" className="shrink-0" aria-hidden>
      {/* リボン */}
      <path d="M11 1 L19 15 L12 15 Z" fill="#8f9cff" />
      <path d="M25 1 L24 15 L17 15 Z" fill="#5b6ae0" />
      {/* メダル本体 */}
      <circle cx="18" cy="27" r="11.5" fill={c.disc} stroke={c.ring} strokeWidth="2.5" />
      <circle cx="18" cy="27" r="7.5" fill="none" stroke="#ffffff" strokeOpacity="0.55" strokeWidth="1" />
      <text x="18" y="31" textAnchor="middle" fontSize="11" fontWeight="bold" fill="#ffffff">
        {rank}
      </text>
    </svg>
  )
}

// 順位変動の表示（前回比。▲上昇 / ▼下降 / NEW / −）
function RankDelta({ delta }: { delta: number | 'new' | null }) {
  if (delta === 'new') return <span className="rounded bg-brand/10 px-1.5 py-0.5 text-[10px] font-bold text-brand">NEW</span>
  if (delta == null || delta === 0) return <span className="text-[11px] text-muted">—</span>
  if (delta > 0) return <span className="text-[11px] font-bold text-ok">▲{delta}</span>
  return <span className="text-[11px] font-bold text-danger">▼{-delta}</span>
}

export default function RankingPage() {
  const navigate = useNavigate()
  const currentUser = getCurrentUser()
  const [courses, setCourses] = useState<TrainingCourse[]>([])
  const [sections, setSections] = useState<TrainingSection[]>([])
  const [items, setItems] = useState<TrainingItem[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [stampsByEmp, setStampsByEmp] = useState<Map<number, { set: Set<string>; counts: Map<string, number> }>>(
    new Map(),
  )
  const [updatedByEmp, setUpdatedByEmp] = useState<Map<number, string>>(new Map())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [metric, setMetric] = useState<string>(TOTAL) // 'total' または コースID(文字列)
  const [filterLocation, setFilterLocation] = useState('')

  // 前回順位（セッション開始時に固定して比較に使う）
  const prevSnapshotRef = useRef<Snapshot>(readSnapshot())

  useEffect(() => {
    ;(async () => {
      setLoading(true)
      try {
        const [cs, secs, its, emps, allStamps, updates] = await Promise.all([
          trainingCoursesApi.list(),
          trainingSectionsApi.list(),
          trainingItemsApi.list(),
          employeesApi.list(),
          evalStampsApi.listAll(),
          scoreUpdatesApi.list(),
        ])
        setCourses(cs)
        setSections(secs)
        setItems(its)
        setEmployees(emps)
        const byEmp = new Map<number, { set: Set<string>; counts: Map<string, number> }>()
        for (const s of allStamps) {
          let e = byEmp.get(s.employeeId)
          if (!e) {
            e = { set: new Set(), counts: new Map() }
            byEmp.set(s.employeeId, e)
          }
          const key = `${s.itemId}-${s.kind}-${s.idx}`
          e.set.add(key)
          e.counts.set(key, s.count ?? 0)
        }
        setStampsByEmp(byEmp)
        setUpdatedByEmp(new Map(updates.map((u) => [u.employeeId, u.lastUpdatedAt])))
      } catch (e: any) {
        setError(e.message)
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  const sectionById = useMemo(() => new Map(sections.map((s) => [s.id, s])), [sections])

  // コースID → 配下の {item, section}[]
  const itemsByCourse = useMemo(() => {
    const m = new Map<number, { item: TrainingItem; section: TrainingSection }[]>()
    for (const it of items) {
      if (it.sectionId == null) continue
      const sec = sectionById.get(it.sectionId)
      if (!sec || sec.courseId == null) continue
      const arr = m.get(sec.courseId) ?? []
      arr.push({ item: it, section: sec })
      m.set(sec.courseId, arr)
    }
    return m
  }, [items, sectionById])

  // 社員 × コースの得点（全合格の項目数）
  function courseScore(empId: number, courseId: number): number {
    const emp = stampsByEmp.get(empId)
    if (!emp) return 0
    const list = itemsByCourse.get(courseId) ?? []
    return list.reduce(
      (n, { item, section }) => n + (isItemAllPassed(item.id, section, emp.set, emp.counts) ? 1 : 0),
      0,
    )
  }
  const totalScore = (empId: number) => courses.reduce((s, c) => s + courseScore(empId, c.id), 0)
  function scoreOf(empId: number): number {
    if (metric === TOTAL) return totalScore(empId)
    return courseScore(empId, Number(metric))
  }

  const locationOf = (e: Employee) => e.department?.location?.name ?? '未所属'
  const targets = useMemo(() => employees.filter((e) => e.role !== EXCLUDED_ROLE), [employees])
  const locationOptions = useMemo(
    () => Array.from(new Set(targets.map(locationOf))).sort((a, b) => a.localeCompare(b, 'ja')),
    [targets],
  )

  // ランキング（得点の降順。同点は同順位）
  const ranked = useMemo(() => {
    const filtered = filterLocation ? targets.filter((e) => locationOf(e) === filterLocation) : targets
    const rows = filtered
      .map((e) => ({ e, score: scoreOf(e.id) }))
      .sort((a, b) => b.score - a.score || a.e.employeeNo.localeCompare(b.e.employeeNo))
    let rank = 0
    let prevScore: number | null = null
    return rows.map((row, i) => {
      if (prevScore === null || row.score !== prevScore) {
        rank = i + 1
        prevScore = row.score
      }
      return { ...row, rank }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targets, filterLocation, metric, stampsByEmp, itemsByCourse, courses])

  // 表示後、現在の順位を次回比較用スナップショットとして保存（拠点フィルタ無しの全体順位のみ記録）
  useEffect(() => {
    if (loading || filterLocation) return
    const snap = readSnapshot()
    snap[metric] = Object.fromEntries(ranked.map((r) => [r.e.id, r.rank]))
    localStorage.setItem(PREV_KEY, JSON.stringify(snap))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ranked, metric, loading, filterLocation])

  // 前回比の算出（拠点フィルタ中は全体順位と混ざるため非表示）
  function deltaFor(empId: number, rank: number): number | 'new' | null {
    if (filterLocation) return null
    const prev = prevSnapshotRef.current[metric]
    if (!prev) return null // この指標を初めて見た → 変動なし扱い
    const prevRank = prev[empId]
    if (prevRank == null) return 'new'
    return prevRank - rank
  }

  if (loading) return <p className="py-8 text-center text-sm text-muted">読み込み中…</p>

  const metricLabel = metric === TOTAL ? '合計' : courses.find((c) => String(c.id) === metric)?.name ?? ''

  return (
    <div>
      <h1 className="mb-1 text-lg font-bold text-ink2">ランキング</h1>
      <p className="mb-4 text-xs text-muted">
        研修項目の自己評価・管理者評価がすべて合格した項目を1点として、得点順に並べます（対象：管理者を除く全社員）。
        名前をクリックするとその社員の成績を表示します。
      </p>

      {error && <p className="mb-3 rounded-md bg-danger/10 px-3 py-2 text-xs font-bold text-danger">{error}</p>}

      {/* 指標タブ（合計 / 研修コース別） */}
      <div className="mb-3 flex flex-wrap gap-2">
        {[{ key: TOTAL, label: '合計' }, ...courses.map((c) => ({ key: String(c.id), label: c.name }))].map((t) => (
          <button
            key={t.key}
            onClick={() => setMetric(t.key)}
            className={`rounded-full px-4 py-1.5 text-xs font-bold transition-colors ${
              metric === t.key ? 'bg-brand text-white' : 'bg-surface text-muted hover:bg-brand/10'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* 拠点フィルタ */}
      <div className="mb-4 flex items-center gap-2">
        <span className="text-xs font-bold text-muted">拠点</span>
        <select
          value={filterLocation}
          onChange={(e) => setFilterLocation(e.target.value)}
          className="rounded-md border border-line2 bg-white px-3 py-1.5 text-xs text-ink"
        >
          <option value="">全拠点</option>
          {locationOptions.map((loc) => (
            <option key={loc} value={loc}>
              {loc}
            </option>
          ))}
        </select>
      </div>

      {ranked.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted">対象の社員がいません。</p>
      ) : (
        <div className="card-grad overflow-hidden bg-surface shadow-sm">
          <ul>
            {ranked.map(({ e, score, rank }, idx) => {
              const isMe = currentUser?.id === e.id
              const delta = deltaFor(e.id, rank)
              return (
                <li
                  key={e.id}
                  className={`${idx > 0 ? 'border-t border-line' : ''} ${isMe ? 'bg-brand/5' : ''}`}
                >
                  <button
                    onClick={() => navigate(`/seiseki?employeeId=${e.id}`)}
                    title={`${e.name} の成績を見る`}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-brand/5"
                  >
                    <Medal rank={rank} />
                    <span className="w-8 shrink-0 text-center">
                      <RankDelta delta={delta} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-sm font-bold text-ink2">{e.name}</span>
                        {isMe && (
                          <span className="shrink-0 rounded bg-brand px-1.5 py-0.5 text-[10px] font-bold text-white">
                            あなた
                          </span>
                        )}
                      </div>
                      <div className="truncate text-[11px] text-muted">
                        {locationOf(e)}
                        {e.department?.name ? ` ・ ${e.department.name}` : ''}
                      </div>
                      <div className="text-[10px] text-muted">最終更新: {fmtDate(updatedByEmp.get(e.id))}</div>
                    </div>
                    <span className="shrink-0 text-right">
                      <span className="text-lg font-bold text-brand">{score}</span>
                      <span className="ml-0.5 text-[11px] text-muted">点</span>
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      )}

      <p className="mt-3 text-[11px] text-muted">指標：{metricLabel}　／　▲▼は前回表示時からの順位変動</p>
    </div>
  )
}
