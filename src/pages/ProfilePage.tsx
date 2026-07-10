import { useEffect, useMemo, useState } from 'react'
import {
  employeesApi,
  trainingCoursesApi,
  trainingSectionsApi,
  trainingItemsApi,
  evalStampsApi,
  type Employee,
  type TrainingCourse,
  type TrainingSection,
  type TrainingItem,
} from '../lib/api'
import { getCurrentUser } from '../lib/currentUser'
import { stampsToSet, countsToMap, isItemEvaluated } from '../lib/evalProgress'
import { COURSE_ICONS, IconStar } from '../components/icons'

// マスターバッジ（車種カテゴリ。研修コースのアイコン種別と対応）
const MASTER_BADGES = [
  { key: 'large', label: '大型' },
  { key: 'small', label: '小型' },
  { key: 'electrical', label: '電装' },
  { key: 'body', label: '車体' },
  { key: 'paint', label: '塗装' },
]
// スペシャルバッジ（昇格・特別実績。判定基準は今後定義）
const SPECIAL_BADGES = ['評価者', '２階級制覇', '３階級制覇', '４階級制覇', '全階級制覇']

const catIcon = (key: string) => COURSE_ICONS.find((c) => c.key === key)?.Icon

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
      <span className="w-16 shrink-0 text-right text-[10px] text-muted">{done}/{total}pt</span>
    </div>
  )
}

export default function ProfilePage() {
  const currentUser = getCurrentUser()
  const [employee, setEmployee] = useState<Employee | null>(null)
  const [courses, setCourses] = useState<TrainingCourse[]>([])
  const [sections, setSections] = useState<TrainingSection[]>([])
  const [items, setItems] = useState<TrainingItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeCat, setActiveCat] = useState<string>('all') // all/large/small/...
  const [stamps, setStamps] = useState<Set<string>>(new Set())
  const [counts, setCounts] = useState<Map<string, number>>(new Map())

  useEffect(() => {
    ;(async () => {
      setLoading(true)
      try {
        const [emp, cs, secs, its, ss] = await Promise.all([
          currentUser ? employeesApi.get(currentUser.id) : Promise.resolve(null),
          trainingCoursesApi.list(),
          trainingSectionsApi.list(),
          trainingItemsApi.list(),
          currentUser ? evalStampsApi.list(currentUser.id) : Promise.resolve([]),
        ])
        setEmployee(emp)
        setCourses(cs)
        setSections(secs)
        setItems(its)
        setStamps(stampsToSet(ss))
        setCounts(countsToMap(ss))
      } catch (e: any) {
        setError(e.message)
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  const courseById = useMemo(() => new Map(courses.map((c) => [c.id, c])), [courses])

  // セクションの達成状況（評価済み項目数 / 全項目数）
  function sectionStats(sec: TrainingSection) {
    const its = items.filter((i) => i.sectionId === sec.id)
    const done = its.filter((i) => isItemEvaluated(i.id, sec, stamps, counts)).length
    return { done, total: its.length }
  }

  // セクションが属するコースのアイコン種別
  const sectionCat = (sec: TrainingSection) =>
    sec.courseId != null ? courseById.get(sec.courseId)?.icon ?? null : null

  // 累計ポイント（全セクション合計）
  const totalDone = sections.reduce((s, sec) => s + sectionStats(sec).done, 0)
  const totalAll = sections.reduce((s, sec) => s + sectionStats(sec).total, 0)

  // マスターバッジ獲得判定：その車種のコースに紐づく項目が全て評価済み
  function masterEarned(catKey: string): boolean {
    const catSecs = sections.filter((sec) => sectionCat(sec) === catKey)
    const stats = catSecs.map(sectionStats)
    const total = stats.reduce((s, x) => s + x.total, 0)
    const done = stats.reduce((s, x) => s + x.done, 0)
    return total > 0 && done === total
  }

  // 成績表に表示するセクション（カテゴリで絞り込み）
  const filteredSections =
    activeCat === 'all' ? sections : sections.filter((sec) => sectionCat(sec) === activeCat)
  const filteredDone = filteredSections.reduce((s, sec) => s + sectionStats(sec).done, 0)
  const filteredAll = filteredSections.reduce((s, sec) => s + sectionStats(sec).total, 0)

  if (loading) {
    return <p className="py-8 text-center text-sm text-muted">読み込み中…</p>
  }

  const labelCls = 'text-[11px] font-bold text-muted'
  const valueCls = 'text-sm font-bold text-ink2'

  // My データの行（ラベル/値）
  const dataRows: { label: string; value: string }[] = [
    { label: '社員番号', value: employee?.employeeNo ?? '—' },
    { label: '氏名', value: employee?.name ?? '—' },
    { label: '所属店舗', value: employee?.department?.location?.name ?? '—' },
    { label: 'ロール', value: employee?.role ?? '—' },
    { label: '部署名', value: employee?.department?.name ?? '—' },
    { label: '国籍', value: '—' },
  ]

  return (
    <div className="space-y-7">
      {error && (
        <p className="rounded-md bg-danger/10 px-3 py-2 text-xs font-bold text-danger">{error}</p>
      )}

      {/* ===== My データ ===== */}
      <section>
        <h2 className="mb-3 text-base font-bold text-ink2">My データ</h2>
        <div className="card-grad bg-surface/60 p-5">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
            {/* 写真 */}
            <div className="grid h-24 w-24 shrink-0 place-items-center rounded-full border border-line2 bg-white/70 text-[11px] text-muted">
              写真
            </div>
            {/* データ表 */}
            <div className="grid flex-1 grid-cols-1 gap-x-8 gap-y-3 sm:grid-cols-2">
              {dataRows.map((r) => (
                <div key={r.label} className="flex items-center justify-between border-b border-line pb-2">
                  <span className={labelCls}>{r.label}</span>
                  <span className={valueCls}>{r.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ===== ステータス ===== */}
      <section>
        <h2 className="mb-3 text-base font-bold text-ink2">ステータス</h2>
        <div className="card-grad space-y-5 bg-surface/60 p-5">
          {/* 累計ポイント */}
          <div>
            <div className="mb-1 flex items-center justify-between">
              <span className={labelCls}>total point</span>
            </div>
            <GradientBar done={totalDone} total={totalAll} />
          </div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            {/* マスターバッジ */}
            <div>
              <p className="mb-2 text-[11px] font-bold text-muted">マスターバッジ</p>
              <div className="flex flex-wrap gap-3">
                {MASTER_BADGES.map((b) => {
                  const Icon = catIcon(b.key)
                  const earned = masterEarned(b.key)
                  return (
                    <div key={b.key} className="flex w-14 flex-col items-center gap-1">
                      <div
                        className={`grid h-12 w-12 place-items-center rounded-full ${
                          earned ? 'bg-gold/20 text-gold' : 'bg-line/40 text-muted/40'
                        }`}
                      >
                        {Icon ? <Icon className="h-7 w-7" /> : null}
                      </div>
                      <span className="text-[11px] text-muted">{b.label}</span>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* スペシャルバッジ（判定は今後定義のため未獲得表示） */}
            <div>
              <p className="mb-2 text-[11px] font-bold text-muted">スペシャルバッジ</p>
              <div className="flex flex-wrap gap-3">
                {SPECIAL_BADGES.map((label) => (
                  <div key={label} className="flex w-14 flex-col items-center gap-1">
                    <div className="grid h-12 w-12 place-items-center rounded-full bg-line/40 text-muted/40">
                      <IconStar className="h-7 w-7" />
                    </div>
                    <span className="text-center text-[9px] leading-tight text-muted">{label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== 成績表 ===== */}
      <section>
        <h2 className="mb-3 text-base font-bold text-ink2">成績表</h2>
        <div className="flex items-start gap-3">
          {/* 左: カテゴリタブ */}
          <div className="flex shrink-0 flex-col gap-2">
            {[{ key: 'all', label: '集計' }, ...MASTER_BADGES].map((c) => {
              const active = activeCat === c.key
              return (
                <button
                  key={c.key}
                  onClick={() => setActiveCat(c.key)}
                  className={`w-14 rounded-[5px] py-1.5 text-[11px] font-bold transition-colors ${
                    active ? 'bg-gauge text-white' : 'bg-disabled text-white hover:brightness-95'
                  }`}
                >
                  {c.label}
                </button>
              )
            })}
          </div>

          {/* 右: 成績バー */}
          <div className="card-grad min-w-0 flex-1 space-y-3 bg-surface/50 p-4">
            {/* 全体集計 */}
            <div className="flex items-center gap-3">
              <span className="grid w-20 shrink-0 place-items-center rounded-[5px] bg-gauge py-1 text-[11px] font-bold text-white">
                全体集計
              </span>
              <div className="min-w-0 flex-1">
                <GradientBar done={filteredDone} total={filteredAll} />
              </div>
            </div>

            {/* セクション別 */}
            {filteredSections.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted">該当する研修セクションがありません。</p>
            ) : (
              filteredSections.map((sec) => {
                const { done, total } = sectionStats(sec)
                return (
                  <div key={sec.id} className="flex items-center gap-3">
                    <span className="grid w-20 shrink-0 place-items-center truncate rounded-[5px] bg-brand py-1 text-[11px] font-bold text-white">
                      {sec.name}
                    </span>
                    <div className="min-w-0 flex-1">
                      <GradientBar done={done} total={total} />
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </section>
    </div>
  )
}
