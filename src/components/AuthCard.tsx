/** ログイン/パスワード再発行で共通の濃紺カードシェル（Figma node 6009-8667 準拠） */
export function AuthCard({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="grid min-h-screen place-items-center bg-white px-4">
      <div className="w-full max-w-md rounded-[20px] bg-brand-navy px-8 py-10 shadow-xl">
        <div className="mb-7 flex flex-col items-center">
          <h1 className="text-center text-xl font-bold tracking-[0.6px] text-white">
            {title}
          </h1>
        </div>
        {children}
      </div>
    </div>
  )
}

/** カード内の白入力フィールド（ラベル＋input） */
export function AuthField({
  label,
  type = 'text',
  value,
  onChange,
  autoComplete,
}: {
  label: string
  type?: string
  value: string
  onChange: (v: string) => void
  autoComplete?: string
}) {
  return (
    <label className="mb-4 block">
      <span className="mb-1 block text-xs font-bold tracking-[0.36px] text-white">
        {label}
      </span>
      <input
        type={type}
        value={value}
        autoComplete={autoComplete}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-[5px] bg-white px-3 py-2 text-sm text-ink outline-none ring-2 ring-transparent focus:ring-brand-light"
      />
    </label>
  )
}
