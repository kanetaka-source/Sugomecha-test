// 簡易インラインSVGアイコン。最終的にはFigmaから書き出したSVGに差し替え可。
type P = { className?: string }

export const Crown = ({ className }: P) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor">
    <path d="M3 8l3.5 3L12 5l5.5 6L21 8l-1.5 9h-15L3 8zm1.7 11h14.6v1.5H4.7V19z" />
  </svg>
)

export const Medal = ({ className }: P) => (
  <svg viewBox="0 0 24 24" className={className} fill="none">
    <path d="M8 2h8l-2.2 7H10.2L8 2z" fill="#e23b3b" />
    <circle cx="12" cy="15" r="6" fill="currentColor" />
    <circle cx="12" cy="15" r="6" stroke="#fff" strokeWidth="1.2" />
    <path d="M12 12l1.1 2.2 2.4.3-1.8 1.7.5 2.4-2.2-1.2-2.2 1.2.5-2.4-1.8-1.7 2.4-.3L12 12z" fill="#fff" />
  </svg>
)

export const Truck = ({ className }: P) => (
  <svg viewBox="0 0 48 30" className={className} fill="currentColor">
    <path d="M2 6h26v14H2zM28 11h9l5 5v4H28zM2 20h44" stroke="currentColor" strokeWidth="2" fill="none" />
    <circle cx="12" cy="24" r="4" /><circle cx="36" cy="24" r="4" />
  </svg>
)

export const IconHome = ({ className }: P) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8">
    <path d="M3 11l9-7 9 7M5 10v10h14V10" strokeLinejoin="round" />
  </svg>
)
export const IconClipboard = ({ className }: P) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8">
    <rect x="5" y="4" width="14" height="17" rx="2" /><path d="M9 4h6v3H9z" /><path d="M8 11h8M8 15h6" />
  </svg>
)
export const IconUsers = ({ className }: P) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8">
    <circle cx="9" cy="8" r="3" /><circle cx="17" cy="9" r="2.4" /><path d="M3 20c0-3 3-5 6-5s6 2 6 5M15 20c0-2 .8-3.5 2-4" />
  </svg>
)
export const IconChart = ({ className }: P) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8">
    <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" strokeLinecap="round" />
  </svg>
)
export const IconBadge = ({ className }: P) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8">
    <circle cx="12" cy="9" r="5" /><path d="M9 13l-1.5 7L12 18l4.5 2L15 13" />
  </svg>
)
export const IconReport = ({ className }: P) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8">
    <rect x="5" y="3" width="14" height="18" rx="2" /><path d="M9 8h6M9 12h6M9 16h4" />
  </svg>
)
export const IconSelfEval = ({ className }: P) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8">
    <rect x="6" y="3" width="12" height="18" rx="2" /><path d="M10 18h4" />
  </svg>
)
export const IconLogout = ({ className }: P) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8">
    <path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M10 17l5-5-5-5M15 12H3" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)
// --- Figma書き出しのトレーニング系アイコン（currentColorで色制御） ---
// 自己評価: 開いた本
export const IconBook = ({ className }: P) => (
  <svg viewBox="0 0 9.66667 11.6667" className={className} fill="none">
    <path
      d="M0.833333 9.58333V2.08333C0.833333 1.75181 0.965029 1.43387 1.19945 1.19945C1.43387 0.965029 1.75181 0.833333 2.08333 0.833333H8.33333C8.46594 0.833333 8.59312 0.886012 8.68689 0.97978C8.78066 1.07355 8.83333 1.20073 8.83333 1.33333V10.3333C8.83333 10.4659 8.78066 10.5931 8.68689 10.6869C8.59312 10.7807 8.46594 10.8333 8.33333 10.8333H2.08333C1.75181 10.8333 1.43387 10.7016 1.19945 10.4672C0.965029 10.2328 0.833333 9.91485 0.833333 9.58333ZM0.833333 9.58333C0.833333 9.25181 0.965029 8.93387 1.19945 8.69945C1.43387 8.46503 1.75181 8.33333 2.08333 8.33333H8.83333"
      stroke="currentColor" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round"
    />
  </svg>
)
// 作業待ち: 人の集まり
export const IconUserCrowd = ({ className }: P) => (
  <svg viewBox="0 0 10.5 9" className={className} fill="currentColor">
    <path fillRule="evenodd" clipRule="evenodd" d="M0.89625 1.57875C0.89625 1.37143 0.937086 1.16613 1.01643 0.974589C1.09576 0.783046 1.21205 0.609006 1.35866 0.462405C1.50526 0.315805 1.6793 0.199515 1.87084 0.120175C2.06238 0.0408355 2.26768 0 2.475 0C2.68232 0 2.88762 0.0408355 3.07916 0.120175C3.2707 0.199515 3.44474 0.315805 3.59134 0.462405C3.73795 0.609006 3.85424 0.783046 3.93357 0.974589C4.01291 1.16613 4.05375 1.37143 4.05375 1.57875C4.05375 1.99746 3.88742 2.39902 3.59134 2.69509C3.29527 2.99117 2.89371 3.1575 2.475 3.1575C2.05629 3.1575 1.65473 2.99117 1.35866 2.69509C1.06258 2.39902 0.89625 1.99746 0.89625 1.57875ZM6.52125 1.57875C6.52125 1.16004 6.68758 0.758478 6.98366 0.462405C7.27973 0.166332 7.68129 0 8.1 0C8.51871 0 8.92027 0.166332 9.21634 0.462405C9.51242 0.758478 9.67875 1.16004 9.67875 1.57875C9.67875 1.99746 9.51242 2.39902 9.21634 2.69509C8.92027 2.99117 8.51871 3.1575 8.1 3.1575C7.68129 3.1575 7.27973 2.99117 6.98366 2.69509C6.68758 2.39902 6.52125 1.99746 6.52125 1.57875ZM3.67125 3.82875C3.67125 3.41004 3.83758 3.00848 4.13366 2.71241C4.42973 2.41633 4.83129 2.25 5.25 2.25C5.66871 2.25 6.07027 2.41633 6.36634 2.71241C6.66242 3.00848 6.82875 3.41004 6.82875 3.82875C6.82875 4.24746 6.66242 4.64902 6.36634 4.9451C6.07027 5.24117 5.66871 5.4075 5.25 5.4075C4.83129 5.4075 4.42973 5.24117 4.13366 4.9451C3.83758 4.64902 3.67125 4.24746 3.67125 3.82875ZM3 3.6H1.875C1.37772 3.6 0.900806 3.79754 0.549175 4.14917C0.197544 4.50081 0 4.97772 0 5.475V6.375H3V3.6ZM7.5 3.6H8.625C9.12228 3.6 9.59919 3.79754 9.95083 4.14917C10.3025 4.50081 10.5 4.97772 10.5 5.475V6.375H7.5V3.6ZM2.775 7.725C2.775 7.22772 2.97254 6.75081 3.32417 6.39917C3.67581 6.04754 4.15272 5.85 4.65 5.85H5.85C6.34728 5.85 6.82419 6.04754 7.17583 6.39917C7.52746 6.75081 7.725 7.22772 7.725 7.725V9H2.775V7.725Z" />
  </svg>
)
// 進捗状況: 円（パイ）
export const IconProgress = ({ className }: P) => (
  <svg viewBox="0 0 11.25 11.25" className={className} fill="none">
    <path d="M5.625 10.625C8.38642 10.625 10.625 8.38642 10.625 5.625C10.625 2.86358 8.38642 0.625 5.625 0.625C2.86358 0.625 0.625 2.86358 0.625 5.625C0.625 8.38642 2.86358 10.625 5.625 10.625Z" stroke="currentColor" strokeWidth="1.25" />
    <path d="M5.625 1.875C6.36668 1.875 7.0917 2.09493 7.70839 2.50699C8.32507 2.91904 8.80572 3.50471 9.08955 4.18994C9.37338 4.87516 9.44764 5.62916 9.30295 6.35659C9.15825 7.08402 8.8011 7.7522 8.27665 8.27665C7.7522 8.8011 7.08402 9.15825 6.35659 9.30295C5.62916 9.44764 4.87516 9.37338 4.18994 9.08955C3.50471 8.80572 2.91904 8.32507 2.50699 7.70839C2.09493 7.0917 1.875 6.36668 1.875 5.625H5.625V1.875Z" fill="currentColor" />
  </svg>
)
// 中央: 車両
export const IconVehicle = ({ className }: P) => (
  <svg viewBox="0 0 50 30" className={className} fill="currentColor">
    <path d="M34.0909 0H21.5909V10H0V22.5H4.54545C4.54545 24.4891 5.2638 26.3968 6.54245 27.8033C7.82111 29.2098 9.55534 30 11.3636 30C13.1719 30 14.9062 29.2098 16.1848 27.8033C17.4635 26.3968 18.1818 24.4891 18.1818 22.5H31.8182C31.8182 24.4891 32.5365 26.3968 33.8152 27.8033C35.0938 29.2098 36.8281 30 38.6364 30C40.4447 30 42.1789 29.2098 43.4575 27.8033C44.7362 26.3968 45.4545 24.4891 45.4545 22.5H50V15C50 12.225 47.9773 10 45.4545 10H40.9091L34.0909 0ZM25 3.75H32.9545L37.4091 10H25V3.75ZM11.3636 18.75C12.2678 18.75 13.1349 19.1451 13.7742 19.8483C14.4136 20.5516 14.7727 21.5054 14.7727 22.5C14.7727 23.4946 14.4136 24.4484 13.7742 25.1516C13.1349 25.8549 12.2678 26.25 11.3636 26.25C10.4595 26.25 9.59237 25.8549 8.95304 25.1516C8.31372 24.4484 7.95455 23.4946 7.95455 22.5C7.95455 21.5054 8.31372 20.5516 8.95304 19.8483C9.59237 19.1451 10.4595 18.75 11.3636 18.75ZM38.6364 18.75C39.5405 18.75 40.4076 19.1451 41.047 19.8483C41.6863 20.5516 42.0455 21.5054 42.0455 22.5C42.0455 23.4946 41.6863 24.4484 41.047 25.1516C40.4076 25.8549 39.5405 26.25 38.6364 26.25C37.7322 26.25 36.8651 25.8549 36.2258 25.1516C35.5864 24.4484 35.2273 23.4946 35.2273 22.5C35.2273 21.5054 35.5864 20.5516 36.2258 19.8483C36.8651 19.1451 37.7322 18.75 38.6364 18.75Z" />
  </svg>
)
// --- 管理者画面用アイコン ---
// 筆記試験: 鉛筆
export const IconPencil = ({ className }: P) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 20h4L19 9l-4-4L4 16v4z" />
    <path d="M14 6l4 4" />
  </svg>
)
// 筆記試験マスタ: 用紙＋○×
export const IconExam = ({ className }: P) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="4" y="3" width="16" height="18" rx="2" />
    <circle cx="9" cy="9" r="2" />
    <path d="M14.5 7.5l3 3M17.5 7.5l-3 3" />
    <path d="M7 15h10M7 18h6" />
  </svg>
)
// 警告: 三角＋!
export const IconAlert = ({ className }: P) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 3 2 20h20L12 3z" />
    <path d="M12 10v4" />
    <circle cx="12" cy="17" r="0.7" fill="currentColor" stroke="none" />
  </svg>
)
// 点数: 折れ線グラフ
export const IconGraphLine = ({ className }: P) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 4v16h16" />
    <path d="M7 14l3.5-4 3 3L20 8" />
  </svg>
)
// 社員マスタ: 社員（人＋ID）
export const IconEmployee = ({ className }: P) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="10" cy="8" r="3.2" />
    <path d="M4 19.5c0-3.3 2.7-5.5 6-5.5" />
    <rect x="13.5" y="13.5" width="6.5" height="5" rx="1" />
    <path d="M15.5 16h2.5" />
  </svg>
)
// 資格マスタ: IDカード
export const IconIdCard = ({ className }: P) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="5" width="18" height="14" rx="2" />
    <circle cx="8.5" cy="11" r="2" />
    <path d="M5.5 16c.5-1.4 1.7-2 3-2s2.5.6 3 2" />
    <path d="M14 10h4M14 13.5h4" />
  </svg>
)
// 拠点マスタ: 城（拠点）
export const IconCastle = ({ className }: P) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor">
    <path d="M3 21v-9l2.5 1.2V9l3 1.4V8l3 1.4V8l3-1.4v3.8L20 9v3.2L22 11v10h-7v-4.5a1.5 1.5 0 0 0-3 0V21H3z" />
  </svg>
)
// 拠点マスタ: オフィスビル
export const IconBuilding = ({ className }: P) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 21h18" />
    <rect x="5" y="3" width="9" height="18" />
    <rect x="14" y="8" width="5" height="13" />
    <path d="M8 7h3M8 11h3M8 15h3M16.5 11h.01M16.5 15h.01" />
  </svg>
)
// 部門マスタ: 組織図（階層）
export const IconOrgChart = ({ className }: P) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="9" y="3" width="6" height="4" rx="1" />
    <rect x="3" y="16" width="6" height="4" rx="1" />
    <rect x="15" y="16" width="6" height="4" rx="1" />
    <path d="M12 7v4M6 16v-2h12v2M12 12v2" />
  </svg>
)
// 社員マスタ: 人物（社員）
export const IconUser = ({ className }: P) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="8" r="4" />
    <path d="M5 20c0-3.9 3.1-7 7-7s7 3.1 7 7" />
  </svg>
)
// --- 研修コース用アイコン（大型車/小型車/電装系/車体/塗装） ---
// 大型車（トラック）
export const IconCarLarge = ({ className }: P) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 6h11v9H2z" />
    <path d="M13 9h4l3 3v3h-7z" />
    <circle cx="7" cy="17.5" r="1.8" />
    <circle cx="17" cy="17.5" r="1.8" />
  </svg>
)
// 小型車（乗用車）
export const IconCarSmall = ({ className }: P) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 14l2-5a2 2 0 0 1 1.9-1.3h10.2A2 2 0 0 1 19 9l2 5" />
    <path d="M3 14h18v3H3z" />
    <circle cx="7" cy="17.5" r="1.6" />
    <circle cx="17" cy="17.5" r="1.6" />
  </svg>
)
// 電装系（稲妻）
export const IconElectrical = ({ className }: P) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor">
    <path d="M13 2L4 14h6l-1 8 9-12h-6l1-8z" />
  </svg>
)
// 車体（ボディ・シャーシ）
export const IconCarBody = ({ className }: P) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 12l2.5-5.5A2 2 0 0 1 7.3 5h9.4a2 2 0 0 1 1.8 1.5L21 12v5H3z" />
    <path d="M3 12h18" />
    <path d="M8 5v7M16 5v7" />
  </svg>
)
// 塗装（ペイントローラー）
export const IconPaint = ({ className }: P) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <rect x="4" y="4" width="13" height="6" rx="1" />
    <path d="M17 7h2.5a1.5 1.5 0 0 1 1.5 1.5V11a1.5 1.5 0 0 1-1.5 1.5H12a1.5 1.5 0 0 0-1.5 1.5V16" />
    <rect x="8.5" y="16" width="4" height="5" rx="1" />
  </svg>
)
// 研修コースマスタ: 卒業帽
export const IconGradCap = ({ className }: P) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 9l10-5 10 5-10 5L2 9z" />
    <path d="M6 11v5c0 1.4 2.7 2.8 6 2.8s6-1.4 6-2.8v-5" />
    <path d="M22 9v4.5" />
  </svg>
)
// 研修セクションマスタ: 区切られたセクション
export const IconSection = ({ className }: P) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="6" rx="1.5" />
    <rect x="3" y="14" width="18" height="6" rx="1.5" />
  </svg>
)
// 研修項目マスタ: チェックリスト
export const IconChecklist = ({ className }: P) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10 6h10M10 12h10M10 18h10" />
    <path d="M3.5 6l1.3 1.3L7.3 4.8" />
    <path d="M3.5 12l1.3 1.3L7.3 10.8" />
    <path d="M3.5 18l1.3 1.3L7.3 16.8" />
  </svg>
)
// 研修教材マスタ: 教材（書類）
export const IconMaterial = ({ className }: P) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 3h8l4 4v14H6z" />
    <path d="M14 3v4h4" />
    <path d="M9 13h6M9 16.5h4" />
  </svg>
)
// 権限マスタ: 盾＋チェック
export const IconShieldCheck = ({ className }: P) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 3l7 3v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3z" />
    <path d="M9 12l2 2 4-4" />
  </svg>
)
// 保有資格マスタ: 勲章（リボン付き）
export const IconCertificate = ({ className }: P) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="9" r="5" />
    <path d="M9 13.3L7.5 21l4.5-2.6L16.5 21 15 13.3" />
    <path d="M12 6.8v2.4l1.6 1" />
  </svg>
)
// 優先スター。filled は光沢のあるグラデーション＋ドロップシャドウで立体的に。
// 非優先はグレーの輪郭（currentColor）。
const starPath =
  'M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z'
export const IconStar = ({ className, filled }: P & { filled?: boolean }) => (
  <svg
    viewBox="0 0 24 24"
    className={className}
    fill={filled ? 'url(#starGrad)' : 'none'}
    stroke={filled ? 'url(#starEdge)' : 'currentColor'}
    strokeWidth={filled ? 0.7 : 1.6}
    style={filled ? { filter: 'drop-shadow(0 1.5px 1.2px rgba(40,30,80,0.45))' } : undefined}
  >
    {filled && (
      <defs>
        {/* 上を明るく、下を濃くして光沢・立体感を出す */}
        <linearGradient id="starGrad" x1="0.3" y1="0" x2="0.7" y2="1">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.9" />
          <stop offset="28%" stopColor="var(--grad-from)" />
          <stop offset="100%" stopColor="var(--grad-to)" />
        </linearGradient>
        {/* 縁取りで形を引き締める */}
        <linearGradient id="starEdge" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="var(--grad-from)" />
          <stop offset="100%" stopColor="var(--grad-to)" />
        </linearGradient>
      </defs>
    )}
    {/* 本体 */}
    <path d={starPath} strokeLinejoin="round" />
    {/* 上部のハイライト（つや） */}
    {filled && (
      <path
        d="M12 4.2 9.9 9.1 6 9.5l3.2 1.6z"
        fill="#ffffff"
        fillOpacity="0.55"
        stroke="none"
      />
    )}
  </svg>
)
export const Heart = ({ className }: P) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor">
    <path d="M12 21s-7-4.6-9.3-9C1 8.6 2.7 5 6.2 5 8.4 5 10 6.6 12 8.6 14 6.6 15.6 5 17.8 5c3.5 0 5.2 3.6 3.5 7-2.3 4.4-9.3 9-9.3 9z" />
  </svg>
)

// 研修コースに設定できるアイコン候補（研修メニュー表示用）
export const COURSE_ICONS: { key: string; label: string; Icon: (p: P) => JSX.Element }[] = [
  { key: 'large', label: '大型車', Icon: IconCarLarge },
  { key: 'small', label: '小型車', Icon: IconCarSmall },
  { key: 'electrical', label: '電装系', Icon: IconElectrical },
  { key: 'body', label: '車体', Icon: IconCarBody },
  { key: 'paint', label: '塗装', Icon: IconPaint },
]

// キーからアイコン定義を取得
export const getCourseIcon = (key: string | null) => COURSE_ICONS.find((c) => c.key === key)
