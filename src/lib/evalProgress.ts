// 自己評価/管理者評価の押印状態を保存・集計するユーティリティ
// （評価実績の本格的なDB保存は今後対応。現状はブラウザ内 localStorage で共有）
const KEY = 'izumi.evalStamps'

// 押印キーの集合を読み込み（キー形式: `${itemId}-${kind}-${i}` kind: self|admin）
export function loadStampSet(): Set<string> {
  try {
    const a = JSON.parse(localStorage.getItem(KEY) || '[]')
    return new Set(Array.isArray(a) ? a : [])
  } catch {
    return new Set()
  }
}

export function saveStampSet(s: Set<string>) {
  localStorage.setItem(KEY, JSON.stringify([...s]))
}

// DBの評価実績（{itemId,kind,idx}[]）を、押印キー集合（`${itemId}-${kind}-${idx}`）に変換
export function stampsToSet(list: { itemId: number; kind: string; idx: number }[]): Set<string> {
  return new Set(list.map((s) => `${s.itemId}-${s.kind}-${s.idx}`))
}

// 評価実績を、カウント種別の現在回数マップ（`${itemId}-${kind}-${idx}` → count）に変換
export function countsToMap(list: { itemId: number; kind: string; idx: number; count?: number }[]): Map<string, number> {
  return new Map(list.map((s) => [`${s.itemId}-${s.kind}-${s.idx}`, s.count ?? 0]))
}

// 優先フラグ（研修項目IDの集合）。自己評価画面の「優先」列の星ON/OFF。
const PRIORITY_KEY = 'izumi.priorityStars'

export function loadPrioritySet(): Set<number> {
  try {
    const a = JSON.parse(localStorage.getItem(PRIORITY_KEY) || '[]')
    return new Set(Array.isArray(a) ? a : [])
  } catch {
    return new Set()
  }
}

export function savePrioritySet(s: Set<number>) {
  localStorage.setItem(PRIORITY_KEY, JSON.stringify([...s]))
}

// 研修項目が「管理者評価まで」完了しているか判定。
// セクションに管理者評価の列があれば、その全列で完了。無ければ自己評価の全列で完了。
// 各列の達成判定: カウント種別は現在回数≧目標回数、それ以外は押印済み。
export function isItemEvaluated(
  itemId: number,
  section: any,
  stamps: Set<string>,
  counts?: Map<string, number>,
): boolean {
  const kind = [1, 2, 3].some((i) => section[`adminEval${i}Flag`]) ? 'admin' : 'self'
  const idxs =
    kind === 'admin'
      ? [1, 2, 3].filter((i) => section[`adminEval${i}Flag`])
      : [1, 2].filter((i) => section[`selfEval${i}Flag`])
  if (idxs.length === 0) return false
  return idxs.every((i) => {
    const key = `${itemId}-${kind}-${i}`
    if (section[`${kind}Eval${i}Type`] === 'カウント') {
      const target = Math.max(1, section[`${kind}Eval${i}Count`] || 0)
      return (counts?.get(key) ?? 0) >= target
    }
    return stamps.has(key)
  })
}

// 研修項目が「全て合格」か（点数一覧の1点判定）。
// 自己評価・管理者評価の“有効な全列”が合格していれば true。
// 合格判定: カウント種別は現在回数≧目標回数、それ以外（印/チェック/点数/手順書採点）は押印済み。
// ※手順書採点は全ポイント合格時のみ管理者評価スタンプがONになるため、押印済み＝合格。
export function isItemAllPassed(
  itemId: number,
  section: any,
  stamps: Set<string>,
  counts?: Map<string, number>,
): boolean {
  const cols: { kind: 'self' | 'admin'; i: number }[] = [
    ...[1, 2].filter((i) => section[`selfEval${i}Flag`]).map((i) => ({ kind: 'self' as const, i })),
    ...[1, 2, 3].filter((i) => section[`adminEval${i}Flag`]).map((i) => ({ kind: 'admin' as const, i })),
  ]
  if (cols.length === 0) return false
  return cols.every(({ kind, i }) => {
    const key = `${itemId}-${kind}-${i}`
    if (section[`${kind}Eval${i}Type`] === 'カウント') {
      const target = Math.max(1, section[`${kind}Eval${i}Count`] || 0)
      return (counts?.get(key) ?? 0) >= target
    }
    return stamps.has(key)
  })
}
