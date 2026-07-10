// ログイン中の社員（申請者）を保持する。
// 擬似ログインのため、ログインID＝社員番号として社員に紐づける。
// 一致する社員がいなければ先頭の社員にフォールバック（テスト用）。
import type { Employee } from './api'

const KEY = 'izumi.currentUser'

export type CurrentUser = { id: number; employeeNo: string; name: string }

export function getCurrentUser(): CurrentUser | null {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || 'null')
    return v && typeof v.id === 'number' ? v : null
  } catch {
    return null
  }
}

// 認証済みの社員をログインユーザーとして保存
export function setCurrentUserFromEmployee(e: Employee): CurrentUser {
  const user: CurrentUser = { id: e.id, employeeNo: e.employeeNo, name: e.name }
  localStorage.setItem(KEY, JSON.stringify(user))
  return user
}

export function clearCurrentUser() {
  localStorage.removeItem(KEY)
}
