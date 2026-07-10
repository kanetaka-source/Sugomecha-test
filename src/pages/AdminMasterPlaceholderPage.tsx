import { Link, useParams } from 'react-router-dom'

// スラッグ → 日本語名（管理者メニューの各マスタ画面。順次実装していく）
const TITLES: Record<string, string> = {
  machi: '待ち人数',
  hikki: '筆記試験',
  'hikki-shinsei': '筆記試験申請',
  tensu: '点数一覧',
  shain: '社員マスタ',
  'kenshu-master': '研修マスタ',
  'kenshu-course': '研修コースマスタ',
  'kenshu-section': '研修セクションマスタ',
  'kenshu-item': '研修項目マスタ',
  'kenshu-material': '研修教材マスタ',
  'shikaku-master': '資格マスタ',
  kengen: '権限マスタ',
  'hoyu-shikaku': '保有資格マスタ',
  kyoten: '拠点マスタ',
  bumon: '部門マスタ',
}

export default function AdminMasterPlaceholderPage() {
  const { section = '' } = useParams()
  const title = TITLES[section] ?? section

  return (
    <div>
      <h1 className="mb-4 text-lg font-bold text-ink2">{title}</h1>
      <div className="card-grad grid min-h-[40vh] place-items-center bg-surface/50 p-8 text-center">
        <div>
          <p className="text-sm font-bold text-muted">この画面（{title}）は準備中です。</p>
          <p className="mt-1 text-xs text-muted">
            バックエンド連携と合わせて順次実装していきます。
          </p>
          <Link
            to="/admin"
            className="mt-5 inline-block rounded-md bg-brand px-4 py-1.5 text-xs font-bold text-white hover:bg-brand-deep"
          >
            メニューに戻る
          </Link>
        </div>
      </div>
    </div>
  )
}
