// IZUMI すごメカ — API サーバー（Express + Prisma + PostgreSQL/Supabase）
// ローカル起動: npm run server  /  画面と同時起動: npm run dev:all
// 本番（Vercel）: api/index.ts 経由でサーバーレス関数として実行される
import express from 'express'
import cors from 'cors'
import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'
import { PrismaClient } from '@prisma/client'

// サーバーレス環境（Vercel）ではリクエストのたびに新規接続が増えないよう、
// PrismaClient をグローバルにキャッシュして使い回す。
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }
const prisma = globalForPrisma.prisma ?? new PrismaClient()
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

// パスワードを安全に保存（scryptハッシュ。平文は保存しない）
function hashPassword(pw: string): string {
  const salt = randomBytes(16).toString('hex')
  const hash = scryptSync(pw, salt, 64).toString('hex')
  return `${salt}:${hash}`
}

// 保存済みハッシュ（salt:hash）と入力パスワードを安全に照合
function verifyPassword(pw: string, stored: string | null): boolean {
  if (!stored || !stored.includes(':')) return false
  const [salt, hash] = stored.split(':')
  const calc = scryptSync(pw, salt, 64)
  const expected = Buffer.from(hash, 'hex')
  return calc.length === expected.length && timingSafeEqual(calc, expected)
}

// 'YYYY-MM-DD' などの文字列を Date | null に変換
function parseDate(v: unknown): Date | null {
  if (!v) return null
  const d = new Date(String(v))
  return isNaN(d.getTime()) ? null : d
}

// 紐づくID（部署など）を number | null に正規化
function parseId(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}
// ===== 通知（新着情報）ヘルパ =====
// 社員の所属拠点ID（employee → department → location）
async function getEmployeeLocationId(employeeId: number | null): Promise<number | null> {
  if (employeeId == null) return null
  const emp = await prisma.employee.findUnique({
    where: { id: employeeId },
    select: { department: { select: { locationId: true } } },
  })
  return emp?.department?.locationId ?? null
}

type NotifyInput = {
  scope?: 'user' | 'location' | 'all'
  recipientId?: number | null
  locationId?: number | null
  excludeId?: number | null
  audience?: 'home' | 'admin'
  category: string
  title: string
  body?: string | null
  link?: string | null
  actorName?: string | null
  dedupeKey?: string | null
}

// 通知を1件作成。dedupeKey があり既存なら作成しない（重複防止）。失敗しても本処理は止めない。
async function notify(data: NotifyInput) {
  try {
    if (data.dedupeKey) {
      const exists = await prisma.notification.findUnique({ where: { dedupeKey: data.dedupeKey } })
      if (exists) return null
    }
    return await prisma.notification.create({
      data: {
        scope: data.scope ?? 'user',
        recipientId: data.recipientId ?? null,
        locationId: data.locationId ?? null,
        excludeId: data.excludeId ?? null,
        audience: data.audience ?? 'home',
        category: data.category,
        title: data.title,
        body: data.body ?? null,
        link: data.link ?? null,
        actorName: data.actorName ?? null,
        dedupeKey: data.dedupeKey ?? null,
      },
    })
  } catch (e) {
    console.error('notify failed', e)
    return null
  }
}

// マスタ変更の通知（ホーム=全員 と 管理画面 の両方に出す）。adminLink=管理画面側の遷移先。
async function notifyMaster(action: '追加' | '更新' | '削除', kind: string, name: string, adminLink: string) {
  const title = `${kind}「${name}」が${action}されました`
  await notify({ scope: 'all', audience: 'home', category: 'master', title, link: '/dashboard' })
  await notify({ audience: 'admin', category: 'master', title, link: adminLink })
}

const app = express()
const PORT = 3001

app.use(cors())
app.use(express.json())

// 動作確認用
app.get('/api/health', (_req, res) => {
  res.json({ ok: true })
})

// ===== 拠点マスタ =====
// 一覧（拠点所属数=memberCount は、その拠点の各部署に所属する社員数の合計）
app.get('/api/locations', async (_req, res) => {
  const locations = await prisma.location.findMany({
    orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
    include: { departments: { select: { _count: { select: { employees: true } } } } },
  })
  res.json(
    locations.map(({ departments, ...loc }) => ({
      ...loc,
      memberCount: departments.reduce((sum, d) => sum + d._count.employees, 0),
    })),
  )
})

// 追加（拠点名=必須 / 備考=任意）
app.post('/api/locations', async (req, res) => {
  const { name, note } = req.body ?? {}
  if (!name || !String(name).trim()) {
    return res.status(400).json({ error: '拠点名は必須です' })
  }
  try {
    const created = await prisma.location.create({
      data: { name: String(name).trim(), note: note ? String(note).trim() : null },
    })
    res.status(201).json(created)
  } catch {
    res.status(500).json({ error: '作成に失敗しました' })
  }
})

// 更新
app.put('/api/locations/:id', async (req, res) => {
  const id = Number(req.params.id)
  const { name, note } = req.body ?? {}
  if (!name || !String(name).trim()) {
    return res.status(400).json({ error: '拠点名は必須です' })
  }
  try {
    const updated = await prisma.location.update({
      where: { id },
      data: { name: String(name).trim(), note: note ? String(note).trim() : null },
    })
    res.json(updated)
  } catch (e: any) {
    if (e?.code === 'P2025') {
      return res.status(404).json({ error: '対象が見つかりません' })
    }
    res.status(500).json({ error: '更新に失敗しました' })
  }
})

// 削除
app.delete('/api/locations/:id', async (req, res) => {
  const id = Number(req.params.id)
  try {
    await prisma.location.delete({ where: { id } })
    res.status(204).end()
  } catch (e: any) {
    if (e?.code === 'P2025') {
      return res.status(404).json({ error: '対象が見つかりません' })
    }
    res.status(500).json({ error: '削除に失敗しました' })
  }
})

// ===== 部門マスタ =====
// 紐づく拠点IDを number | null に正規化
function parseLocationId(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

// 一覧（紐づく拠点を含む。部署所属数=memberCountはその部署に所属する社員数）
app.get('/api/departments', async (_req, res) => {
  const departments = await prisma.department.findMany({
    orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
    include: {
      location: { select: { id: true, name: true } },
      _count: { select: { employees: true } },
    },
  })
  res.json(departments.map(({ _count, ...d }) => ({ ...d, memberCount: _count.employees })))
})

// 追加（部署名=必須 / 備考=任意 / 拠点=任意）
app.post('/api/departments', async (req, res) => {
  const { name, note, locationId } = req.body ?? {}
  if (!name || !String(name).trim()) {
    return res.status(400).json({ error: '部署名は必須です' })
  }
  try {
    const created = await prisma.department.create({
      data: {
        name: String(name).trim(),
        note: note ? String(note).trim() : null,
        locationId: parseLocationId(locationId),
      },
      include: { location: { select: { id: true, name: true } } },
    })
    res.status(201).json(created)
  } catch (e: any) {
    if (e?.code === 'P2003') {
      return res.status(400).json({ error: '指定の拠点が存在しません' })
    }
    res.status(500).json({ error: '作成に失敗しました' })
  }
})

// 更新
app.put('/api/departments/:id', async (req, res) => {
  const id = Number(req.params.id)
  const { name, note, locationId } = req.body ?? {}
  if (!name || !String(name).trim()) {
    return res.status(400).json({ error: '部署名は必須です' })
  }
  try {
    const updated = await prisma.department.update({
      where: { id },
      data: {
        name: String(name).trim(),
        note: note ? String(note).trim() : null,
        locationId: parseLocationId(locationId),
      },
      include: { location: { select: { id: true, name: true } } },
    })
    res.json(updated)
  } catch (e: any) {
    if (e?.code === 'P2025') {
      return res.status(404).json({ error: '対象が見つかりません' })
    }
    if (e?.code === 'P2003') {
      return res.status(400).json({ error: '指定の拠点が存在しません' })
    }
    res.status(500).json({ error: '更新に失敗しました' })
  }
})

// 削除
app.delete('/api/departments/:id', async (req, res) => {
  const id = Number(req.params.id)
  try {
    await prisma.department.delete({ where: { id } })
    res.status(204).end()
  } catch (e: any) {
    if (e?.code === 'P2025') {
      return res.status(404).json({ error: '対象が見つかりません' })
    }
    res.status(500).json({ error: '削除に失敗しました' })
  }
})

// ===== 社員マスタ =====
const ROLES = ['受講者', '評価者', '管理者']

// パスワードを除いた公開用の include（部署＋その拠点、履修コースも返す）
const employeeInclude = {
  department: {
    select: { id: true, name: true, location: { select: { id: true, name: true } } },
  },
  enrolledCourses: { select: { id: true, name: true }, orderBy: { sortOrder: 'asc' } },
} as const

// body.enrolledCourseIds を number[] に正規化
function parseCourseIds(body: any): number[] {
  if (!Array.isArray(body?.enrolledCourseIds)) return []
  return body.enrolledCourseIds.map((v: unknown) => Number(v)).filter((n: number) => Number.isFinite(n))
}

// passwordHash を除外して返す
function publicEmployee<T extends { passwordHash?: string | null }>(e: T) {
  const { passwordHash, ...rest } = e
  return rest
}

// 一覧
app.get('/api/employees', async (_req, res) => {
  const employees = await prisma.employee.findMany({
    orderBy: { id: 'asc' },
    include: employeeInclude,
  })
  res.json(employees.map(publicEmployee))
})

// 1件取得（詳細・編集画面用）
app.get('/api/employees/:id', async (req, res) => {
  const id = Number(req.params.id)
  const emp = await prisma.employee.findUnique({ where: { id }, include: employeeInclude })
  if (!emp) return res.status(404).json({ error: '対象が見つかりません' })
  res.json(publicEmployee(emp))
})

// 追加（社員番号・氏名=必須 / ロールは規定値から / パスワードはハッシュ化）
app.post('/api/employees', async (req, res) => {
  const { employeeNo, name, role, phone, birthDate, hireDate, assignedDate, password, departmentId } = req.body ?? {}
  if (!employeeNo || !String(employeeNo).trim()) {
    return res.status(400).json({ error: '社員番号は必須です' })
  }
  if (!name || !String(name).trim()) {
    return res.status(400).json({ error: '氏名は必須です' })
  }
  try {
    const created = await prisma.employee.create({
      data: {
        employeeNo: String(employeeNo).trim(),
        name: String(name).trim(),
        role: ROLES.includes(role) ? role : '受講者',
        phone: phone ? String(phone).trim() : null,
        birthDate: parseDate(birthDate),
        hireDate: parseDate(hireDate),
        assignedDate: parseDate(assignedDate),
        passwordHash: password ? hashPassword(String(password)) : null,
        departmentId: parseId(departmentId),
        enrolledCourses: { connect: parseCourseIds(req.body).map((id) => ({ id })) },
      },
      include: employeeInclude,
    })
    res.status(201).json(publicEmployee(created))
  } catch (e: any) {
    if (e?.code === 'P2002') {
      return res.status(409).json({ error: 'その社員番号は既に使われています' })
    }
    if (e?.code === 'P2003') {
      return res.status(400).json({ error: '指定の部署が存在しません' })
    }
    res.status(500).json({ error: '作成に失敗しました' })
  }
})

// 更新（パスワードは入力があったときだけ更新）
app.put('/api/employees/:id', async (req, res) => {
  const id = Number(req.params.id)
  const { employeeNo, name, role, phone, birthDate, hireDate, assignedDate, password, departmentId } = req.body ?? {}
  if (!employeeNo || !String(employeeNo).trim()) {
    return res.status(400).json({ error: '社員番号は必須です' })
  }
  if (!name || !String(name).trim()) {
    return res.status(400).json({ error: '氏名は必須です' })
  }
  try {
    const updated = await prisma.employee.update({
      where: { id },
      data: {
        employeeNo: String(employeeNo).trim(),
        name: String(name).trim(),
        role: ROLES.includes(role) ? role : undefined,
        phone: phone ? String(phone).trim() : null,
        birthDate: parseDate(birthDate),
        hireDate: parseDate(hireDate),
        assignedDate: parseDate(assignedDate),
        ...(password ? { passwordHash: hashPassword(String(password)) } : {}),
        departmentId: parseId(departmentId),
        enrolledCourses: { set: parseCourseIds(req.body).map((id) => ({ id })) },
      },
      include: employeeInclude,
    })
    res.json(publicEmployee(updated))
  } catch (e: any) {
    if (e?.code === 'P2002') {
      return res.status(409).json({ error: 'その社員番号は既に使われています' })
    }
    if (e?.code === 'P2025') {
      return res.status(404).json({ error: '対象が見つかりません' })
    }
    if (e?.code === 'P2003') {
      return res.status(400).json({ error: '指定の部署が存在しません' })
    }
    res.status(500).json({ error: '更新に失敗しました' })
  }
})

// 削除
app.delete('/api/employees/:id', async (req, res) => {
  const id = Number(req.params.id)
  try {
    await prisma.employee.delete({ where: { id } })
    res.status(204).end()
  } catch (e: any) {
    if (e?.code === 'P2025') {
      return res.status(404).json({ error: '対象が見つかりません' })
    }
    res.status(500).json({ error: '削除に失敗しました' })
  }
})

// ===== 認証（社員マスタでログイン） =====
// 社員番号＋パスワードを照合し、一致すれば社員情報（パスワード除く）を返す
app.post('/api/auth/login', async (req, res) => {
  const employeeNo = String(req.body?.employeeNo ?? '').trim()
  const password = String(req.body?.password ?? '')
  if (!employeeNo || !password) {
    return res.status(400).json({ error: '社員番号とパスワードを入力してください' })
  }
  const emp = await prisma.employee.findUnique({ where: { employeeNo }, include: employeeInclude })
  if (!emp) {
    return res.status(401).json({ error: '社員番号またはパスワードが違います' })
  }
  if (!emp.passwordHash) {
    return res.status(403).json({ error: 'この社員はパスワード未設定です。社員マスタで設定してください。' })
  }
  if (!verifyPassword(password, emp.passwordHash)) {
    return res.status(401).json({ error: '社員番号またはパスワードが違います' })
  }
  res.json(publicEmployee(emp))
})

// ===== 研修コースマスタ =====
// 一覧（研修セクション数=sectionCount はそのコースに紐づくセクション数）
app.get('/api/training-courses', async (_req, res) => {
  const courses = await prisma.trainingCourse.findMany({
    orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
    include: { _count: { select: { sections: true } } },
  })
  res.json(courses.map(({ _count, ...c }) => ({ ...c, sectionCount: _count.sections })))
})

// 追加（研修コース名=必須 / 備考=任意）
const COURSE_ICONS = ['large', 'small', 'electrical', 'body', 'paint']
const parseCourseIcon = (v: unknown) => (COURSE_ICONS.includes(v as string) ? (v as string) : null)

app.post('/api/training-courses', async (req, res) => {
  const { name, note, icon } = req.body ?? {}
  if (!name || !String(name).trim()) {
    return res.status(400).json({ error: '研修コース名は必須です' })
  }
  try {
    const created = await prisma.trainingCourse.create({
      data: { name: String(name).trim(), note: note ? String(note).trim() : null, icon: parseCourseIcon(icon) },
    })
    await notifyMaster('追加', '研修コース', created.name, '/admin/kenshu-course')
    res.status(201).json(created)
  } catch {
    res.status(500).json({ error: '作成に失敗しました' })
  }
})

// 更新
app.put('/api/training-courses/:id', async (req, res) => {
  const id = Number(req.params.id)
  const { name, note, icon } = req.body ?? {}
  if (!name || !String(name).trim()) {
    return res.status(400).json({ error: '研修コース名は必須です' })
  }
  try {
    const updated = await prisma.trainingCourse.update({
      where: { id },
      data: { name: String(name).trim(), note: note ? String(note).trim() : null, icon: parseCourseIcon(icon) },
    })
    await notifyMaster('更新', '研修コース', updated.name, '/admin/kenshu-course')
    res.json(updated)
  } catch (e: any) {
    if (e?.code === 'P2025') {
      return res.status(404).json({ error: '対象が見つかりません' })
    }
    res.status(500).json({ error: '更新に失敗しました' })
  }
})

// 削除
app.delete('/api/training-courses/:id', async (req, res) => {
  const id = Number(req.params.id)
  try {
    const existing = await prisma.trainingCourse.findUnique({ where: { id }, select: { name: true } })
    await prisma.trainingCourse.delete({ where: { id } })
    if (existing) await notifyMaster('削除', '研修コース', existing.name, '/admin/kenshu-course')
    res.status(204).end()
  } catch (e: any) {
    if (e?.code === 'P2025') {
      return res.status(404).json({ error: '対象が見つかりません' })
    }
    res.status(500).json({ error: '削除に失敗しました' })
  }
})

// ===== 研修セクションマスタ =====
const sectionInclude = { course: { select: { id: true, name: true } } } as const

// リクエストボディから保存データを組み立てる（フラグ=真偽値 / 文字列=trim・空はnull）
function buildSectionData(body: any) {
  const s = (v: unknown) => (v == null || v === '' ? null : String(v).trim())
  const b = (v: unknown) => Boolean(v)
  // カウント目標回数（0〜10にクランプ。0=未設定）
  const cnt = (v: unknown) => Math.max(0, Math.min(10, Number.isFinite(Number(v)) ? Math.trunc(Number(v)) : 0))
  return {
    name: String(body.name).trim(),
    note: s(body.note),
    sortOrder: Number.isFinite(Number(body.sortOrder)) ? Number(body.sortOrder) : 0,
    courseId: parseId(body.courseId),
    header1Flag: b(body.header1Flag), header1Name: s(body.header1Name),
    header2Flag: b(body.header2Flag), header2Name: s(body.header2Name),
    header3Flag: b(body.header3Flag), header3Name: s(body.header3Name),
    header4Flag: b(body.header4Flag), header4Name: s(body.header4Name),
    header5Flag: b(body.header5Flag), header5Name: s(body.header5Name),
    selfEval1Flag: b(body.selfEval1Flag), selfEval1Type: s(body.selfEval1Type), selfEval1Name: s(body.selfEval1Name), selfEval1Count: cnt(body.selfEval1Count),
    selfEval2Flag: b(body.selfEval2Flag), selfEval2Type: s(body.selfEval2Type), selfEval2Name: s(body.selfEval2Name), selfEval2Count: cnt(body.selfEval2Count),
    adminEval1Flag: b(body.adminEval1Flag), adminEval1Type: s(body.adminEval1Type), adminEval1Name: s(body.adminEval1Name), adminEval1Count: cnt(body.adminEval1Count),
    adminEval2Flag: b(body.adminEval2Flag), adminEval2Type: s(body.adminEval2Type), adminEval2Name: s(body.adminEval2Name), adminEval2Count: cnt(body.adminEval2Count),
    adminEval3Flag: b(body.adminEval3Flag), adminEval3Type: s(body.adminEval3Type), adminEval3Name: s(body.adminEval3Name), adminEval3Count: cnt(body.adminEval3Count),
  }
}

// 一覧（研修項目数=itemCount はそのセクションに紐づく項目数）
app.get('/api/training-sections', async (_req, res) => {
  const sections = await prisma.trainingSection.findMany({
    orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
    include: { ...sectionInclude, _count: { select: { items: true } } },
  })
  res.json(sections.map(({ _count, ...s }) => ({ ...s, itemCount: _count.items })))
})

// 1件取得（詳細・編集画面用）
app.get('/api/training-sections/:id', async (req, res) => {
  const id = Number(req.params.id)
  const section = await prisma.trainingSection.findUnique({
    where: { id },
    include: { ...sectionInclude, _count: { select: { items: true } } },
  })
  if (!section) return res.status(404).json({ error: '対象が見つかりません' })
  const { _count, ...rest } = section
  res.json({ ...rest, itemCount: _count.items })
})

// 追加
app.post('/api/training-sections', async (req, res) => {
  if (!req.body?.name || !String(req.body.name).trim()) {
    return res.status(400).json({ error: '研修セクション名は必須です' })
  }
  try {
    const created = await prisma.trainingSection.create({
      data: buildSectionData(req.body),
      include: sectionInclude,
    })
    await notifyMaster('追加', '研修セクション', created.name, '/admin/kenshu-section')
    res.status(201).json(created)
  } catch (e: any) {
    if (e?.code === 'P2003') return res.status(400).json({ error: '指定の研修コースが存在しません' })
    res.status(500).json({ error: '作成に失敗しました' })
  }
})

// 更新
app.put('/api/training-sections/:id', async (req, res) => {
  const id = Number(req.params.id)
  if (!req.body?.name || !String(req.body.name).trim()) {
    return res.status(400).json({ error: '研修セクション名は必須です' })
  }
  try {
    const updated = await prisma.trainingSection.update({
      where: { id },
      data: buildSectionData(req.body),
      include: sectionInclude,
    })
    await notifyMaster('更新', '研修セクション', updated.name, '/admin/kenshu-section')
    res.json(updated)
  } catch (e: any) {
    if (e?.code === 'P2025') return res.status(404).json({ error: '対象が見つかりません' })
    if (e?.code === 'P2003') return res.status(400).json({ error: '指定の研修コースが存在しません' })
    res.status(500).json({ error: '更新に失敗しました' })
  }
})

// 削除
app.delete('/api/training-sections/:id', async (req, res) => {
  const id = Number(req.params.id)
  try {
    const existing = await prisma.trainingSection.findUnique({ where: { id }, select: { name: true } })
    await prisma.trainingSection.delete({ where: { id } })
    if (existing) await notifyMaster('削除', '研修セクション', existing.name, '/admin/kenshu-section')
    res.status(204).end()
  } catch (e: any) {
    if (e?.code === 'P2025') return res.status(404).json({ error: '対象が見つかりません' })
    res.status(500).json({ error: '削除に失敗しました' })
  }
})

// ===== 研修項目マスタ =====
const itemInclude = {
  section: { select: { id: true, name: true, course: { select: { id: true, name: true } } } },
  requiredQualifications: { select: { id: true, name: true, category: true } },
} as const

// body.requiredQualificationIds を number[] に正規化
function parseQualIds(body: any): number[] {
  if (!Array.isArray(body?.requiredQualificationIds)) return []
  return body.requiredQualificationIds.map((v: unknown) => Number(v)).filter((n: number) => Number.isFinite(n))
}

function buildItemData(body: any) {
  const s = (v: unknown) => (v == null || v === '' ? null : String(v).trim())
  const b = (v: unknown) => Boolean(v)
  return {
    title: String(body.title).trim(),
    note: s(body.note),
    sortOrder: Number.isFinite(Number(body.sortOrder)) ? Number(body.sortOrder) : 0,
    sectionId: parseId(body.sectionId),
    flag1: b(body.flag1), value1: s(body.value1),
    flag2: b(body.flag2), value2: s(body.value2),
    flag3: b(body.flag3), value3: s(body.value3),
    flag4: b(body.flag4), value4: s(body.value4),
    flag5: b(body.flag5), value5: s(body.value5),
  }
}

// 一覧
app.get('/api/training-items', async (_req, res) => {
  const items = await prisma.trainingItem.findMany({
    orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
    include: itemInclude,
  })
  res.json(items)
})

// 1件取得（詳細・編集画面用）
app.get('/api/training-items/:id', async (req, res) => {
  const id = Number(req.params.id)
  const item = await prisma.trainingItem.findUnique({ where: { id }, include: itemInclude })
  if (!item) return res.status(404).json({ error: '対象が見つかりません' })
  res.json(item)
})

// 追加（研修項目タイトル=必須）
app.post('/api/training-items', async (req, res) => {
  if (!req.body?.title || !String(req.body.title).trim()) {
    return res.status(400).json({ error: '研修項目タイトルは必須です' })
  }
  try {
    const created = await prisma.trainingItem.create({
      data: {
        ...buildItemData(req.body),
        requiredQualifications: { connect: parseQualIds(req.body).map((id) => ({ id })) },
      },
      include: itemInclude,
    })
    await notifyMaster('追加', '研修項目', created.title, '/admin/kenshu-item')
    res.status(201).json(created)
  } catch (e: any) {
    if (e?.code === 'P2003') return res.status(400).json({ error: '指定の研修セクションが存在しません' })
    res.status(500).json({ error: '作成に失敗しました' })
  }
})

// 更新
app.put('/api/training-items/:id', async (req, res) => {
  const id = Number(req.params.id)
  if (!req.body?.title || !String(req.body.title).trim()) {
    return res.status(400).json({ error: '研修項目タイトルは必須です' })
  }
  try {
    const updated = await prisma.trainingItem.update({
      where: { id },
      data: {
        ...buildItemData(req.body),
        requiredQualifications: { set: parseQualIds(req.body).map((id) => ({ id })) },
      },
      include: itemInclude,
    })
    await notifyMaster('更新', '研修項目', updated.title, '/admin/kenshu-item')
    res.json(updated)
  } catch (e: any) {
    if (e?.code === 'P2025') return res.status(404).json({ error: '対象が見つかりません' })
    if (e?.code === 'P2003') return res.status(400).json({ error: '指定の研修セクションが存在しません' })
    res.status(500).json({ error: '更新に失敗しました' })
  }
})

// 削除
app.delete('/api/training-items/:id', async (req, res) => {
  const id = Number(req.params.id)
  try {
    const existing = await prisma.trainingItem.findUnique({ where: { id }, select: { title: true } })
    await prisma.trainingItem.delete({ where: { id } })
    if (existing) await notifyMaster('削除', '研修項目', existing.title, '/admin/kenshu-item')
    res.status(204).end()
  } catch (e: any) {
    if (e?.code === 'P2025') return res.status(404).json({ error: '対象が見つかりません' })
    res.status(500).json({ error: '削除に失敗しました' })
  }
})

// ===== 研修教材マスタ =====
const materialInclude = {
  item: {
    select: {
      id: true,
      title: true,
      section: { select: { id: true, name: true, course: { select: { id: true, name: true } } } },
    },
  },
} as const

function buildMaterialData(body: any) {
  const s = (v: unknown) => (v == null || v === '' ? null : String(v).trim())
  const b = (v: unknown) => Boolean(v)
  const data: any = {
    note: s(body.note),
    sortOrder: Number.isFinite(Number(body.sortOrder)) ? Number(body.sortOrder) : 0,
    attachmentUrl: s(body.attachmentUrl),
    procedure: body.procedure ? JSON.stringify(body.procedure) : null, // 手順書(JSON)
    itemId: parseId(body.itemId),
  }
  for (let i = 1; i <= 8; i++) {
    data[`detail${i}Flag`] = b(body[`detail${i}Flag`])
    data[`detail${i}Title`] = s(body[`detail${i}Title`])
    data[`detail${i}Content`] = s(body[`detail${i}Content`])
  }
  return data
}

// 手順書JSONをパースして返す（文字列→オブジェクト）
function publicMaterial(m: any) {
  let procedure = null
  if (m.procedure) {
    try { procedure = JSON.parse(m.procedure) } catch { procedure = null }
  }
  return { ...m, procedure }
}

// 一覧
app.get('/api/training-materials', async (_req, res) => {
  const materials = await prisma.trainingMaterial.findMany({
    orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
    include: materialInclude,
  })
  res.json(materials.map(publicMaterial))
})

// 1件取得（詳細・編集画面用）
app.get('/api/training-materials/:id', async (req, res) => {
  const id = Number(req.params.id)
  const material = await prisma.trainingMaterial.findUnique({ where: { id }, include: materialInclude })
  if (!material) return res.status(404).json({ error: '対象が見つかりません' })
  res.json(publicMaterial(material))
})

// 追加（研修詳細タイトル1=必須）
app.post('/api/training-materials', async (req, res) => {
  if (!req.body?.detail1Title || !String(req.body.detail1Title).trim()) {
    return res.status(400).json({ error: '研修詳細タイトル1は必須です' })
  }
  try {
    const created = await prisma.trainingMaterial.create({ data: buildMaterialData(req.body), include: materialInclude })
    await notifyMaster('追加', '研修教材', created.detail1Title ?? '教材', '/admin/kenshu-material')
    res.status(201).json(publicMaterial(created))
  } catch (e: any) {
    if (e?.code === 'P2003') return res.status(400).json({ error: '指定の研修項目が存在しません' })
    res.status(500).json({ error: '作成に失敗しました' })
  }
})

// 更新
app.put('/api/training-materials/:id', async (req, res) => {
  const id = Number(req.params.id)
  if (!req.body?.detail1Title || !String(req.body.detail1Title).trim()) {
    return res.status(400).json({ error: '研修詳細タイトル1は必須です' })
  }
  try {
    const updated = await prisma.trainingMaterial.update({ where: { id }, data: buildMaterialData(req.body), include: materialInclude })
    await notifyMaster('更新', '研修教材', updated.detail1Title ?? '教材', '/admin/kenshu-material')
    res.json(publicMaterial(updated))
  } catch (e: any) {
    if (e?.code === 'P2025') return res.status(404).json({ error: '対象が見つかりません' })
    if (e?.code === 'P2003') return res.status(400).json({ error: '指定の研修項目が存在しません' })
    res.status(500).json({ error: '更新に失敗しました' })
  }
})

// 削除
app.delete('/api/training-materials/:id', async (req, res) => {
  const id = Number(req.params.id)
  try {
    const existing = await prisma.trainingMaterial.findUnique({ where: { id }, select: { detail1Title: true } })
    await prisma.trainingMaterial.delete({ where: { id } })
    if (existing) await notifyMaster('削除', '研修教材', existing.detail1Title ?? '教材', '/admin/kenshu-material')
    res.status(204).end()
  } catch (e: any) {
    if (e?.code === 'P2025') return res.status(404).json({ error: '対象が見つかりません' })
    res.status(500).json({ error: '削除に失敗しました' })
  }
})

// ===== 資格マスタ =====
const QUAL_CATEGORIES = ['国家資格', '民間資格', '社内資格']

function buildQualificationData(body: any) {
  const category = QUAL_CATEGORIES.includes(body?.category) ? body.category : null
  return {
    name: String(body.name).trim(),
    category,
  }
}

// 一覧
app.get('/api/qualifications', async (_req, res) => {
  const qualifications = await prisma.qualification.findMany({ orderBy: { id: 'asc' } })
  res.json(qualifications)
})

// 追加（資格名=必須）
app.post('/api/qualifications', async (req, res) => {
  if (!req.body?.name || !String(req.body.name).trim()) {
    return res.status(400).json({ error: '資格名は必須です' })
  }
  try {
    const created = await prisma.qualification.create({ data: buildQualificationData(req.body) })
    res.status(201).json(created)
  } catch {
    res.status(500).json({ error: '作成に失敗しました' })
  }
})

// 更新
app.put('/api/qualifications/:id', async (req, res) => {
  const id = Number(req.params.id)
  if (!req.body?.name || !String(req.body.name).trim()) {
    return res.status(400).json({ error: '資格名は必須です' })
  }
  try {
    const updated = await prisma.qualification.update({ where: { id }, data: buildQualificationData(req.body) })
    res.json(updated)
  } catch (e: any) {
    if (e?.code === 'P2025') return res.status(404).json({ error: '対象が見つかりません' })
    res.status(500).json({ error: '更新に失敗しました' })
  }
})

// 削除
app.delete('/api/qualifications/:id', async (req, res) => {
  const id = Number(req.params.id)
  try {
    await prisma.qualification.delete({ where: { id } })
    res.status(204).end()
  } catch (e: any) {
    if (e?.code === 'P2025') return res.status(404).json({ error: '対象が見つかりません' })
    res.status(500).json({ error: '削除に失敗しました' })
  }
})

// ===== 権限マスタ =====
// 一覧（ユーザーごとに付与済み権限数を表示）
app.get('/api/permissions', async (_req, res) => {
  const employees = await prisma.employee.findMany({
    orderBy: { id: 'asc' },
    include: {
      department: { select: { name: true, location: { select: { name: true } } } },
      permission: true,
    },
  })
  res.json(
    employees.map((e) => {
      let grantedCount = 0
      if (e.permission?.granted) {
        try { grantedCount = JSON.parse(e.permission.granted).length } catch { grantedCount = 0 }
      }
      return {
        employeeId: e.id,
        employeeNo: e.employeeNo,
        name: e.name,
        role: e.role,
        departmentName: e.department?.name ?? null,
        locationName: e.department?.location?.name ?? null,
        grantedCount,
      }
    }),
  )
})

// 1ユーザーの権限取得（詳細画面用）
app.get('/api/permissions/:employeeId', async (req, res) => {
  const employeeId = Number(req.params.employeeId)
  const emp = await prisma.employee.findUnique({
    where: { id: employeeId },
    include: { department: { select: { name: true } }, permission: true },
  })
  if (!emp) return res.status(404).json({ error: '対象ユーザーが見つかりません' })
  let granted: string[] = []
  if (emp.permission?.granted) {
    try { granted = JSON.parse(emp.permission.granted) } catch { granted = [] }
  }
  res.json({
    employeeId: emp.id,
    employeeNo: emp.employeeNo,
    name: emp.name,
    role: emp.role,
    departmentName: emp.department?.name ?? null,
    granted,
  })
})

// 1ユーザーの権限を保存（upsert）
app.put('/api/permissions/:employeeId', async (req, res) => {
  const employeeId = Number(req.params.employeeId)
  const granted = Array.isArray(req.body?.granted)
    ? req.body.granted.filter((x: unknown) => typeof x === 'string')
    : []
  const grantedJson = JSON.stringify(granted)
  try {
    await prisma.permission.upsert({
      where: { employeeId },
      create: { employeeId, granted: grantedJson },
      update: { granted: grantedJson },
    })
    res.json({ employeeId, granted })
  } catch (e: any) {
    if (e?.code === 'P2003') return res.status(404).json({ error: '対象ユーザーが見つかりません' })
    res.status(500).json({ error: '保存に失敗しました' })
  }
})

// ===== 保有資格マスタ =====
// 一覧（ユーザーごとに保有資格数を表示）
app.get('/api/held-qualifications', async (_req, res) => {
  const employees = await prisma.employee.findMany({
    orderBy: { id: 'asc' },
    include: {
      department: { select: { name: true } },
      _count: { select: { heldQualifications: true } },
    },
  })
  res.json(
    employees.map((e) => ({
      employeeId: e.id,
      employeeNo: e.employeeNo,
      name: e.name,
      role: e.role,
      departmentName: e.department?.name ?? null,
      heldCount: e._count.heldQualifications,
    })),
  )
})

// 1ユーザーの保有資格（詳細画面用。区分・有効期限は資格マスタから）
app.get('/api/held-qualifications/:employeeId', async (req, res) => {
  const employeeId = Number(req.params.employeeId)
  const emp = await prisma.employee.findUnique({
    where: { id: employeeId },
    include: {
      department: { select: { name: true } },
      heldQualifications: { include: { qualification: true }, orderBy: { id: 'asc' } },
    },
  })
  if (!emp) return res.status(404).json({ error: '対象ユーザーが見つかりません' })
  res.json({
    employeeId: emp.id,
    employeeNo: emp.employeeNo,
    name: emp.name,
    role: emp.role,
    departmentName: emp.department?.name ?? null,
    held: emp.heldQualifications.map((h) => ({
      qualificationId: h.qualificationId,
      name: h.qualification.name,
      category: h.qualification.category,
      acquiredDate: h.acquiredDate,
      validUntil: h.validUntil,
    })),
  })
})

// 保有資格を追加（資格マスタから選択 ＋ 取得日・有効期限を人ごとに入力）
app.post('/api/held-qualifications/:employeeId', async (req, res) => {
  const employeeId = Number(req.params.employeeId)
  const qualificationId = parseId(req.body?.qualificationId)
  if (qualificationId == null) {
    return res.status(400).json({ error: '資格を選択してください' })
  }
  try {
    await prisma.heldQualification.create({
      data: {
        employeeId,
        qualificationId,
        acquiredDate: parseDate(req.body?.acquiredDate),
        validUntil: parseDate(req.body?.validUntil),
      },
    })
    // 資格追加を本人へ通知
    const q = await prisma.qualification.findUnique({ where: { id: qualificationId }, select: { name: true } })
    await notify({ scope: 'user', recipientId: employeeId, category: 'qual', title: `資格「${q?.name ?? '資格'}」が追加されました`, link: '/shikaku' })
    res.status(201).json({ ok: true })
  } catch (e: any) {
    if (e?.code === 'P2002') return res.status(409).json({ error: 'その資格は既に保有しています' })
    if (e?.code === 'P2003') return res.status(400).json({ error: 'ユーザーまたは資格が存在しません' })
    res.status(500).json({ error: '追加に失敗しました' })
  }
})

// 保有資格の取得日・有効期限を更新
app.put('/api/held-qualifications/:employeeId/:qualificationId', async (req, res) => {
  const employeeId = Number(req.params.employeeId)
  const qualificationId = Number(req.params.qualificationId)
  try {
    await prisma.heldQualification.update({
      where: { employeeId_qualificationId: { employeeId, qualificationId } },
      data: {
        acquiredDate: parseDate(req.body?.acquiredDate),
        validUntil: parseDate(req.body?.validUntil),
      },
    })
    res.json({ ok: true })
  } catch (e: any) {
    if (e?.code === 'P2025') return res.status(404).json({ error: '対象が見つかりません' })
    res.status(500).json({ error: '更新に失敗しました' })
  }
})

// 保有資格を削除
app.delete('/api/held-qualifications/:employeeId/:qualificationId', async (req, res) => {
  const employeeId = Number(req.params.employeeId)
  const qualificationId = Number(req.params.qualificationId)
  try {
    await prisma.heldQualification.delete({
      where: { employeeId_qualificationId: { employeeId, qualificationId } },
    })
    res.status(204).end()
  } catch (e: any) {
    if (e?.code === 'P2025') return res.status(404).json({ error: '対象が見つかりません' })
    res.status(500).json({ error: '削除に失敗しました' })
  }
})

// ===== 筆記試験マスタ =====
// 研修セクションに紐づく設問(YES/NO形式)。合格ラインはセクションのexamPassLine。
const examSectionInclude = { course: { select: { id: true, name: true } } } as const

// 一覧（研修セクション単位。設問数=questionCount、合格ライン=examPassLine）
app.get('/api/exam-sections', async (_req, res) => {
  const sections = await prisma.trainingSection.findMany({
    orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
    include: { ...examSectionInclude, _count: { select: { examQuestions: true } } },
  })
  res.json(
    sections.map(({ _count, ...s }) => ({
      id: s.id,
      name: s.name,
      courseId: s.courseId,
      course: s.course,
      examPassLine: s.examPassLine,
      questionCount: _count.examQuestions,
    })),
  )
})

// 1セクションの筆記試験（設問一覧＋合格ライン）
app.get('/api/exam-sections/:sectionId', async (req, res) => {
  const sectionId = Number(req.params.sectionId)
  const section = await prisma.trainingSection.findUnique({
    where: { id: sectionId },
    include: {
      ...examSectionInclude,
      examQuestions: { orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }] },
    },
  })
  if (!section) return res.status(404).json({ error: '対象の研修セクションが見つかりません' })
  res.json({
    id: section.id,
    name: section.name,
    courseId: section.courseId,
    course: section.course,
    examPassLine: section.examPassLine,
    questions: section.examQuestions,
  })
})

// 合格ライン（正答率％。0〜100。未設定はnull）を保存
app.put('/api/exam-sections/:sectionId', async (req, res) => {
  const sectionId = Number(req.params.sectionId)
  let passLine: number | null = null
  const raw = req.body?.examPassLine
  if (raw !== null && raw !== undefined && raw !== '') {
    const n = Number(raw)
    if (!Number.isFinite(n) || n < 0 || n > 100) {
      return res.status(400).json({ error: '合格ラインは0〜100の数値で入力してください' })
    }
    passLine = Math.round(n)
  }
  try {
    const updated = await prisma.trainingSection.update({
      where: { id: sectionId },
      data: { examPassLine: passLine },
    })
    res.json({ id: updated.id, examPassLine: updated.examPassLine })
  } catch (e: any) {
    if (e?.code === 'P2025') return res.status(404).json({ error: '対象の研修セクションが見つかりません' })
    res.status(500).json({ error: '保存に失敗しました' })
  }
})

// 設問データ（設問内容=必須 / 正解=YES(true)・NO(false) / 解説=任意）
function buildExamQuestionData(body: any) {
  return {
    content: String(body?.content ?? '').trim(),
    answer: Boolean(body?.answer),
    explanation: body?.explanation && String(body.explanation).trim() ? String(body.explanation).trim() : null,
    sortOrder: Number.isFinite(Number(body?.sortOrder)) ? Number(body.sortOrder) : 0,
  }
}

// 設問を追加（セクションに紐づけ）
app.post('/api/exam-sections/:sectionId/questions', async (req, res) => {
  const sectionId = Number(req.params.sectionId)
  if (!req.body?.content || !String(req.body.content).trim()) {
    return res.status(400).json({ error: '設問内容は必須です' })
  }
  try {
    const created = await prisma.examQuestion.create({
      data: { ...buildExamQuestionData(req.body), sectionId },
    })
    res.status(201).json(created)
  } catch (e: any) {
    if (e?.code === 'P2003') return res.status(400).json({ error: '指定の研修セクションが存在しません' })
    res.status(500).json({ error: '作成に失敗しました' })
  }
})

// 設問を更新
app.put('/api/exam-questions/:id', async (req, res) => {
  const id = Number(req.params.id)
  if (!req.body?.content || !String(req.body.content).trim()) {
    return res.status(400).json({ error: '設問内容は必須です' })
  }
  try {
    const updated = await prisma.examQuestion.update({
      where: { id },
      data: buildExamQuestionData(req.body),
    })
    res.json(updated)
  } catch (e: any) {
    if (e?.code === 'P2025') return res.status(404).json({ error: '対象が見つかりません' })
    res.status(500).json({ error: '更新に失敗しました' })
  }
})

// 設問の並び順を一括保存（orderedIds の並びで sortOrder を 0,1,2... に更新）
app.put('/api/exam-sections/:sectionId/questions/order', async (req, res) => {
  const sectionId = Number(req.params.sectionId)
  const orderedIds = Array.isArray(req.body?.orderedIds)
    ? req.body.orderedIds.map((v: unknown) => Number(v)).filter((n: number) => Number.isFinite(n))
    : []
  try {
    await prisma.$transaction(
      orderedIds.map((id: number, idx: number) =>
        prisma.examQuestion.updateMany({ where: { id, sectionId }, data: { sortOrder: idx } }),
      ),
    )
    res.json({ ok: true })
  } catch {
    res.status(500).json({ error: '並び順の保存に失敗しました' })
  }
})

// 設問を削除
app.delete('/api/exam-questions/:id', async (req, res) => {
  const id = Number(req.params.id)
  try {
    await prisma.examQuestion.delete({ where: { id } })
    res.status(204).end()
  } catch (e: any) {
    if (e?.code === 'P2025') return res.status(404).json({ error: '対象が見つかりません' })
    res.status(500).json({ error: '削除に失敗しました' })
  }
})

// ===== 筆記試験申請 =====
// 自己評価画面から申請 → 管理者が承認 → 受験 → 合否。研修コースはセクションから辿る。
const EXAM_RESULTS = ['合格', '不合格']

const applicationInclude = {
  section: { select: { id: true, name: true, course: { select: { id: true, name: true } } } },
  applicant: {
    select: { id: true, employeeNo: true, name: true, department: { select: { id: true, name: true } } },
  },
} as const

// 一覧（クエリで status / applicantId / sectionId による絞り込み可）
app.get('/api/exam-applications', async (req, res) => {
  const where: any = {}
  if (req.query.status === '申請中' || req.query.status === '承認済') where.status = req.query.status
  const applicantId = parseId(req.query.applicantId)
  if (applicantId != null) where.applicantId = applicantId
  const sectionId = parseId(req.query.sectionId)
  if (sectionId != null) where.sectionId = sectionId

  const apps = await prisma.examApplication.findMany({
    where,
    orderBy: { appliedAt: 'desc' },
    include: applicationInclude,
  })
  res.json(apps)
})

// 新規申請（申請者＋セクション。申請日時はサーバー側で記録、status=申請中）
app.post('/api/exam-applications', async (req, res) => {
  const sectionId = parseId(req.body?.sectionId)
  const applicantId = parseId(req.body?.applicantId)
  if (sectionId == null) return res.status(400).json({ error: '研修セクションを指定してください' })
  if (applicantId == null) return res.status(400).json({ error: '申請者を指定してください' })
  try {
    const created = await prisma.examApplication.create({
      data: { sectionId, applicantId, status: '申請中' },
      include: applicationInclude,
    })
    const secName = created.section?.name ?? '研修セクション'
    const appName = created.applicant?.name ?? '社員'
    await notify({ scope: 'user', recipientId: applicantId, category: 'exam', title: `筆記試験を申請しました（${secName}）`, link: '/jiko-hyoka' })
    await notify({ audience: 'admin', category: 'exam', title: `${appName}さんが筆記試験を申請しました（${secName}）`, link: '/admin/hikki-shinsei' })
    res.status(201).json(created)
  } catch (e: any) {
    if (e?.code === 'P2003') return res.status(400).json({ error: 'セクションまたは申請者が存在しません' })
    res.status(500).json({ error: '申請に失敗しました' })
  }
})

// 承認（status=承認済、承認日時を記録）
app.put('/api/exam-applications/:id/approve', async (req, res) => {
  const id = Number(req.params.id)
  try {
    const updated = await prisma.examApplication.update({
      where: { id },
      data: { status: '承認済', approvedAt: new Date() },
      include: applicationInclude,
    })
    const secName = updated.section?.name ?? '研修セクション'
    const appName = updated.applicant?.name ?? '社員'
    if (updated.applicantId != null) {
      await notify({ scope: 'user', recipientId: updated.applicantId, category: 'exam', title: `筆記試験の申請が承認されました（${secName}）`, link: '/jiko-hyoka' })
    }
    await notify({ audience: 'admin', category: 'exam', title: `${appName}さんの筆記試験を承認しました（${secName}）`, link: '/admin/hikki-shinsei' })
    res.json(updated)
  } catch (e: any) {
    if (e?.code === 'P2025') return res.status(404).json({ error: '対象が見つかりません' })
    res.status(500).json({ error: '承認に失敗しました' })
  }
})

// 合否結果の更新（合格 / 不合格 / 未判定=null）
app.put('/api/exam-applications/:id/result', async (req, res) => {
  const id = Number(req.params.id)
  const raw = req.body?.result
  const result = EXAM_RESULTS.includes(raw) ? raw : null
  try {
    const updated = await prisma.examApplication.update({
      where: { id },
      data: { result },
      include: applicationInclude,
    })
    if (updated.applicantId != null && result) {
      const secName = updated.section?.name ?? '研修セクション'
      const appName = updated.applicant?.name ?? '社員'
      await notify({ scope: 'user', recipientId: updated.applicantId, category: 'exam', title: `筆記試験の結果が出ました：${result}（${secName}）`, link: '/jiko-hyoka' })
      if (result === '合格') {
        const locationId = await getEmployeeLocationId(updated.applicantId)
        if (locationId != null) {
          await notify({ scope: 'location', locationId, excludeId: updated.applicantId, category: 'exam', title: `${appName}さんが筆記試験（${secName}）に合格しました`, link: `/shinchoku?employeeId=${updated.applicantId}` })
        }
      }
    }
    res.json(updated)
  } catch (e: any) {
    if (e?.code === 'P2025') return res.status(404).json({ error: '対象が見つかりません' })
    res.status(500).json({ error: '更新に失敗しました' })
  }
})

// 申請を取消（削除）
app.delete('/api/exam-applications/:id', async (req, res) => {
  const id = Number(req.params.id)
  try {
    await prisma.examApplication.delete({ where: { id } })
    res.status(204).end()
  } catch (e: any) {
    if (e?.code === 'P2025') return res.status(404).json({ error: '対象が見つかりません' })
    res.status(500).json({ error: '削除に失敗しました' })
  }
})

// ===== 評価実績（押印） =====
// 社員ごとの自己評価/管理者評価の押印。kind:self|admin, idx:1..3。
app.get('/api/eval-stamps', async (req, res) => {
  const employeeId = parseId(req.query.employeeId)
  // employeeId 省略時は全社員分を返す（点数一覧など集計用）。応答に employeeId を含める。
  const stamps = await prisma.evalStamp.findMany({
    where: employeeId != null ? { employeeId } : undefined,
    select: { employeeId: true, itemId: true, kind: true, idx: true, count: true },
  })
  res.json(stamps)
})

// 押印の設定。value=true/false で押印ON/OFF。count（数値）が来た場合はカウント種別としてその回数を保存（0以下で解除）。
app.put('/api/eval-stamps', async (req, res) => {
  const employeeId = parseId(req.body?.employeeId)
  const itemId = parseId(req.body?.itemId)
  const kind = req.body?.kind === 'admin' ? 'admin' : req.body?.kind === 'self' ? 'self' : null
  const idx = parseId(req.body?.idx)
  const hasCount = typeof req.body?.count === 'number'
  const count = hasCount ? Math.max(0, Math.min(10, Math.trunc(req.body.count))) : 0
  const value = hasCount ? count > 0 : Boolean(req.body?.value)
  const actorName = typeof req.body?.actorName === 'string' ? req.body.actorName : null
  if (employeeId == null || itemId == null || kind == null || idx == null) {
    return res.status(400).json({ error: 'employeeId / itemId / kind / idx が必要です' })
  }
  try {
    if (value) {
      await prisma.evalStamp.upsert({
        where: { employeeId_itemId_kind_idx: { employeeId, itemId, kind, idx } },
        create: { employeeId, itemId, kind, idx, count },
        update: { count },
      })
    } else {
      await prisma.evalStamp.deleteMany({ where: { employeeId, itemId, kind, idx } })
    }
    // 管理者評価（印=ON / カウント=目標到達）を通知。自己評価(self)は通知しない。
    if (kind === 'admin' && value) {
      let notifyPass = !hasCount // 印ON=合格扱い
      if (hasCount) {
        const it = await prisma.trainingItem.findUnique({
          where: { id: itemId },
          select: { section: { select: { adminEval1Count: true, adminEval2Count: true, adminEval3Count: true } } },
        })
        const target = it?.section ? Number((it.section as any)[`adminEval${idx}Count`] ?? 0) : 0
        notifyPass = target > 0 && count >= target // カウントは目標到達時のみ
      }
      if (notifyPass) {
        const [item, subject] = await Promise.all([
          prisma.trainingItem.findUnique({ where: { id: itemId }, select: { title: true } }),
          prisma.employee.findUnique({ where: { id: employeeId }, select: { name: true } }),
        ])
        const itemTitle = item?.title ?? '研修項目'
        await notify({ scope: 'user', recipientId: employeeId, category: 'eval', title: `「${itemTitle}」が評価されました：合格`, link: '/jiko-hyoka', actorName })
        const locationId = await getEmployeeLocationId(employeeId)
        if (locationId != null) {
          await notify({ scope: 'location', locationId, excludeId: employeeId, category: 'eval', title: `${subject?.name ?? '社員'}さんが「${itemTitle}」に合格しました`, link: `/shinchoku?employeeId=${employeeId}`, actorName })
        }
      }
    }
    res.json({ ok: true })
  } catch (e: any) {
    if (e?.code === 'P2003') return res.status(400).json({ error: '社員または研修項目が存在しません' })
    res.status(500).json({ error: '保存に失敗しました' })
  }
})

// ===== 手順書採点 =====
// 社員 × 研修項目 × 管理者評価列(idx) × 手順(stepIndex) × 見るべきポイント(pointIndex) ごとの 合格/不合格。
// 管理者評価の列ごとに採点は独立。全ポイント合格で result='pass'、そうでなければ 'fail'。コメントも保存。
app.get('/api/procedure-grades', async (req, res) => {
  const employeeId = parseId(req.query.employeeId)
  const itemId = parseId(req.query.itemId)
  const idx = parseId(req.query.idx)
  if (employeeId == null || itemId == null || idx == null) {
    return res.status(400).json({ error: 'employeeId / itemId / idx が必要です' })
  }
  const [grades, evalRow] = await Promise.all([
    prisma.procedureGrade.findMany({
      where: { employeeId, itemId, idx },
      select: { stepIndex: true, pointIndex: true, pass: true },
      orderBy: [{ stepIndex: 'asc' }, { pointIndex: 'asc' }],
    }),
    prisma.procedureEval.findUnique({
      where: { employeeId_itemId_idx: { employeeId, itemId, idx } },
      select: { result: true, comment: true, gradedByName: true, updatedAt: true },
    }),
  ])
  res.json({
    grades,
    result: evalRow?.result ?? null,
    comment: evalRow?.comment ?? '',
    gradedByName: evalRow?.gradedByName ?? null,
    gradedAt: evalRow?.updatedAt ?? null,
  })
})

// 社員単位の総合結果一覧（進捗状況画面のスタンプ表示用。項目×列(idx)ごと）
app.get('/api/procedure-evals', async (req, res) => {
  const employeeId = parseId(req.query.employeeId)
  if (employeeId == null) return res.status(400).json({ error: 'employeeId が必要です' })
  const evals = await prisma.procedureEval.findMany({
    where: { employeeId },
    select: { itemId: true, idx: true, result: true, comment: true, gradedByName: true, updatedAt: true },
  })
  res.json(evals.map(({ updatedAt, ...e }) => ({ ...e, gradedAt: updatedAt })))
})

// その社員×項目×列(idx)の採点（ポイント合否＋総合結果＋コメント）をまとめて保存
app.put('/api/procedure-grades', async (req, res) => {
  const employeeId = parseId(req.body?.employeeId)
  const itemId = parseId(req.body?.itemId)
  const idx = parseId(req.body?.idx)
  const grades = Array.isArray(req.body?.grades) ? req.body.grades : null
  const result = req.body?.result === 'pass' ? 'pass' : req.body?.result === 'fail' ? 'fail' : null
  const comment = typeof req.body?.comment === 'string' ? req.body.comment : ''
  const gradedById = parseId(req.body?.gradedById) // 採点者ID（任意）
  const gradedByName = typeof req.body?.gradedByName === 'string' ? req.body.gradedByName : null
  if (employeeId == null || itemId == null || idx == null || grades == null || result == null) {
    return res.status(400).json({ error: 'employeeId / itemId / idx / grades / result が必要です' })
  }
  try {
    await prisma.$transaction([
      prisma.procedureGrade.deleteMany({ where: { employeeId, itemId, idx } }),
      ...grades
        .map((g: any) => ({
          stepIndex: parseId(g?.stepIndex),
          pointIndex: parseId(g?.pointIndex),
          pass: Boolean(g?.pass),
        }))
        .filter((g: any) => g.stepIndex != null && g.pointIndex != null)
        .map((g: any) =>
          prisma.procedureGrade.create({
            data: { employeeId, itemId, idx, stepIndex: g.stepIndex, pointIndex: g.pointIndex, pass: g.pass },
          }),
        ),
      prisma.procedureEval.upsert({
        where: { employeeId_itemId_idx: { employeeId, itemId, idx } },
        create: { employeeId, itemId, idx, result, comment, gradedById, gradedByName },
        update: { result, comment, gradedById, gradedByName },
      }),
    ])
    // 評価結果を通知（本人へ結果、合格なら同拠点の全員へ）
    const [item, subject] = await Promise.all([
      prisma.trainingItem.findUnique({ where: { id: itemId }, select: { title: true } }),
      prisma.employee.findUnique({ where: { id: employeeId }, select: { name: true } }),
    ])
    const itemTitle = item?.title ?? '研修項目'
    const resultJp = result === 'pass' ? '合格' : '不合格'
    await notify({ scope: 'user', recipientId: employeeId, category: 'eval', title: `「${itemTitle}」が評価されました：${resultJp}`, link: '/jiko-hyoka', actorName: gradedByName })
    if (result === 'pass') {
      const locationId = await getEmployeeLocationId(employeeId)
      if (locationId != null) {
        await notify({ scope: 'location', locationId, excludeId: employeeId, category: 'eval', title: `${subject?.name ?? '社員'}さんが「${itemTitle}」に合格しました`, link: `/shinchoku?employeeId=${employeeId}`, actorName: gradedByName })
      }
    }
    res.json({ ok: true })
  } catch (e: any) {
    if (e?.code === 'P2003') return res.status(400).json({ error: '社員または研修項目が存在しません' })
    res.status(500).json({ error: '保存に失敗しました' })
  }
})

// ===== 作業待ちの手動並び順 =====
// 研修項目ごとの、社員の手動並び順。行が存在する項目＝手動並び替え済み。
app.get('/api/waiting-orders', async (req, res) => {
  const itemId = parseId(req.query.itemId)
  const orders = await prisma.waitingOrder.findMany({
    where: itemId != null ? { itemId } : undefined,
    select: { itemId: true, employeeId: true, position: true },
    orderBy: [{ itemId: 'asc' }, { position: 'asc' }],
  })
  res.json(orders)
})

// その項目の並び順をまとめて保存（employeeIds の並びで position 0..N に置き換え）
app.put('/api/waiting-orders', async (req, res) => {
  const itemId = parseId(req.body?.itemId)
  const ids = Array.isArray(req.body?.employeeIds) ? req.body.employeeIds : null
  if (itemId == null || ids == null) {
    return res.status(400).json({ error: 'itemId / employeeIds が必要です' })
  }
  const employeeIds = ids.map((v: any) => parseId(v)).filter((v: any): v is number => v != null)
  try {
    await prisma.$transaction([
      prisma.waitingOrder.deleteMany({ where: { itemId } }),
      ...employeeIds.map((employeeId: number, position: number) =>
        prisma.waitingOrder.create({ data: { itemId, employeeId, position } }),
      ),
    ])
    // 作業待ちの手動変更を通知（各社員へ。1位は特別文言）
    const wItem = await prisma.trainingItem.findUnique({ where: { id: itemId }, select: { title: true } })
    const wTitle = wItem?.title ?? '研修項目'
    for (let p = 0; p < employeeIds.length; p++) {
      const title = p === 0 ? `作業待ちが1位になりました（${wTitle}）` : `作業待ちの順番が変更されました（${wTitle}）`
      await notify({ scope: 'user', recipientId: employeeIds[p], category: 'waiting', title, link: `/machi/${itemId}` })
    }
    res.json({ ok: true })
  } catch (e: any) {
    if (e?.code === 'P2003') return res.status(400).json({ error: '社員または研修項目が存在しません' })
    res.status(500).json({ error: '保存に失敗しました' })
  }
})

// ===== 新着情報（通知） =====
// 一覧。audience=home（既定）はその社員宛て＋所属拠点＋全員宛て、audience=admin は管理画面向け全件。
// 各件に read(既読フラグ) を付与して返す。
app.get('/api/notifications', async (req, res) => {
  const employeeId = parseId(req.query.employeeId)
  const audience = req.query.audience === 'admin' ? 'admin' : 'home'
  if (employeeId == null) return res.status(400).json({ error: 'employeeId が必要です' })
  try {
    let where: any
    if (audience === 'admin') {
      where = { audience: 'admin' }
    } else {
      const locationId = await getEmployeeLocationId(employeeId)
      const or: any[] = [{ scope: 'all' }, { scope: 'user', recipientId: employeeId }]
      if (locationId != null) or.push({ scope: 'location', locationId })
      where = { audience: 'home', OR: or }
    }
    const rows = await prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: { reads: { where: { employeeId }, select: { id: true } } },
    })
    const list = rows
      .filter((n) => n.excludeId == null || n.excludeId !== employeeId)
      .map((n) => ({
        id: n.id,
        category: n.category,
        title: n.title,
        body: n.body,
        link: n.link,
        actorName: n.actorName,
        createdAt: n.createdAt,
        read: n.reads.length > 0,
      }))
    res.json(list)
  } catch (e: any) {
    res.status(500).json({ error: '取得に失敗しました' })
  }
})

// 既読化（1件）。開封した通知を記録。
app.post('/api/notifications/read', async (req, res) => {
  const employeeId = parseId(req.body?.employeeId)
  const notificationId = parseId(req.body?.id)
  if (employeeId == null || notificationId == null) {
    return res.status(400).json({ error: 'employeeId / id が必要です' })
  }
  try {
    await prisma.notificationRead.upsert({
      where: { notificationId_employeeId: { notificationId, employeeId } },
      create: { notificationId, employeeId },
      update: {},
    })
    res.json({ ok: true })
  } catch {
    res.status(500).json({ error: '保存に失敗しました' })
  }
})

// まとめて既読化（表示中の id 配列）。
app.post('/api/notifications/read-all', async (req, res) => {
  const employeeId = parseId(req.body?.employeeId)
  const ids = Array.isArray(req.body?.ids) ? req.body.ids : []
  if (employeeId == null) return res.status(400).json({ error: 'employeeId が必要です' })
  const notificationIds = ids.map((v: any) => parseId(v)).filter((v: any): v is number => v != null)
  try {
    await prisma.notificationRead.createMany({
      data: notificationIds.map((notificationId: number) => ({ notificationId, employeeId })),
      skipDuplicates: true,
    })
    res.json({ ok: true })
  } catch {
    res.status(500).json({ error: '保存に失敗しました' })
  }
})

const TIER_JP: Record<string, string> = { gold: 'ゴールド', silver: 'シルバー', bronze: 'ブロンズ' }

// バッジ付与の通知（クライアントが検知して送信）。本人＋同拠点の全員に出す。dedupeKey で重複防止。
app.post('/api/notifications/badge', async (req, res) => {
  const employeeId = parseId(req.body?.employeeId)
  const label = typeof req.body?.label === 'string' ? req.body.label : null
  const tier = typeof req.body?.tier === 'string' ? req.body.tier : null
  if (employeeId == null || !label || !tier) {
    return res.status(400).json({ error: 'employeeId / label / tier が必要です' })
  }
  const tierJp = TIER_JP[tier] ?? tier
  const emp = await prisma.employee.findUnique({ where: { id: employeeId }, select: { name: true } })
  const name = emp?.name ?? '社員'
  const locationId = await getEmployeeLocationId(employeeId)
  await notify({
    scope: 'user', recipientId: employeeId, category: 'badge',
    title: `${label} バッジ（${tierJp}）を獲得しました`, link: '/dashboard',
    dedupeKey: `badge-self-${employeeId}-${label}-${tier}`,
  })
  if (locationId != null) {
    await notify({
      scope: 'location', locationId, excludeId: employeeId, category: 'badge',
      title: `${name}さんが ${label} バッジ（${tierJp}）を獲得しました`, link: '/dashboard',
      dedupeKey: `badge-loc-${employeeId}-${label}-${tier}`,
    })
  }
  res.json({ ok: true })
})

// 資格期限の通知（クライアントが検知して送信）。本人のみ。kind=added/expired/expiring。
app.post('/api/notifications/qual', async (req, res) => {
  const employeeId = parseId(req.body?.employeeId)
  const qualificationId = parseId(req.body?.qualificationId)
  const kind = req.body?.kind
  const qualName = typeof req.body?.qualName === 'string' ? req.body.qualName : '資格'
  const validUntil = typeof req.body?.validUntil === 'string' ? req.body.validUntil : ''
  if (employeeId == null || !['added', 'expired', 'expiring'].includes(kind)) {
    return res.status(400).json({ error: 'employeeId / kind が必要です' })
  }
  const title =
    kind === 'added'
      ? `資格「${qualName}」が追加されました`
      : kind === 'expired'
        ? `資格「${qualName}」の有効期限が切れています`
        : `資格「${qualName}」の有効期限が近づいています`
  await notify({
    scope: 'user', recipientId: employeeId, category: 'qual', title, link: '/shikaku',
    dedupeKey: `qual-${kind}-${employeeId}-${qualificationId ?? ''}-${validUntil}`,
  })
  res.json({ ok: true })
})

// 社員ごとの「最終得点更新日」＝押印(EvalStamp.createdAt)と手順採点(ProcedureEval.updatedAt)の最新
app.get('/api/score-updates', async (_req, res) => {
  try {
    const [stamps, evals] = await Promise.all([
      prisma.evalStamp.groupBy({ by: ['employeeId'], _max: { createdAt: true } }),
      prisma.procedureEval.groupBy({ by: ['employeeId'], _max: { updatedAt: true } }),
    ])
    const m = new Map<number, Date>()
    for (const s of stamps) if (s._max.createdAt) m.set(s.employeeId, s._max.createdAt)
    for (const e of evals) {
      const cur = m.get(e.employeeId)
      if (e._max.updatedAt && (!cur || e._max.updatedAt > cur)) m.set(e.employeeId, e._max.updatedAt)
    }
    res.json([...m.entries()].map(([employeeId, lastUpdatedAt]) => ({ employeeId, lastUpdatedAt })))
  } catch {
    res.status(500).json({ error: '取得に失敗しました' })
  }
})

// ローカル開発時のみ待受を開始（Vercel 上ではサーバーレス関数として呼び出されるため listen しない）
if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`API サーバー起動: http://localhost:${PORT}`)
  })
}

export default app
