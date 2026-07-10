import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  IconPencil, IconBuilding, IconOrgChart, IconUser, IconGraphLine, IconIdCard,
  IconGradCap, IconSection, IconChecklist, IconMaterial, IconShieldCheck, IconCertificate,
  IconExam,
} from '../components/icons'
import { examApplicationsApi } from '../lib/api'
import { getCurrentUser } from '../lib/currentUser'
import { NotificationFeed } from '../components/NotificationFeed'

// 管理メニュー（カード一覧）
type MenuItem = {
  label: string
  to: string
  Icon: (p: { className?: string }) => JSX.Element
  badge?: number
}

// メニュー（マスタ以外の業務メニュー）。バッジ件数は実データから動的に付与（badges prop）。
const operationMenu: MenuItem[] = [
  { label: '筆記試験申請', to: '/admin/hikki-shinsei', Icon: IconPencil },
  { label: '点数一覧', to: '/admin/tensu', Icon: IconGraphLine },
]

// マスタメニュー（各種マスタ管理）
const masterMenu: MenuItem[] = [
  { label: '拠点マスタ', to: '/admin/kyoten', Icon: IconBuilding },
  { label: '部門マスタ', to: '/admin/bumon', Icon: IconOrgChart },
  { label: '社員マスタ', to: '/admin/shain', Icon: IconUser },
  { label: '研修コースマスタ', to: '/admin/kenshu-course', Icon: IconGradCap },
  { label: '研修セクションマスタ', to: '/admin/kenshu-section', Icon: IconSection },
  { label: '研修項目マスタ', to: '/admin/kenshu-item', Icon: IconChecklist },
  { label: '研修教材マスタ', to: '/admin/kenshu-material', Icon: IconMaterial },
  { label: '筆記試験マスタ', to: '/admin/shiken', Icon: IconExam },
  { label: '資格マスタ', to: '/admin/shikaku-master', Icon: IconIdCard },
  { label: '権限マスタ', to: '/admin/kengen', Icon: IconShieldCheck },
  { label: '保有資格マスタ', to: '/admin/hoyu-shikaku', Icon: IconCertificate },
]

// 保存済みの並び順（to の配列）を読み込み、デフォルトとマージ（新規メニューは末尾に追加）
function loadOrder(storageKey: string, defaults: MenuItem[]): MenuItem[] {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey) || '[]') as string[]
    const byTo = new Map(defaults.map((d) => [d.to, d]))
    const ordered = saved.map((to) => byTo.get(to)).filter((x): x is MenuItem => !!x)
    const remaining = defaults.filter((d) => !saved.includes(d.to))
    return ordered.length ? [...ordered, ...remaining] : defaults
  } catch {
    return defaults
  }
}

// ドラッグで並び替えできるカードグリッド（1行最大5個。順番はlocalStorageへ自動保存）
// badges: to → 件数（未承認申請数などの動的バッジ）
function SortableMenuGrid({
  storageKey,
  defaultItems,
  badges,
}: {
  storageKey: string
  defaultItems: MenuItem[]
  badges?: Record<string, number>
}) {
  const [items, setItems] = useState<MenuItem[]>(() => loadOrder(storageKey, defaultItems))
  const dragIndex = useRef<number | null>(null)
  const [overIndex, setOverIndex] = useState<number | null>(null)

  function commit(next: MenuItem[]) {
    setItems(next)
    localStorage.setItem(storageKey, JSON.stringify(next.map((i) => i.to)))
  }

  function onDrop(target: number) {
    const from = dragIndex.current
    dragIndex.current = null
    setOverIndex(null)
    if (from == null || from === target) return
    const next = [...items]
    const [moved] = next.splice(from, 1)
    next.splice(target, 0, moved)
    commit(next)
  }

  return (
    <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
      {items.map(({ label, to, Icon, badge }, idx) => {
        const count = badges?.[to] ?? badge ?? 0
        return (
        <Link
          key={to}
          to={to}
          draggable
          onDragStart={(e) => {
            dragIndex.current = idx
            e.dataTransfer.effectAllowed = 'move'
            e.dataTransfer.setData('text/plain', to)
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
          className={`card-grad relative flex aspect-[120/129] cursor-move flex-col items-center justify-center gap-3 bg-surface/40 p-3 transition-transform hover:-translate-y-0.5 hover:shadow-md ${
            overIndex === idx ? 'ring-2 ring-brand' : ''
          }`}
        >
          {count > 0 && (
            <span
              title={`未対応 ${count}件`}
              className="absolute right-2 top-2 grid h-6 min-w-[24px] place-items-center rounded-full bg-danger px-1 text-[11px] font-bold text-white"
            >
              {count > 99 ? '99+' : count}
            </span>
          )}
          <Icon className="h-20 w-20 text-muted" />
          <span className="text-center text-[13px] font-bold text-muted">{label}</span>
        </Link>
        )
      })}
    </div>
  )
}

export default function AdminHomePage() {
  const currentUser = getCurrentUser()
  // 筆記試験申請の「申請中（未承認）」件数バッジ
  const [pendingExam, setPendingExam] = useState(0)
  useEffect(() => {
    let alive = true
    const load = async () => {
      try {
        const apps = await examApplicationsApi.list({ status: '申請中' })
        if (alive) setPendingExam(apps.length)
      } catch {
        /* 取得失敗はバッジ非表示 */
      }
    }
    load()
    const onChanged = () => load()
    window.addEventListener('exam-apps-changed', onChanged)
    return () => {
      alive = false
      window.removeEventListener('exam-apps-changed', onChanged)
    }
  }, [])

  return (
    <div className="space-y-8">
      {/* 新着情報 */}
      <section>
        <h2 className="mb-3 text-base font-bold text-ink2">新着情報</h2>
        {currentUser ? (
          <NotificationFeed employeeId={currentUser.id} audience="admin" reloadSignal={pendingExam} heightClass="h-48" />
        ) : (
          <div className="card-grad h-48 overflow-y-auto bg-surface/50 p-4 shadow-sm scroll-area">
            <p className="text-sm text-muted">新着情報はありません。</p>
          </div>
        )}
      </section>

      {/* メニュー */}
      <section>
        <div className="mb-3 flex items-baseline gap-3">
          <h2 className="text-base font-bold text-ink2">メニュー</h2>
          <span className="text-[11px] text-muted">カードをドラッグして並び替え（自動保存）</span>
        </div>
        <SortableMenuGrid
          storageKey="izumi.menuOrder.operation"
          defaultItems={operationMenu}
          badges={{ '/admin/hikki-shinsei': pendingExam }}
        />
      </section>

      {/* マスタメニュー */}
      <section>
        <div className="mb-3 flex items-baseline gap-3">
          <h2 className="text-base font-bold text-ink2">マスタメニュー</h2>
          <span className="text-[11px] text-muted">カードをドラッグして並び替え（自動保存）</span>
        </div>
        <SortableMenuGrid storageKey="izumi.menuOrder.master" defaultItems={masterMenu} />
      </section>
    </div>
  )
}
