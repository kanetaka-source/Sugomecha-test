// APIクライアント。画面は /api 経由でローカルのAPIサーバー(3001)とやり取りする。
// （Vite の proxy 設定で 5173 → 3001 へ転送される）

export type Location = {
  id: number
  name: string
  note: string | null
  sortOrder: number
  memberCount: number // 拠点所属数（社員数の自動集計）
  createdAt: string
  updatedAt: string
}

export type LocationInput = { name: string; note: string }

async function handle(res: Response) {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error || `通信エラー (${res.status})`)
  }
  return res.status === 204 ? null : res.json()
}

const jsonHeaders = { 'Content-Type': 'application/json' }

// 拠点マスタ
export const locationsApi = {
  list: (): Promise<Location[]> => fetch('/api/locations').then(handle),
  create: (data: LocationInput): Promise<Location> =>
    fetch('/api/locations', { method: 'POST', headers: jsonHeaders, body: JSON.stringify(data) }).then(handle),
  update: (id: number, data: LocationInput): Promise<Location> =>
    fetch(`/api/locations/${id}`, { method: 'PUT', headers: jsonHeaders, body: JSON.stringify(data) }).then(handle),
  remove: (id: number): Promise<null> =>
    fetch(`/api/locations/${id}`, { method: 'DELETE' }).then(handle),
}

// 部門マスタ（拠点を紐づけ可能）
export type Department = {
  id: number
  name: string
  note: string | null
  sortOrder: number
  locationId: number | null
  location: { id: number; name: string } | null // 紐づく拠点
  memberCount: number // 部署所属数（社員数の自動集計）
  createdAt: string
  updatedAt: string
}

export type DepartmentInput = { name: string; note: string; locationId: number | null }

export const departmentsApi = {
  list: (): Promise<Department[]> => fetch('/api/departments').then(handle),
  create: (data: DepartmentInput): Promise<Department> =>
    fetch('/api/departments', { method: 'POST', headers: jsonHeaders, body: JSON.stringify(data) }).then(handle),
  update: (id: number, data: DepartmentInput): Promise<Department> =>
    fetch(`/api/departments/${id}`, { method: 'PUT', headers: jsonHeaders, body: JSON.stringify(data) }).then(handle),
  remove: (id: number): Promise<null> =>
    fetch(`/api/departments/${id}`, { method: 'DELETE' }).then(handle),
}

// 研修コースマスタ
export type TrainingCourse = {
  id: number
  name: string
  note: string | null
  icon: string | null // 研修メニュー表示用アイコン（large/small/electrical/body/paint）
  sortOrder: number
  sectionCount: number // 研修セクション数（自動集計）
  createdAt: string
  updatedAt: string
}

export type TrainingCourseInput = { name: string; note: string; icon: string }

export const trainingCoursesApi = {
  list: (): Promise<TrainingCourse[]> => fetch('/api/training-courses').then(handle),
  create: (data: TrainingCourseInput): Promise<TrainingCourse> =>
    fetch('/api/training-courses', { method: 'POST', headers: jsonHeaders, body: JSON.stringify(data) }).then(handle),
  update: (id: number, data: TrainingCourseInput): Promise<TrainingCourse> =>
    fetch(`/api/training-courses/${id}`, { method: 'PUT', headers: jsonHeaders, body: JSON.stringify(data) }).then(handle),
  remove: (id: number): Promise<null> =>
    fetch(`/api/training-courses/${id}`, { method: 'DELETE' }).then(handle),
}

// 研修セクションマスタ（フル：自己評価テーブルの列構成を定義）
// 評価の種別（列挙型。暫定の選択肢）。カウント=回数をタップして目標到達で達成。
export const EVAL_TYPES = ['印', 'チェック', '点数', 'カウント'] as const
export const EVAL_COUNT_MAX = 10 // カウント目標回数の上限

export type TrainingSection = {
  id: number
  name: string
  note: string | null
  sortOrder: number
  courseId: number | null
  course: { id: number; name: string } | null
  itemCount: number // 研修項目数（自動集計）
  header1Flag: boolean; header1Name: string | null
  header2Flag: boolean; header2Name: string | null
  header3Flag: boolean; header3Name: string | null
  header4Flag: boolean; header4Name: string | null
  header5Flag: boolean; header5Name: string | null
  selfEval1Flag: boolean; selfEval1Type: string | null; selfEval1Name: string | null; selfEval1Count: number
  selfEval2Flag: boolean; selfEval2Type: string | null; selfEval2Name: string | null; selfEval2Count: number
  adminEval1Flag: boolean; adminEval1Type: string | null; adminEval1Name: string | null; adminEval1Count: number
  adminEval2Flag: boolean; adminEval2Type: string | null; adminEval2Name: string | null; adminEval2Count: number
  adminEval3Flag: boolean; adminEval3Type: string | null; adminEval3Name: string | null; adminEval3Count: number
  examPassLine: number | null // 筆記試験の合格ライン（正答率％）
  createdAt: string
  updatedAt: string
}

// 登録/更新で送る入力（内部・集計項目を除く）
export type TrainingSectionInput = {
  name: string
  note: string
  sortOrder: number
  courseId: number | null
  header1Flag: boolean; header1Name: string
  header2Flag: boolean; header2Name: string
  header3Flag: boolean; header3Name: string
  header4Flag: boolean; header4Name: string
  header5Flag: boolean; header5Name: string
  selfEval1Flag: boolean; selfEval1Type: string; selfEval1Name: string; selfEval1Count: number
  selfEval2Flag: boolean; selfEval2Type: string; selfEval2Name: string; selfEval2Count: number
  adminEval1Flag: boolean; adminEval1Type: string; adminEval1Name: string; adminEval1Count: number
  adminEval2Flag: boolean; adminEval2Type: string; adminEval2Name: string; adminEval2Count: number
  adminEval3Flag: boolean; adminEval3Type: string; adminEval3Name: string; adminEval3Count: number
}

export const trainingSectionsApi = {
  list: (): Promise<TrainingSection[]> => fetch('/api/training-sections').then(handle),
  get: (id: number): Promise<TrainingSection> => fetch(`/api/training-sections/${id}`).then(handle),
  create: (data: TrainingSectionInput): Promise<TrainingSection> =>
    fetch('/api/training-sections', { method: 'POST', headers: jsonHeaders, body: JSON.stringify(data) }).then(handle),
  update: (id: number, data: TrainingSectionInput): Promise<TrainingSection> =>
    fetch(`/api/training-sections/${id}`, { method: 'PUT', headers: jsonHeaders, body: JSON.stringify(data) }).then(handle),
  remove: (id: number): Promise<null> =>
    fetch(`/api/training-sections/${id}`, { method: 'DELETE' }).then(handle),
}

// 研修項目マスタ（セクションに紐づく行データ。値1〜5はセクションの研修ヘッダーに対応）
export type TrainingItem = {
  id: number
  title: string
  note: string | null
  sortOrder: number
  sectionId: number | null
  section: { id: number; name: string; course: { id: number; name: string } | null } | null
  flag1: boolean; value1: string | null
  flag2: boolean; value2: string | null
  flag3: boolean; value3: string | null
  flag4: boolean; value4: string | null
  flag5: boolean; value5: string | null
  requiredQualifications: { id: number; name: string; category: string | null }[] // 必要資格
  createdAt: string
  updatedAt: string
}

export type TrainingItemInput = {
  title: string
  note: string
  sortOrder: number
  sectionId: number | null
  flag1: boolean; value1: string
  flag2: boolean; value2: string
  flag3: boolean; value3: string
  flag4: boolean; value4: string
  flag5: boolean; value5: string
  requiredQualificationIds: number[] // 必要資格（資格マスタのID）
}

export const trainingItemsApi = {
  list: (): Promise<TrainingItem[]> => fetch('/api/training-items').then(handle),
  get: (id: number): Promise<TrainingItem> => fetch(`/api/training-items/${id}`).then(handle),
  create: (data: TrainingItemInput): Promise<TrainingItem> =>
    fetch('/api/training-items', { method: 'POST', headers: jsonHeaders, body: JSON.stringify(data) }).then(handle),
  update: (id: number, data: TrainingItemInput): Promise<TrainingItem> =>
    fetch(`/api/training-items/${id}`, { method: 'PUT', headers: jsonHeaders, body: JSON.stringify(data) }).then(handle),
  remove: (id: number): Promise<null> =>
    fetch(`/api/training-items/${id}`, { method: 'DELETE' }).then(handle),
}

// 研修教材マスタ（研修項目に紐づく教材コンテンツ。詳細ブロック1〜8）
type DetailFields = {
  detail1Flag: boolean; detail1Title: string | null; detail1Content: string | null
  detail2Flag: boolean; detail2Title: string | null; detail2Content: string | null
  detail3Flag: boolean; detail3Title: string | null; detail3Content: string | null
  detail4Flag: boolean; detail4Title: string | null; detail4Content: string | null
  detail5Flag: boolean; detail5Title: string | null; detail5Content: string | null
  detail6Flag: boolean; detail6Title: string | null; detail6Content: string | null
  detail7Flag: boolean; detail7Title: string | null; detail7Content: string | null
  detail8Flag: boolean; detail8Title: string | null; detail8Content: string | null
}

// 手順書（工程と見るべきポイント）
export type ProcedureStep = { name: string; points: string[] }
export type Procedure = { stepHeader: string; pointHeader: string; steps: ProcedureStep[] }

export type TrainingMaterial = DetailFields & {
  id: number
  note: string | null
  sortOrder: number
  attachmentUrl: string | null
  procedure: Procedure | null
  itemId: number | null
  item: {
    id: number
    title: string
    section: { id: number; name: string; course: { id: number; name: string } | null } | null
  } | null
  createdAt: string
  updatedAt: string
}

type DetailInputFields = {
  detail1Flag: boolean; detail1Title: string; detail1Content: string
  detail2Flag: boolean; detail2Title: string; detail2Content: string
  detail3Flag: boolean; detail3Title: string; detail3Content: string
  detail4Flag: boolean; detail4Title: string; detail4Content: string
  detail5Flag: boolean; detail5Title: string; detail5Content: string
  detail6Flag: boolean; detail6Title: string; detail6Content: string
  detail7Flag: boolean; detail7Title: string; detail7Content: string
  detail8Flag: boolean; detail8Title: string; detail8Content: string
}

export type TrainingMaterialInput = DetailInputFields & {
  note: string
  sortOrder: number
  attachmentUrl: string
  procedure: Procedure
  itemId: number | null
}

export const trainingMaterialsApi = {
  list: (): Promise<TrainingMaterial[]> => fetch('/api/training-materials').then(handle),
  get: (id: number): Promise<TrainingMaterial> => fetch(`/api/training-materials/${id}`).then(handle),
  create: (data: TrainingMaterialInput): Promise<TrainingMaterial> =>
    fetch('/api/training-materials', { method: 'POST', headers: jsonHeaders, body: JSON.stringify(data) }).then(handle),
  update: (id: number, data: TrainingMaterialInput): Promise<TrainingMaterial> =>
    fetch(`/api/training-materials/${id}`, { method: 'PUT', headers: jsonHeaders, body: JSON.stringify(data) }).then(handle),
  remove: (id: number): Promise<null> =>
    fetch(`/api/training-materials/${id}`, { method: 'DELETE' }).then(handle),
}

// 資格マスタ
export const QUALIFICATION_CATEGORIES = ['国家資格', '民間資格', '社内資格'] as const

export type Qualification = {
  id: number
  name: string
  category: string | null
  createdAt: string
  updatedAt: string
}

export type QualificationInput = { name: string; category: string }

export const qualificationsApi = {
  list: (): Promise<Qualification[]> => fetch('/api/qualifications').then(handle),
  create: (data: QualificationInput): Promise<Qualification> =>
    fetch('/api/qualifications', { method: 'POST', headers: jsonHeaders, body: JSON.stringify(data) }).then(handle),
  update: (id: number, data: QualificationInput): Promise<Qualification> =>
    fetch(`/api/qualifications/${id}`, { method: 'PUT', headers: jsonHeaders, body: JSON.stringify(data) }).then(handle),
  remove: (id: number): Promise<null> =>
    fetch(`/api/qualifications/${id}`, { method: 'DELETE' }).then(handle),
}

// 権限マスタ（44種の画面権限。ユーザーごとに付与）
export const PERMISSION_GROUPS = [
  {
    title: '業務',
    items: [
      '自己評価', '研修詳細', '評価者', '採点',
      '保有資格登録', '保有資格一覧', '保有資格詳細',
      '仮免申請一覧', '作業待ち', '作業者登録', '作業待ち詳細', '代理入力',
      '筆記試験申請一覧', '筆記試験', '筆記試験採点結果',
      'プロフィール', '個人別進捗状況一覧', '店舗別進捗状況一覧', 'ランキング一覧',
    ],
  },
  {
    title: 'マスタ',
    items: [
      '社員マスタ一覧', '社員マスタ登録', '社員マスタ詳細',
      '拠点マスタ一覧', '拠点マスタ登録', '拠点マスタ詳細',
      '部門マスタ一覧', '部門マスタ登録', '部門マスタ詳細',
      '資格マスタ一覧', '資格マスタ登録', '資格マスタ詳細',
      '研修コースマスタ一覧', '研修コースマスタ登録', '研修コースマスタ詳細',
      '研修セクションマスタ一覧', '研修セクションマスタ登録', '研修セクションマスタ詳細',
      '研修項目マスタ一覧', '研修項目マスタ登録', '研修項目マスタ詳細',
      '研修教材マスタ登録', '研修教材マスタ詳細',
      '権限マスタ一覧', '権限マスタ詳細',
    ],
  },
] as const

export const ALL_PERMISSIONS: string[] = PERMISSION_GROUPS.flatMap((g) => [...g.items])

export type PermissionUser = {
  employeeId: number
  employeeNo: string
  name: string
  role: string
  departmentName: string | null
  locationName: string | null
  grantedCount: number
}

export type PermissionDetail = {
  employeeId: number
  employeeNo: string
  name: string
  role: string
  departmentName: string | null
  granted: string[]
}

export const permissionsApi = {
  list: (): Promise<PermissionUser[]> => fetch('/api/permissions').then(handle),
  get: (employeeId: number): Promise<PermissionDetail> =>
    fetch(`/api/permissions/${employeeId}`).then(handle),
  save: (employeeId: number, granted: string[]): Promise<{ employeeId: number; granted: string[] }> =>
    fetch(`/api/permissions/${employeeId}`, { method: 'PUT', headers: jsonHeaders, body: JSON.stringify({ granted }) }).then(handle),
}

// 保有資格マスタ（社員×資格。区分・有効期限は資格マスタから）
export type HeldQualUser = {
  employeeId: number
  employeeNo: string
  name: string
  role: string
  departmentName: string | null
  heldCount: number
}

export type HeldQualItem = {
  qualificationId: number
  name: string
  category: string | null
  acquiredDate: string | null
  validUntil: string | null
}

export type HeldQualDetail = {
  employeeId: number
  employeeNo: string
  name: string
  role: string
  departmentName: string | null
  held: HeldQualItem[]
}

export type HeldQualInput = { acquiredDate: string; validUntil: string }

export const heldQualificationsApi = {
  list: (): Promise<HeldQualUser[]> => fetch('/api/held-qualifications').then(handle),
  get: (employeeId: number): Promise<HeldQualDetail> =>
    fetch(`/api/held-qualifications/${employeeId}`).then(handle),
  add: (employeeId: number, qualificationId: number, data: HeldQualInput): Promise<{ ok: boolean }> =>
    fetch(`/api/held-qualifications/${employeeId}`, {
      method: 'POST',
      headers: jsonHeaders,
      body: JSON.stringify({ qualificationId, ...data }),
    }).then(handle),
  update: (employeeId: number, qualificationId: number, data: HeldQualInput): Promise<{ ok: boolean }> =>
    fetch(`/api/held-qualifications/${employeeId}/${qualificationId}`, {
      method: 'PUT',
      headers: jsonHeaders,
      body: JSON.stringify(data),
    }).then(handle),
  remove: (employeeId: number, qualificationId: number): Promise<null> =>
    fetch(`/api/held-qualifications/${employeeId}/${qualificationId}`, { method: 'DELETE' }).then(handle),
}

// 社員マスタ
export const EMPLOYEE_ROLES = ['受講者', '評価者', '管理者'] as const
export type EmployeeRole = (typeof EMPLOYEE_ROLES)[number]

export type Employee = {
  id: number
  employeeNo: string
  name: string
  role: string
  phone: string | null
  birthDate: string | null
  hireDate: string | null
  assignedDate: string | null
  departmentId: number | null
  // 所属部署（＋その拠点）
  department: { id: number; name: string; location: { id: number; name: string } | null } | null
  enrolledCourses: { id: number; name: string }[] // 履修コース（研修コースマスタ参照）
  createdAt: string
  updatedAt: string
}

export type EmployeeInput = {
  employeeNo: string
  name: string
  role: string
  phone: string
  birthDate: string
  hireDate: string
  assignedDate: string
  password: string
  departmentId: number | null
  enrolledCourseIds: number[] // 履修コース（研修コースマスタのID）
}

// 評価実績（押印）。社員ごとの自己評価/管理者評価。count はカウント種別の現在回数。
export type EvalStamp = { itemId: number; kind: 'self' | 'admin'; idx: number; count: number }

// ダッシュボード初期表示のまとめ取得（courses/sections/items/stamps/employee を1リクエストで）
export type DashboardBootstrap = {
  courses: TrainingCourse[]
  sections: TrainingSection[]
  items: TrainingItem[]
  stamps: (EvalStamp & { employeeId: number })[]
  employee: Employee | null
  notifications: NotificationItem[]
}
export const dashboardApi = {
  bootstrap: (employeeId?: number): Promise<DashboardBootstrap> =>
    fetch(`/api/dashboard-bootstrap${employeeId != null ? `?employeeId=${employeeId}` : ''}`).then(handle),
}

export const evalStampsApi = {
  list: (employeeId: number): Promise<EvalStamp[]> =>
    fetch(`/api/eval-stamps?employeeId=${employeeId}`).then(handle),
  // 全社員分（集計用）。employeeId 付き。
  listAll: (): Promise<(EvalStamp & { employeeId: number })[]> =>
    fetch('/api/eval-stamps').then(handle),
  set: (employeeId: number, itemId: number, kind: 'self' | 'admin', idx: number, value: boolean, actorName?: string): Promise<{ ok: boolean }> =>
    fetch('/api/eval-stamps', {
      method: 'PUT',
      headers: jsonHeaders,
      body: JSON.stringify({ employeeId, itemId, kind, idx, value, actorName: actorName ?? null }),
    }).then(handle),
  // カウント種別の回数を保存（0で解除）
  setCount: (employeeId: number, itemId: number, kind: 'self' | 'admin', idx: number, count: number, actorName?: string): Promise<{ ok: boolean }> =>
    fetch('/api/eval-stamps', {
      method: 'PUT',
      headers: jsonHeaders,
      body: JSON.stringify({ employeeId, itemId, kind, idx, count, actorName: actorName ?? null }),
    }).then(handle),
}

// 手順書採点（社員×研修項目×手順×見るべきポイント ごとの合否）。全ポイント合格で結果は合格。
export type ProcedureGrade = { stepIndex: number; pointIndex: number; pass: boolean }
export type ProcedureResult = 'pass' | 'fail'

// 採点1件分（モーダル初期表示用）
export type ProcedureGradeDetail = {
  grades: ProcedureGrade[]
  result: ProcedureResult | null // 未採点は null
  comment: string
  gradedByName: string | null // 採点者名
  gradedAt: string | null // 採点日時（ISO文字列）
}

// 総合結果一覧の1件（進捗状況のスタンプ表示用。項目×管理者評価列(idx)ごと）
export type ProcedureEval = {
  itemId: number
  idx: number
  result: ProcedureResult
  comment: string | null
  gradedByName: string | null // 採点者名
  gradedAt: string | null // 採点日時（ISO文字列）
}

export const procedureGradesApi = {
  get: (employeeId: number, itemId: number, idx: number): Promise<ProcedureGradeDetail> =>
    fetch(`/api/procedure-grades?employeeId=${employeeId}&itemId=${itemId}&idx=${idx}`).then(handle),
  save: (
    employeeId: number,
    itemId: number,
    idx: number,
    grades: ProcedureGrade[],
    result: ProcedureResult,
    comment: string,
    gradedBy?: { id: number; name: string },
  ): Promise<{ ok: boolean }> =>
    fetch('/api/procedure-grades', {
      method: 'PUT',
      headers: jsonHeaders,
      body: JSON.stringify({
        employeeId,
        itemId,
        idx,
        grades,
        result,
        comment,
        gradedById: gradedBy?.id ?? null,
        gradedByName: gradedBy?.name ?? null,
      }),
    }).then(handle),
}

export const procedureEvalsApi = {
  list: (employeeId: number): Promise<ProcedureEval[]> =>
    fetch(`/api/procedure-evals?employeeId=${employeeId}`).then(handle),
}

// 社員ごとの最終得点更新日（押印・手順採点の最新時刻）
export type ScoreUpdate = { employeeId: number; lastUpdatedAt: string }
export const scoreUpdatesApi = {
  list: (): Promise<ScoreUpdate[]> => fetch('/api/score-updates').then(handle),
}

// 新着情報（通知）
export type NotificationItem = {
  id: number
  category: 'eval' | 'exam' | 'badge' | 'master' | 'waiting' | 'qual' | string
  title: string
  body: string | null
  link: string | null
  actorName: string | null
  createdAt: string
  read: boolean
}

export const notificationsApi = {
  list: (employeeId: number, audience: 'home' | 'admin' = 'home'): Promise<NotificationItem[]> =>
    fetch(`/api/notifications?employeeId=${employeeId}&audience=${audience}`).then(handle),
  markRead: (employeeId: number, id: number): Promise<{ ok: boolean }> =>
    fetch('/api/notifications/read', {
      method: 'POST',
      headers: jsonHeaders,
      body: JSON.stringify({ employeeId, id }),
    }).then(handle),
  markAllRead: (employeeId: number, ids: number[]): Promise<{ ok: boolean }> =>
    fetch('/api/notifications/read-all', {
      method: 'POST',
      headers: jsonHeaders,
      body: JSON.stringify({ employeeId, ids }),
    }).then(handle),
  // バッジ付与を通知（クライアント検知）。tier=gold/silver/bronze。
  emitBadge: (employeeId: number, label: string, tier: string): Promise<{ ok: boolean }> =>
    fetch('/api/notifications/badge', {
      method: 'POST',
      headers: jsonHeaders,
      body: JSON.stringify({ employeeId, label, tier }),
    }).then(handle),
  // 資格期限を通知（クライアント検知）。kind=added/expired/expiring。
  emitQual: (
    employeeId: number,
    qualificationId: number,
    kind: 'added' | 'expired' | 'expiring',
    qualName: string,
    validUntil: string,
  ): Promise<{ ok: boolean }> =>
    fetch('/api/notifications/qual', {
      method: 'POST',
      headers: jsonHeaders,
      body: JSON.stringify({ employeeId, qualificationId, kind, qualName, validUntil }),
    }).then(handle),
}

// 作業待ちの手動並び順（研修項目 × 社員 × position）。行がある項目＝手動並び替え済み。
export type WaitingOrder = { itemId: number; employeeId: number; position: number }

export const waitingOrdersApi = {
  list: (itemId?: number): Promise<WaitingOrder[]> =>
    fetch(`/api/waiting-orders${itemId != null ? `?itemId=${itemId}` : ''}`).then(handle),
  save: (itemId: number, employeeIds: number[]): Promise<{ ok: boolean }> =>
    fetch('/api/waiting-orders', {
      method: 'PUT',
      headers: jsonHeaders,
      body: JSON.stringify({ itemId, employeeIds }),
    }).then(handle),
}

// 認証（社員マスタでログイン）
export const authApi = {
  login: (employeeNo: string, password: string): Promise<Employee> =>
    fetch('/api/auth/login', {
      method: 'POST',
      headers: jsonHeaders,
      body: JSON.stringify({ employeeNo, password }),
    }).then(handle),
}

export const employeesApi = {
  list: (): Promise<Employee[]> => fetch('/api/employees').then(handle),
  get: (id: number): Promise<Employee> => fetch(`/api/employees/${id}`).then(handle),
  create: (data: EmployeeInput): Promise<Employee> =>
    fetch('/api/employees', { method: 'POST', headers: jsonHeaders, body: JSON.stringify(data) }).then(handle),
  update: (id: number, data: EmployeeInput): Promise<Employee> =>
    fetch(`/api/employees/${id}`, { method: 'PUT', headers: jsonHeaders, body: JSON.stringify(data) }).then(handle),
  remove: (id: number): Promise<null> =>
    fetch(`/api/employees/${id}`, { method: 'DELETE' }).then(handle),
}

// 筆記試験マスタ（研修セクションに紐づくYES/NO形式の設問。合格ラインはセクション単位）
export type ExamQuestion = {
  id: number
  content: string // 設問内容
  answer: boolean // 正解（true=YES / false=NO）
  explanation: string | null // 解説
  sortOrder: number
  sectionId: number | null
  createdAt: string
  updatedAt: string
}

export type ExamQuestionInput = {
  content: string
  answer: boolean
  explanation: string
}

// 一覧（研修セクション単位。設問数・合格ライン付き）
export type ExamSection = {
  id: number
  name: string
  courseId: number | null
  course: { id: number; name: string } | null
  examPassLine: number | null
  questionCount: number
}

// 1セクションの筆記試験（設問一覧＋合格ライン）
export type ExamSectionDetail = {
  id: number
  name: string
  courseId: number | null
  course: { id: number; name: string } | null
  examPassLine: number | null
  questions: ExamQuestion[]
}

export const examApi = {
  sections: (): Promise<ExamSection[]> => fetch('/api/exam-sections').then(handle),
  get: (sectionId: number): Promise<ExamSectionDetail> =>
    fetch(`/api/exam-sections/${sectionId}`).then(handle),
  setPassLine: (sectionId: number, examPassLine: number | null): Promise<{ id: number; examPassLine: number | null }> =>
    fetch(`/api/exam-sections/${sectionId}`, {
      method: 'PUT',
      headers: jsonHeaders,
      body: JSON.stringify({ examPassLine }),
    }).then(handle),
  addQuestion: (sectionId: number, data: ExamQuestionInput): Promise<ExamQuestion> =>
    fetch(`/api/exam-sections/${sectionId}/questions`, {
      method: 'POST',
      headers: jsonHeaders,
      body: JSON.stringify(data),
    }).then(handle),
  updateQuestion: (id: number, data: ExamQuestionInput): Promise<ExamQuestion> =>
    fetch(`/api/exam-questions/${id}`, { method: 'PUT', headers: jsonHeaders, body: JSON.stringify(data) }).then(handle),
  removeQuestion: (id: number): Promise<null> =>
    fetch(`/api/exam-questions/${id}`, { method: 'DELETE' }).then(handle),
  reorderQuestions: (sectionId: number, orderedIds: number[]): Promise<{ ok: boolean }> =>
    fetch(`/api/exam-sections/${sectionId}/questions/order`, {
      method: 'PUT',
      headers: jsonHeaders,
      body: JSON.stringify({ orderedIds }),
    }).then(handle),
}

// 筆記試験申請（自己評価画面から申請 → 管理者が承認 → 受験 → 合否）
export const EXAM_RESULTS = ['合格', '不合格'] as const
export type ExamApplicationStatus = '申請中' | '承認済'

export type ExamApplication = {
  id: number
  sectionId: number | null
  section: { id: number; name: string; course: { id: number; name: string } | null } | null
  applicantId: number | null
  applicant: {
    id: number
    employeeNo: string
    name: string
    department: { id: number; name: string } | null
  } | null
  appliedAt: string
  status: ExamApplicationStatus
  approvedAt: string | null
  result: string | null // 合格 / 不合格 / null(未判定)
  createdAt: string
  updatedAt: string
}

export const examApplicationsApi = {
  list: (params?: { status?: string; applicantId?: number; sectionId?: number }): Promise<ExamApplication[]> => {
    const q = new URLSearchParams()
    if (params?.status) q.set('status', params.status)
    if (params?.applicantId != null) q.set('applicantId', String(params.applicantId))
    if (params?.sectionId != null) q.set('sectionId', String(params.sectionId))
    const qs = q.toString()
    return fetch(`/api/exam-applications${qs ? `?${qs}` : ''}`).then(handle)
  },
  create: (sectionId: number, applicantId: number): Promise<ExamApplication> =>
    fetch('/api/exam-applications', {
      method: 'POST',
      headers: jsonHeaders,
      body: JSON.stringify({ sectionId, applicantId }),
    }).then(handle),
  approve: (id: number): Promise<ExamApplication> =>
    fetch(`/api/exam-applications/${id}/approve`, { method: 'PUT', headers: jsonHeaders }).then(handle),
  setResult: (id: number, result: string | null): Promise<ExamApplication> =>
    fetch(`/api/exam-applications/${id}/result`, {
      method: 'PUT',
      headers: jsonHeaders,
      body: JSON.stringify({ result }),
    }).then(handle),
  remove: (id: number): Promise<null> =>
    fetch(`/api/exam-applications/${id}`, { method: 'DELETE' }).then(handle),
}
