// 擬似ログイン用の最小限の認証状態管理（localStorage 保持）
// TODO: 本番では実際の認証API・トークン管理に置き換える
const AUTH_KEY = 'izumi.auth'

/** ログイン状態にする */
export function login() {
  localStorage.setItem(AUTH_KEY, '1')
}

/** ログアウトする */
export function logout() {
  localStorage.removeItem(AUTH_KEY)
  localStorage.removeItem('izumi.currentUser') // ログイン中の社員情報も破棄
}

/** ログイン済みかどうか */
export function isAuthenticated(): boolean {
  return localStorage.getItem(AUTH_KEY) === '1'
}
