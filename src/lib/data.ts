export type MasterBadge = { label: string; active: boolean }
export type SpecialBadge = { label: string; active: boolean }
export type TrainingItem = {
  id: string
  category: string   // 例: 大型
  current: number    // 現在 pt
  total: number      // 目標 pt
}

export const masterBadges: MasterBadge[] = [
  { label: '大型', active: true },
  { label: '小型', active: false },
  { label: '電装', active: false },
  { label: '車体', active: false },
  { label: '塗装', active: false },
]

export const specialBadges: SpecialBadge[] = [
  { label: '評価者', active: true },
  { label: '2階級制覇', active: false },
  { label: '3階級制覇', active: false },
  { label: '4階級制覇', active: false },
  { label: '全階級制覇', active: false },
]

export const totalPoint = { current: 45, total: 250 }

export const trainingItems: TrainingItem[] = Array.from({ length: 6 }, (_, i) => ({
  id: `t${i + 1}`,
  category: '大型',
  current: 10,
  total: 39,
}))

// 自己評価画面用モックデータ。後で API に差し替え。
export type EvalRow = {
  priority: boolean        // 優先（★）
  no: string               // No 列の区分
  content: string          // 内容
  selfEval: string | null  // 自己評価の押印名（null は未押印）
  secondEval: string | null // 2次評価の押印名（null は未押印）
}

// STEP タブ（左側）。activeStep が現在の段階
export const trainingSteps = ['STEP1', 'STEP2', 'STEP3', 'STEP4', 'STEP5', 'STEP6']

export const selfEvalRows: EvalRow[] = [
  { priority: true,  no: 'ミッション', content: 'ブーツ及び/本体取替　作業確認', selfEval: '樫原', secondEval: null },
  { priority: false, no: 'ミッション', content: 'ブーツ及び/本体取替　作業確認', selfEval: '樫原', secondEval: null },
  { priority: false, no: 'ミッション', content: 'ブーツ及び/本体取替　作業確認', selfEval: '樫原', secondEval: null },
  { priority: true,  no: 'ミッション', content: 'ブーツ及び/本体取替　作業確認', selfEval: '樫原', secondEval: null },
  { priority: false, no: 'ミッション', content: 'ブーツ及び/本体取替　作業確認', selfEval: '樫原', secondEval: null },
  { priority: false, no: 'ミッション', content: 'ブーツ及び/本体取替　作業確認', selfEval: '樫原', secondEval: null },
  { priority: false, no: 'ミッション', content: 'ブーツ及び/本体取替　作業確認', selfEval: '樫原', secondEval: null },
  { priority: false, no: 'ミッション', content: 'ブーツ及び/本体取替　作業確認', selfEval: '樫原', secondEval: null },
  { priority: false, no: 'ミッション', content: 'ブーツ及び/本体取替　作業確認', selfEval: '樫原', secondEval: null },
]

// 成績（棒グラフ集計）用モックデータ。後で API に差し替え。
export type BarDatum = { label: string; value: number }

// カテゴリ別 獲得ポイント
export const categoryPoints: BarDatum[] = [
  { label: '大型', value: 45 },
  { label: '小型', value: 32 },
  { label: '電装', value: 18 },
  { label: '車体', value: 27 },
  { label: '塗装', value: 12 },
]

// 月別 評価件数
export const monthlyEvaluations: BarDatum[] = [
  { label: '1月', value: 4 },
  { label: '2月', value: 7 },
  { label: '3月', value: 5 },
  { label: '4月', value: 9 },
  { label: '5月', value: 6 },
  { label: '6月', value: 11 },
]
