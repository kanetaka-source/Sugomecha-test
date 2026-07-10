import { useEffect, useState } from 'react'

type Props = {
  /** 0–100 */
  value: number
  size?: number
  stroke?: number
  children?: React.ReactNode
}

/** グラデーション(青→ピンク)の円形プログレスゲージ。ロード時に0→valueへアニメーション。 */
export function ProgressRing({ value, size = 132, stroke = 12, children }: Props) {
  // 表示値。マウント後に value へ上昇させて伸びるアニメーションにする
  const [shown, setShown] = useState(0)
  useEffect(() => {
    const id = requestAnimationFrame(() => setShown(value))
    return () => cancelAnimationFrame(id)
  }, [value])

  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const offset = c * (1 - Math.max(0, Math.min(100, shown)) / 100)
  const gid = `gauge-${Math.round(value)}-${size}`
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <defs>
          <linearGradient id={gid} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--grad-from)" />
            <stop offset="100%" stopColor="var(--grad-to)" />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#ececec" strokeWidth={stroke} />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none"
          stroke={`url(#${gid})`} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 900ms ease-out' }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">{children}</div>
    </div>
  )
}
