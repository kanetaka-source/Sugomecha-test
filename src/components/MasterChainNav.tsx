import { Link, useLocation } from 'react-router-dom'

type Step = { label: string; to: string }

// 拠点 → 部門 → 社員
export const LOCATION_CHAIN: Step[] = [
  { label: '拠点マスタ', to: '/admin/kyoten' },
  { label: '部門マスタ', to: '/admin/bumon' },
  { label: '社員マスタ', to: '/admin/shain' },
]

// 研修コース → セクション → 項目 → 教材
export const TRAINING_CHAIN: Step[] = [
  { label: '研修コースマスタ', to: '/admin/kenshu-course' },
  { label: '研修セクションマスタ', to: '/admin/kenshu-section' },
  { label: '研修項目マスタ', to: '/admin/kenshu-item' },
  { label: '研修教材マスタ', to: '/admin/kenshu-material' },
]

// 関連マスタ間を行き来するボタン（→ でつなぐ。現在地はハイライト）
export function MasterChainNav({ steps }: { steps: Step[] }) {
  const { pathname } = useLocation()
  return (
    <div className="mb-4 flex flex-wrap items-center gap-1.5 text-xs">
      {steps.map((s, i) => {
        const active = pathname === s.to || pathname.startsWith(s.to + '/')
        return (
          <span key={s.to} className="flex items-center gap-1.5">
            {i > 0 && <span className="text-muted">→</span>}
            <Link
              to={s.to}
              className={`rounded-md px-3 py-1 font-bold transition-colors ${
                active ? 'bg-brand text-white' : 'border border-brand/50 text-brand hover:bg-brand/5'
              }`}
            >
              {s.label}
            </Link>
          </span>
        )
      })}
    </div>
  )
}
