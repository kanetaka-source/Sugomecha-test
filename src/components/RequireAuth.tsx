import { Navigate } from 'react-router-dom'
import { isAuthenticated } from '../lib/auth'

/** 未ログインならログイン画面へリダイレクトするルートガード */
export function RequireAuth({ children }: { children: React.ReactNode }) {
  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />
  }
  return <>{children}</>
}
