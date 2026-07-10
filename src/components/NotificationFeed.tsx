import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { notificationsApi, type NotificationItem } from '../lib/api'

// カテゴリ別のラベルと色（tokens.css のCSS変数を参照）
const CAT_META: Record<string, { label: string; cls: string }> = {
  eval: { label: '評価', cls: 'bg-brand/15 text-brand' },
  exam: { label: '試験', cls: 'bg-gauge/15 text-gauge' },
  badge: { label: 'バッジ', cls: 'bg-gold/20 text-gold' },
  master: { label: 'マスタ', cls: 'bg-ink2/10 text-ink2' },
  waiting: { label: '待ち', cls: 'bg-ok/15 text-ok' },
  qual: { label: '資格', cls: 'bg-danger/10 text-danger' },
}

// 相対時刻の表示（○分前 / ○時間前 / ○日前）
function timeAgo(iso: string): string {
  const diff = Math.max(0, Date.now() - new Date(iso).getTime())
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'たった今'
  if (m < 60) return `${m}分前`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}時間前`
  const d = Math.floor(h / 24)
  if (d < 7) return `${d}日前`
  return new Date(iso).toLocaleDateString('ja-JP')
}

// 新着情報フィード（ホーム／管理画面 共通）。スクロール・クリック遷移・既読表示に対応。
export function NotificationFeed({
  employeeId,
  audience = 'home',
  reloadSignal = 0,
  heightClass = 'h-48',
}: {
  employeeId: number
  audience?: 'home' | 'admin'
  reloadSignal?: number
  heightClass?: string
}) {
  const [items, setItems] = useState<NotificationItem[]>([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    let alive = true
    setLoading(true)
    notificationsApi
      .list(employeeId, audience)
      .then((list) => alive && setItems(list))
      .catch(() => alive && setItems([]))
      .finally(() => alive && setLoading(false))
    return () => {
      alive = false
    }
  }, [employeeId, audience, reloadSignal])

  const unread = items.filter((n) => !n.read).length

  // 通知を開く：既読化して遷移先へ
  function open(n: NotificationItem) {
    if (!n.read) {
      setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, read: true } : x)))
      notificationsApi.markRead(employeeId, n.id).catch(() => {})
    }
    if (n.link) navigate(n.link)
  }

  function readAll() {
    const ids = items.filter((n) => !n.read).map((n) => n.id)
    if (!ids.length) return
    setItems((prev) => prev.map((x) => ({ ...x, read: true })))
    notificationsApi.markAllRead(employeeId, ids).catch(() => {})
  }

  return (
    <div>
      {unread > 0 && (
        <div className="mb-2 flex items-center justify-between">
          <span className="text-[11px] font-bold text-brand">未読 {unread}件</span>
          <button onClick={readAll} className="text-[11px] font-bold text-muted hover:text-brand hover:underline">
            すべて既読にする
          </button>
        </div>
      )}
      <div className={`card-grad ${heightClass} overflow-y-auto bg-surface p-3 shadow-sm scroll-area`}>
        {loading ? (
          <p className="py-6 text-center text-sm text-muted">読み込み中…</p>
        ) : items.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted">新着情報はありません。</p>
        ) : (
          <ul className="space-y-1.5">
            {items.map((n) => {
              const meta = CAT_META[n.category] ?? { label: 'お知らせ', cls: 'bg-line text-muted' }
              return (
                <li key={n.id}>
                  <button
                    onClick={() => open(n)}
                    className={`flex w-full items-start gap-2 rounded-[6px] border px-3 py-2 text-left transition-colors ${
                      n.read
                        ? 'border-line bg-transparent opacity-60 hover:opacity-90'
                        : 'border-brand/30 bg-brand/5 hover:bg-brand/10'
                    }`}
                  >
                    <span
                      className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${n.read ? 'bg-transparent' : 'bg-brand'}`}
                    />
                    <span className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold ${meta.cls}`}>
                      {meta.label}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span
                        className={`block text-[13px] leading-snug ${n.read ? 'text-muted' : 'font-bold text-ink2'}`}
                      >
                        {n.title}
                      </span>
                      <span className="mt-0.5 block text-[10px] text-muted">
                        {timeAgo(n.createdAt)}
                        {n.actorName ? ` ・ ${n.actorName}` : ''}
                      </span>
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
