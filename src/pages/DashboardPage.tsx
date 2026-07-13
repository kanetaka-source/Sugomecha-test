import { useEffect, useRef, useState } from 'react'
import { StatusCard, type MasterBadgeVM, type SpecialBadgeVM } from '../components/StatusCard'
import { TrainingCard } from '../components/TrainingCard'
import {
  dashboardApi,
  notificationsApi,
  heldQualificationsApi,
  type TrainingCourse,
  type TrainingSection,
  type TrainingItem,
} from '../lib/api'
import { stampsToSet, countsToMap, isItemEvaluated, isItemAllPassed } from '../lib/evalProgress'
import { getCurrentUser } from '../lib/currentUser'
import { NotificationFeed } from '../components/NotificationFeed'

export default function DashboardPage() {
  const [courses, setCourses] = useState<TrainingCourse[]>([])
  const [sections, setSections] = useState<TrainingSection[]>([])
  const [items, setItems] = useState<TrainingItem[]>([])
  const [stamps, setStamps] = useState<Set<string>>(new Set())
  const [counts, setCounts] = useState<Map<string, number>>(new Map())
  const [myRole, setMyRole] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notifSignal, setNotifSignal] = useState(0) // 派生通知の生成後にフィードを再取得するためのシグナル
  const currentUser = getCurrentUser()

  // ドラッグ並び替え（順番は localStorage に保存）
  const ORDER_KEY = 'izumi.courseOrder'
  const dragIndex = useRef<number | null>(null)
  const [overIndex, setOverIndex] = useState<number | null>(null)

  // 保存済みの並び順を適用（新規コースは末尾に追加）
  function applySavedOrder(list: TrainingCourse[]): TrainingCourse[] {
    try {
      const saved = JSON.parse(localStorage.getItem(ORDER_KEY) || '[]') as number[]
      const byId = new Map(list.map((c) => [c.id, c]))
      const ordered = saved.map((id) => byId.get(id)).filter((c): c is TrainingCourse => !!c)
      const remaining = list.filter((c) => !saved.includes(c.id))
      return ordered.length ? [...ordered, ...remaining] : list
    } catch {
      return list
    }
  }

  function commitOrder(next: TrainingCourse[]) {
    setCourses(next)
    localStorage.setItem(ORDER_KEY, JSON.stringify(next.map((c) => c.id)))
  }

  function onDrop(target: number) {
    const from = dragIndex.current
    dragIndex.current = null
    setOverIndex(null)
    if (from == null || from === target) return
    const next = [...courses]
    const [moved] = next.splice(from, 1)
    next.splice(target, 0, moved)
    commitOrder(next)
  }

  useEffect(() => {
    ;(async () => {
      try {
        const boot = await dashboardApi.bootstrap(currentUser?.id)
        setCourses(applySavedOrder(boot.courses))
        setSections(boot.sections)
        setItems(boot.items)
        if (currentUser) {
          setStamps(stampsToSet(boot.stamps))
          setCounts(countsToMap(boot.stamps))
          setMyRole(boot.employee?.role ?? null)
        }
      } catch (e: any) {
        setError(e.message)
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  // 派生通知（バッジ付与・資格期限）を検知してサーバーへ送信。サーバー側 dedupeKey で重複は作られない。
  useEffect(() => {
    if (loading || !currentUser) return
    let alive = true
    ;(async () => {
      // バッジ付与（コースごとの獲得段階）
      for (const c of courses) {
        const tier = courseTier(c.id)
        if (tier) await notificationsApi.emitBadge(currentUser.id, c.name, tier).catch(() => {})
      }
      // 資格期限（期限切れ／60日前から迫っている）
      try {
        const detail = await heldQualificationsApi.get(currentUser.id)
        const now = Date.now()
        const D60 = 60 * 24 * 3600 * 1000
        for (const h of detail.held) {
          if (!h.validUntil) continue
          const vu = new Date(h.validUntil).getTime()
          if (vu < now) {
            await notificationsApi.emitQual(currentUser.id, h.qualificationId, 'expired', h.name, h.validUntil).catch(() => {})
          } else if (vu - now <= D60) {
            await notificationsApi.emitQual(currentUser.id, h.qualificationId, 'expiring', h.name, h.validUntil).catch(() => {})
          }
        }
      } catch {
        /* 資格取得失敗は無視 */
      }
      if (alive) setNotifSignal((s) => s + 1)
    })()
    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading])

  // コースの進捗％（管理者評価まで完了した研修項目の割合）
  function progressFor(course: TrainingCourse): number {
    const courseItems = items.filter((it) => it.section?.course?.id === course.id)
    if (courseItems.length === 0) return 0
    const done = courseItems.filter((it) => {
      const sec = sections.find((s) => s.id === it.sectionId)
      return sec ? isItemEvaluated(it.id, sec, stamps, counts) : false
    }).length
    return Math.round((done / courseItems.length) * 100)
  }

  // マスターバッジ段階（研修コースごと）。完了＝自己＋管理者評価が全合格。
  // ブロンズ: 項目1つ以上完了 / シルバー: セクション1つ以上完了 / ゴールド: 全セクション完了
  function courseTier(courseId: number): 'gold' | 'silver' | 'bronze' | null {
    const secs = sections
      .filter((s) => s.courseId === courseId)
      .map((s) => ({ s, its: items.filter((i) => i.sectionId === s.id) }))
      .filter((x) => x.its.length > 0)
    if (secs.length === 0) return null
    let completed = 0
    let anyItem = false
    for (const { s, its } of secs) {
      const done = its.filter((i) => isItemAllPassed(i.id, s, stamps, counts)).length
      if (done > 0) anyItem = true
      if (done === its.length) completed++
    }
    if (completed === secs.length) return 'gold'
    if (completed >= 1) return 'silver'
    if (anyItem) return 'bronze'
    return null
  }

  // トータルポイント：全研修コースの合計点数（1点=自己＋管理者評価が全合格した研修項目）
  const totalPoints = (() => {
    let current = 0
    for (const it of items) {
      const sec = sections.find((s) => s.id === it.sectionId)
      if (sec && isItemAllPassed(it.id, sec, stamps, counts)) current++
    }
    return { current, total: items.length }
  })()

  // ステータスのバッジ（研修コースごとのマスター＋スペシャル）
  const masterBadges: MasterBadgeVM[] = courses.map((c) => ({ label: c.name, tier: courseTier(c.id) }))
  const goldCount = masterBadges.filter((b) => b.tier === 'gold').length
  const specialBadges: SpecialBadgeVM[] = [
    { label: '評価者', active: myRole === '評価者' },
    { label: '2階級制覇', active: goldCount >= 2 },
    { label: '3階級制覇', active: goldCount >= 3 },
    { label: '4階級制覇', active: goldCount >= 4 },
    { label: '全階級制覇', active: courses.length > 0 && goldCount === courses.length },
  ]

  return (
    <div className="space-y-8">
      <StatusCard master={masterBadges} special={specialBadges} points={totalPoints} />

      {/* 新着情報 */}
      <section>
        <h2 className="mb-3 text-base font-bold text-ink2">新着情報</h2>
        {currentUser ? (
          <NotificationFeed employeeId={currentUser.id} audience="home" reloadSignal={notifSignal} heightClass="h-56" />
        ) : (
          <div className="card-grad h-40 overflow-y-auto bg-surface p-4 shadow-sm">
            <p className="text-sm text-muted">新着情報はありません。</p>
          </div>
        )}
      </section>

      {/* 研修メニュー（研修コースマスタと連動） */}
      <section>
        <div className="mb-3 flex items-baseline gap-3">
          <h2 className="text-base font-bold text-ink2">研修メニュー</h2>
          {courses.length > 1 && (
            <span className="text-[11px] text-muted">カードをドラッグして並び替え（自動保存）</span>
          )}
        </div>
        {error && (
          <p className="mb-3 rounded-md bg-danger/10 px-3 py-2 text-xs font-bold text-danger">{error}</p>
        )}
        {loading ? (
          <p className="py-8 text-center text-sm text-muted">読み込み中…</p>
        ) : courses.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted">研修コースが登録されていません。</p>
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {courses.map((c, idx) => (
              <div
                key={c.id}
                draggable
                onDragStart={(e) => {
                  dragIndex.current = idx
                  e.dataTransfer.effectAllowed = 'move'
                }}
                onDragOver={(e) => {
                  e.preventDefault()
                  if (overIndex !== idx) setOverIndex(idx)
                }}
                onDragLeave={() => setOverIndex((p) => (p === idx ? null : p))}
                onDrop={(e) => {
                  e.preventDefault()
                  onDrop(idx)
                }}
                onDragEnd={() => {
                  dragIndex.current = null
                  setOverIndex(null)
                }}
                className={`cursor-move rounded-card transition-transform ${
                  overIndex === idx ? 'ring-2 ring-brand' : ''
                }`}
              >
                <TrainingCard course={c} progress={progressFor(c)} />
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
