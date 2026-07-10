import { useState } from 'react'
import { Link } from 'react-router-dom'
import { AuthCard, AuthField } from '../components/AuthCard'

export default function PasswordResetPage() {
  const [id, setId] = useState('')
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)

  function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    // TODO: 再発行API連携（現状はモックで送信完了表示）
    setSent(true)
  }

  const ready = id.trim() !== '' && email.trim() !== ''

  return (
    <AuthCard title="パスワード再発行">
      {sent ? (
        <div className="text-center">
          <p className="text-sm font-bold leading-relaxed tracking-[0.36px] text-white">
            入力されたメールアドレスに
            <br />
            パスワード再発行のご案内を送信しました。
          </p>
          <Link
            to="/login"
            className="mt-7 block text-center text-sm font-bold tracking-[0.42px] text-white underline-offset-4 hover:underline"
          >
            ログイン画面に戻る
          </Link>
        </div>
      ) : (
        <form onSubmit={onSubmit}>
          <p className="mb-5 text-center text-xs font-bold leading-relaxed tracking-[0.36px] text-white">
            ご登録のログインIDとメールアドレスを入力してください。
            <br />
            パスワード再発行のご案内をメールでお送りします。
          </p>

          <AuthField label="ログインID" value={id} onChange={setId} autoComplete="username" />
          <AuthField
            label="登録メールアドレス"
            type="email"
            value={email}
            onChange={setEmail}
            autoComplete="email"
          />

          <button
            type="submit"
            className={`mx-auto mt-2 block w-40 rounded-[5px] py-1.5 text-xs font-bold text-white transition-colors ${
              ready ? 'bg-brand hover:bg-brand-deep' : 'bg-disabled hover:brightness-95'
            }`}
          >
            再発行する
          </button>

          <Link
            to="/login"
            className="mt-6 block text-center text-sm font-bold tracking-[0.42px] text-white underline-offset-4 hover:underline"
          >
            ログイン画面に戻る
          </Link>
        </form>
      )}
    </AuthCard>
  )
}
