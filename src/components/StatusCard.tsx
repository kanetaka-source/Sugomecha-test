import { useEffect, useState } from 'react'
import crownOn from '../assets/badge-crown-on.png'
import crownOff from '../assets/badge-crown-off.png'
import medalOn from '../assets/badge-medal-on.png'
import medalOff from '../assets/badge-medal-off.png'

// マスターバッジの段階（研修コースごと）
export type MasterBadgeVM = { label: string; tier: 'gold' | 'silver' | 'bronze' | null }
export type SpecialBadgeVM = { label: string; active: boolean }

// ゴールド王冠(crownOn)を段階に応じて色替え（デザインは元の画像のまま／色だけ変更）。
// silver=はっきり銀色（グレー）／bronze=はっきり銅色（茶）。
const TIER_FILTER: Record<'gold' | 'silver' | 'bronze', string> = {
  gold: 'none',
  silver: 'grayscale(1) brightness(0.78) contrast(1.05)',
  bronze: 'brightness(0.72) sepia(1) saturate(3) hue-rotate(-22deg)',
}
const TIER_LABEL: Record<'gold' | 'silver' | 'bronze', string> = {
  gold: 'ゴールド',
  silver: 'シルバー',
  bronze: 'ブロンズ',
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="mb-3 text-base font-bold text-ink2">{children}</h2>
}

export function StatusCard({
  master,
  special,
  points,
}: {
  master: MasterBadgeVM[]
  special: SpecialBadgeVM[]
  points: { current: number; total: number }
}) {
  const pct = points.total > 0 ? Math.round((points.current / points.total) * 100) : 0
  // ロード時に 0→pct へ上昇アニメーション
  const [barW, setBarW] = useState(0)
  useEffect(() => {
    const id = requestAnimationFrame(() => setBarW(pct))
    return () => cancelAnimationFrame(id)
  }, [pct])
  return (
    <section>
      <SectionTitle>ステータス</SectionTitle>
      <div className="card-grad bg-surface p-5 shadow-sm">
        <div className="grid gap-6 sm:grid-cols-2">
          {/* マスターバッジ（研修コースごと。ゴールド/シルバー/ブロンズ） */}
          <div>
            <p className="mb-3 text-xs text-muted">マスターバッジ</p>
            <div className="flex flex-wrap gap-3">
              {master.length === 0 ? (
                <span className="text-[11px] text-muted">—</span>
              ) : (
                master.map((b) => (
                  <div key={b.label} className="flex w-14 flex-col items-center gap-1">
                    <img
                      src={b.tier ? crownOn : crownOff}
                      alt=""
                      style={b.tier ? { filter: TIER_FILTER[b.tier] } : undefined}
                      className="h-9 w-9 object-contain"
                    />
                    <span className="w-full truncate text-center text-[11px] text-muted" title={b.label}>
                      {b.label}
                    </span>
                    <span className="text-[9px] font-bold text-muted">{b.tier ? TIER_LABEL[b.tier] : '—'}</span>
                  </div>
                ))
              )}
            </div>
          </div>
          {/* スペシャルバッジ */}
          <div>
            <p className="mb-3 text-xs text-muted">スペシャルバッジ</p>
            <div className="flex gap-3">
              {special.map((b) => (
                <div key={b.label} className="flex flex-col items-center gap-1">
                  <img src={b.active ? medalOn : medalOff} alt="" className="h-9 w-9 object-contain" />
                  <span className="text-center text-[9px] leading-tight text-muted">{b.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* total point */}
        <div className="mt-5">
          <div className="mb-1 flex items-center justify-between text-xs text-muted">
            <span>total point</span>
            <span>{points.current}/{points.total}pt</span>
          </div>
          <div className="h-3 w-full overflow-hidden rounded-pill bg-line">
            <div
              className="h-full rounded-pill bg-gauge transition-[width] duration-700 ease-out"
              style={{ width: `${barW}%` }}
            />
          </div>
        </div>
      </div>
    </section>
  )
}
