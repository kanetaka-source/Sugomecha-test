import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  trainingSectionsApi,
  trainingItemsApi,
  employeesApi,
  waitingOrdersApi,
  type TrainingSection,
  type TrainingItem,
  type Employee,
} from '../lib/api'
import { getCurrentUser } from '../lib/currentUser'
import { loadPrioritySet } from '../lib/evalProgress'
import { orderWaiting, reorder, sameOrder } from '../lib/waiting'

// 作業待ち詳細で表示する最大人数
const WAITING_MAX = 10
const CARD_COLORS = ['bg-brand', 'bg-accent', 'bg-magenta', 'bg-danger', 'bg-gold']

export default function MachiDetailPage() {
  const { itemId } = useParams()
  const navigate = useNavigate()
  const currentUser = getCurrentUser()
  const id = itemId ? Number(itemId) : null

  const [sections, setSections] = useState<TrainingSection[]>([])
  const [items, setItems] = useState<TrainingItem[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [savedOrderIds, setSavedOrderIds] = useState<number[]>([])
  const [dragIdx, setDragIdx] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const priority = useMemo(() => loadPrioritySet(), [])

  useEffect(() => {
    ;(async () => {
      setLoading(true)
      try {
        const [secs, its, emps, orders] = await Promise.all([
          trainingSectionsApi.list(),
          trainingItemsApi.list(),
          employeesApi.list(),
          id != null ? waitingOrdersApi.list(id) : Promise.resolve([]),
        ])
        setSections(secs)
        setItems(its)
        setEmployees(emps)
        setSavedOrderIds(orders.map((o) => o.employeeId))
      } catch (e: any) {
        setError(e.message)
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  // ログイン者のロール → 評価者/管理者なら並び替え可
  const myRole = employees.find((e) => e.id === currentUser?.id)?.role
  const canReorder = myRole === '評価者' || myRole === '管理者'

  if (loading) return <p className="py-8 text-center text-sm text-muted">読み込み中…</p>

  const item = items.find((it) => it.id === id) || null
  const section = item ? sections.find((s) => s.id === item.sectionId) || null : null
  const courseId = section?.courseId ?? null
  const courseName = section?.course?.name ?? ''

  // 作業待ち母集団（★優先の項目は全受講者、それ以外は当該コース履修者）→ 保存順で並べ替え
  const trainees = employees.filter((e) => e.role === '受講者')
  const members =
    item && priority.has(item.id)
      ? trainees
      : trainees.filter((e) => courseId != null && e.enrolledCourses.some((c) => c.id === courseId))
  const { list: ordered, manual } = orderWaiting(members, savedOrderIds)
  const shown = ordered.slice(0, WAITING_MAX)
  // 各社員の本来（既定）の順位。現在位置と違えば「移動済み」
  const defaultRank = new Map(members.map((e, i) => [e.id, i]))

  // 工程・内容の列（セクションの研修ヘッダー設定から）
  const headerCols = section
    ? [1, 2, 3, 4, 5]
        .filter((i) => (section as any)[`header${i}Flag`])
        .map((i) => ({ i, name: (section as any)[`header${i}Name`] || `項目${i}` }))
    : []

  // 並び替えを保存（表示中の並び＋残りメンバーの順で全件保存）。
  // 既定順に戻ったら並び順データをクリア（手動表記も消える）。
  function persistOrder(newShown: Employee[]) {
    if (id == null) return
    const full = [...newShown, ...ordered.slice(WAITING_MAX)]
    const ids = sameOrder(full, members) ? [] : full.map((e) => e.id)
    setSavedOrderIds(ids)
    waitingOrdersApi.save(id, ids).catch((e: any) => setError(e?.message || '並び替えの保存に失敗しました'))
  }

  function onDrop(targetIdx: number) {
    if (dragIdx == null || dragIdx === targetIdx) {
      setDragIdx(null)
      return
    }
    persistOrder(reorder(shown, dragIdx, targetIdx))
    setDragIdx(null)
  }

  return (
    <div>
      {/* タイトル + 戻る */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-lg font-bold text-ink2">作業待ち 詳細</h1>
        <button
          onClick={() => navigate('/machi')}
          className="rounded-md bg-disabled px-4 py-1.5 text-xs font-bold text-white hover:brightness-95"
        >
          一覧へ戻る
        </button>
      </div>

      {error && (
        <p className="mb-3 rounded-md bg-danger/10 px-3 py-2 text-xs font-bold text-danger">{error}</p>
      )}

      {item == null ? (
        <div className="card-grad bg-surface/70 p-8 text-center text-sm text-muted">対象の研修項目が見つかりません。</div>
      ) : (
        <div className="space-y-5">
          {/* 対象項目 */}
          <div className="card-grad bg-surface/70 p-5">
            <p className="mb-2 text-xs text-muted">
              {courseName || '—'} ・ {section?.name ?? '—'}
            </p>
            <div className="space-y-0.5">
              {headerCols.length === 0 ? (
                <p className="text-sm font-bold text-ink2">{item.title}</p>
              ) : (
                headerCols.map((c) => (
                  <p key={`v${c.i}`} className="text-[13px] leading-snug">
                    <span className="text-muted">{c.name}：</span>
                    <span className="font-bold text-ink2">{(item as any)[`value${c.i}`] || '—'}</span>
                  </p>
                ))
              )}
            </div>
          </div>

          {/* 作業待ち一覧（最大10人） */}
          <section>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-ink2">作業待ち</h2>
                {manual && (
                  <span className="rounded-full bg-gold/20 px-2 py-0.5 text-[10px] font-bold text-gold">
                    手動並び替え済み
                  </span>
                )}
              </div>
              <span className="rounded-full bg-brand/10 px-3 py-1 text-xs font-bold text-brand">
                合計 {members.length}人
                {members.length > WAITING_MAX && <span className="text-muted">（先頭{WAITING_MAX}人）</span>}
              </span>
            </div>

            {canReorder ? (
              <p className="mb-2 text-[11px] text-muted">カードをドラッグで順番を変更／クリックでその社員の進捗状況へ。</p>
            ) : (
              <p className="mb-2 text-[11px] text-muted">カードをクリックでその社員の進捗状況へ。</p>
            )}

            {shown.length === 0 ? (
              <div className="card-grad bg-surface/70 p-8 text-center text-sm text-muted">作業待ちのユーザーはいません。</div>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
                {shown.map((e, i) => {
                  const di = defaultRank.get(e.id)
                  const moved = di != null && di !== i // 本来の位置と違う＝移動済み
                  return (
                    <div
                      key={e.id}
                      draggable={canReorder}
                      onDragStart={() => setDragIdx(i)}
                      onDragOver={(ev) => canReorder && ev.preventDefault()}
                      onDrop={() => onDrop(i)}
                      onClick={() =>
                        navigate(`/shinchoku?employeeId=${e.id}${courseName ? `&category=${encodeURIComponent(courseName)}` : ''}`)
                      }
                      title="クリックで進捗状況へ"
                      className={`relative cursor-pointer overflow-hidden rounded-lg border-2 bg-white shadow-sm transition-shadow hover:shadow-md ${
                        dragIdx === i ? 'border-brand opacity-60' : moved ? 'border-gold' : 'border-line'
                      }`}
                    >
                      {moved && (
                        <span className="absolute right-1 top-1 rounded-full bg-gold px-1.5 text-[9px] font-bold text-white">
                          元{(di as number) + 1}位
                        </span>
                      )}
                      <div className={`${CARD_COLORS[i % CARD_COLORS.length]} py-1 text-center text-[11px] font-bold text-white`}>
                        {i + 1}
                      </div>
                      <div className="px-2 py-3 text-center">
                        <p className="text-sm font-bold leading-tight text-ink2">{e.name}</p>
                        <p className="mt-0.5 text-[10px] text-muted">{e.employeeNo}</p>
                        <p className="text-[10px] text-muted">{e.department?.name ?? '—'}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  )
}
