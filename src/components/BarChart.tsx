import type { BarDatum } from '../lib/data'

type BarVariant = 'gauge' | 'brand' | 'accent'

type BarChartProps = {
  data: BarDatum[]
  /** バー上限値。省略時はデータ内の最大値を使用 */
  max?: number
  /** 値に付ける単位 (例: 'pt', '件') */
  unit?: string
  /** バーの配色 */
  variant?: BarVariant
}

const barClass: Record<BarVariant, string> = {
  gauge: 'bg-gauge',
  brand: 'bg-brand',
  accent: 'bg-accent',
}

export function BarChart({ data, max, unit = '', variant = 'gauge' }: BarChartProps) {
  const ceiling = max ?? Math.max(...data.map((d) => d.value), 1)

  return (
    <div className="flex flex-col gap-3">
      {data.map((d) => {
        const pct = Math.min(100, Math.round((d.value / ceiling) * 100))
        return (
          <div key={d.label} className="flex items-center gap-3">
            <span className="w-12 shrink-0 text-right text-[11px] text-muted">{d.label}</span>
            <div className="h-4 flex-1 overflow-hidden rounded-pill bg-line">
              <div className={`h-full rounded-pill ${barClass[variant]}`} style={{ width: `${pct}%` }} />
            </div>
            <span className="w-12 shrink-0 text-[11px] font-bold text-ink">
              {d.value}{unit}
            </span>
          </div>
        )
      })}
    </div>
  )
}
