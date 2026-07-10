import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AuthCard, AuthField } from '../components/AuthCard'
import { login } from '../lib/auth'
import { setCurrentUserFromEmployee } from '../lib/currentUser'
import { authApi } from '../lib/api'

// 「ログイン情報を保存する」で記憶するキー（IDのみ保存・パスワードは保存しない）
const SAVED_ID_KEY = 'izumi.savedLoginId'

export default function LoginPage() {
  const navigate = useNavigate()
  const [id, setId] = useState('')
  const [pw, setPw] = useState('')
  const [remember, setRemember] = useState(false)
  const [error, setError] = useState('')

  // 起動時に保存済みのログインIDを復元
  useEffect(() => {
    const saved = localStorage.getItem(SAVED_ID_KEY)
    if (saved) {
      setId(saved)
      setRemember(true)
    }
  }, [])

  const [submitting, setSubmitting] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (id.trim() === '' || pw.trim() === '') {
      setError('ログインIDとパスワードを入力してください。')
      return
    }
    setSubmitting(true)
    try {
      // 社員マスタで認証（社員番号＝ログインID ＋ パスワード）
      const employee = await authApi.login(id, pw)
      // ログイン情報の保存（IDのみ）
      if (remember) {
        localStorage.setItem(SAVED_ID_KEY, id)
      } else {
        localStorage.removeItem(SAVED_ID_KEY)
      }
      login()
      setCurrentUserFromEmployee(employee)
      navigate('/dashboard')
    } catch (err: any) {
      setError(err.message || 'ログインに失敗しました。')
    } finally {
      setSubmitting(false)
    }
  }

  const ready = id.trim() !== '' && pw.trim() !== ''

  return (
    <AuthCard title="すごメカ">
      <form onSubmit={onSubmit}>
        <AuthField label="社員番号" value={id} onChange={setId} autoComplete="username" />
        <AuthField
          label="パスワード"
          type="password"
          value={pw}
          onChange={setPw}
          autoComplete="current-password"
        />

        <label className="mb-5 flex items-center justify-center gap-2 text-xs font-bold tracking-[0.36px] text-white">
          <input
            type="checkbox"
            checked={remember}
            onChange={(e) => setRemember(e.target.checked)}
            className="h-4 w-4 accent-brand-light"
          />
          ログイン情報を保存する
        </label>

        {error && (
          <p className="mb-3 text-center text-xs font-bold text-danger">{error}</p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className={`mx-auto block w-40 rounded-[5px] py-1.5 text-xs font-bold text-white transition-colors disabled:opacity-60 ${
            ready ? 'bg-brand hover:bg-brand-deep' : 'bg-disabled hover:brightness-95'
          }`}
        >
          {submitting ? 'ログイン中…' : 'ログイン'}
        </button>

        <Link
          to="/password-reset"
          className="mt-6 block text-center text-sm font-bold tracking-[0.42px] text-white underline-offset-4 hover:underline"
        >
          ID・パスワードを忘れた方はこちら
        </Link>
      </form>
    </AuthCard>
  )
}
