import type { Employee } from './api'

// 作業待ちメンバーを保存済み並び順(employeeId配列)で並べ替える。
// members が「本来（既定）の順」。並べ替え結果が既定と一致する場合は manual=false（＝手動表記を消す）。
export function orderWaiting(
  members: Employee[],
  savedIds: number[] | null | undefined,
): { list: Employee[]; manual: boolean } {
  if (!savedIds || savedIds.length === 0) return { list: members, manual: false }
  const pos = new Map(savedIds.map((id, i) => [id, i]))
  const rank = (id: number) => (pos.has(id) ? (pos.get(id) as number) : Number.MAX_SAFE_INTEGER)
  const list = [...members].sort((a, b) => rank(a.id) - rank(b.id))
  // 既定順（members）と1つでも位置が違えば手動並び替え扱い
  const manual = list.some((e, i) => members[i]?.id !== e.id)
  return { list, manual }
}

// 2つのメンバー配列（idの並び）が完全一致するか
export function sameOrder(a: Employee[], b: Employee[]): boolean {
  if (a.length !== b.length) return false
  return a.every((e, i) => e.id === b[i]?.id)
}

// 配列の from → to へ要素を移動した新配列を返す
export function reorder<T>(arr: T[], from: number, to: number): T[] {
  const a = [...arr]
  const [moved] = a.splice(from, 1)
  a.splice(to, 0, moved)
  return a
}
