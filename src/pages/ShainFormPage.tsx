import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  employeesApi,
  departmentsApi,
  trainingCoursesApi,
  EMPLOYEE_ROLES,
  type Department,
  type Employee,
  type TrainingCourse,
} from '../lib/api'

const toDateInput = (iso: string | null) => (iso ? iso.slice(0, 10) : '')

const emptyForm = {
  employeeNo: '',
  name: '',
  role: '受講者',
  phone: '',
  birthDate: '',
  hireDate: '',
  assignedDate: '',
  password: '',
  departmentId: '' as string, // '' = 未設定
  enrolledCourseIds: [] as number[], // 履修コース
}

function toForm(e: Employee): typeof emptyForm {
  return {
    employeeNo: e.employeeNo,
    name: e.name,
    role: e.role,
    phone: e.phone ?? '',
    birthDate: toDateInput(e.birthDate),
    hireDate: toDateInput(e.hireDate),
    assignedDate: toDateInput(e.assignedDate),
    password: '',
    departmentId: e.departmentId != null ? String(e.departmentId) : '',
    enrolledCourseIds: e.enrolledCourses?.map((c) => c.id) ?? [],
  }
}

export default function ShainFormPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isEdit = id != null
  const employeeId = id ? Number(id) : null

  const [form, setForm] = useState({ ...emptyForm })
  const [departments, setDepartments] = useState<Department[]>([])
  const [courses, setCourses] = useState<TrainingCourse[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }))

  // 履修コースのチェックON/OFF
  const toggleCourse = (courseId: number) =>
    setForm((f) => ({
      ...f,
      enrolledCourseIds: f.enrolledCourseIds.includes(courseId)
        ? f.enrolledCourseIds.filter((id) => id !== courseId)
        : [...f.enrolledCourseIds, courseId],
    }))

  useEffect(() => {
    ;(async () => {
      setLoading(true)
      try {
        const [depts, cs] = await Promise.all([departmentsApi.list(), trainingCoursesApi.list()])
        setDepartments(depts)
        setCourses(cs)
        if (employeeId != null) {
          setForm(toForm(await employeesApi.get(employeeId)))
        }
      } catch (e: any) {
        setError(e.message)
      } finally {
        setLoading(false)
      }
    })()
  }, [employeeId])

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.employeeNo.trim() || !form.name.trim()) {
      setError('社員番号と氏名は必須です')
      return
    }
    setError('')
    const payload = {
      employeeNo: form.employeeNo.trim(),
      name: form.name.trim(),
      role: form.role,
      phone: form.phone.trim(),
      birthDate: form.birthDate,
      hireDate: form.hireDate,
      assignedDate: form.assignedDate,
      password: form.password,
      departmentId: form.departmentId === '' ? null : Number(form.departmentId),
      enrolledCourseIds: form.enrolledCourseIds,
    }
    try {
      if (isEdit && employeeId != null) await employeesApi.update(employeeId, payload)
      else await employeesApi.create(payload)
      navigate('/admin/shain')
    } catch (e: any) {
      setError(e.message)
    }
  }

  async function onDelete() {
    if (employeeId == null) return
    if (!confirm(`「${form.name}」を削除しますか？`)) return
    try {
      await employeesApi.remove(employeeId)
      navigate('/admin/shain')
    } catch (e: any) {
      setError(e.message)
    }
  }

  const inputCls =
    'w-full rounded-md border border-line px-2 py-1 text-sm text-ink outline-none focus:border-accent'
  const labelCls = 'flex flex-col gap-1 text-xs font-bold text-muted'

  if (loading) {
    return <p className="py-8 text-center text-sm text-muted">読み込み中…</p>
  }

  return (
    <div>
      <h1 className="mb-4 text-lg font-bold text-ink2">社員{isEdit ? '詳細・編集' : '登録'}</h1>

      {error && (
        <p className="mb-3 rounded-md bg-danger/10 px-3 py-2 text-xs font-bold text-danger">{error}</p>
      )}

      <form onSubmit={onSubmit} className="card-grad bg-surface/60 p-5">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <label className={labelCls}>
            <span>社員番号 <span className="text-danger">*</span></span>
            <input value={form.employeeNo} onChange={(e) => set('employeeNo', e.target.value)} placeholder="E004" className={inputCls} />
          </label>
          <label className={labelCls}>
            <span>氏名 <span className="text-danger">*</span></span>
            <input value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="氏名" className={inputCls} />
          </label>
          <label className={labelCls}>
            ロール
            <select value={form.role} onChange={(e) => set('role', e.target.value)} className={inputCls}>
              {EMPLOYEE_ROLES.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </label>
          <label className={labelCls}>
            所属部署
            <select value={form.departmentId} onChange={(e) => set('departmentId', e.target.value)} className={inputCls}>
              <option value="">未設定</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}{d.location ? `（${d.location.name}）` : ''}
                </option>
              ))}
            </select>
          </label>
          <label className={labelCls}>
            電話番号
            <input value={form.phone} onChange={(e) => set('phone', e.target.value)} placeholder="090-0000-0000" className={inputCls} />
          </label>
          <label className={labelCls}>
            パスワード
            <input type="password" value={form.password} onChange={(e) => set('password', e.target.value)} placeholder={isEdit ? '変更時のみ入力' : ''} className={inputCls} />
          </label>
          <label className={labelCls}>
            生年月日
            <input type="date" value={form.birthDate} onChange={(e) => set('birthDate', e.target.value)} className={inputCls} />
          </label>
          <label className={labelCls}>
            入社年月日
            <input type="date" value={form.hireDate} onChange={(e) => set('hireDate', e.target.value)} className={inputCls} />
          </label>
          <label className={labelCls}>
            配属日
            <input type="date" value={form.assignedDate} onChange={(e) => set('assignedDate', e.target.value)} className={inputCls} />
          </label>
        </div>

        {/* 履修コース（研修コースマスタから選択） */}
        <div className="mt-5">
          <p className={`${labelCls} mb-2`}>履修コース（研修コースマスタから選択）</p>
          {courses.length === 0 ? (
            <p className="text-xs text-muted">研修コースが登録されていません。</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {courses.map((c) => {
                const checked = form.enrolledCourseIds.includes(c.id)
                return (
                  <label
                    key={c.id}
                    className={`flex cursor-pointer items-center gap-2 rounded-md border px-3 py-1.5 text-xs font-bold transition-colors ${
                      checked
                        ? 'border-brand bg-brand/10 text-brand'
                        : 'border-line text-ink hover:border-brand/50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleCourse(c.id)}
                      className="h-3.5 w-3.5 accent-brand"
                    />
                    {c.name}
                  </label>
                )
              })}
            </div>
          )}
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          <button type="submit" className="rounded-md bg-brand px-5 py-1.5 text-xs font-bold text-white hover:bg-brand-deep">
            {isEdit ? '保存' : '登録'}
          </button>
          <button type="button" onClick={() => navigate('/admin/shain')} className="rounded-md bg-disabled px-5 py-1.5 text-xs font-bold text-white hover:brightness-95">
            一覧へ戻る
          </button>
          {isEdit && (
            <button type="button" onClick={onDelete} className="ml-auto rounded-md border border-danger/60 px-5 py-1.5 text-xs font-bold text-danger hover:bg-danger/5">
              削除
            </button>
          )}
        </div>
      </form>
    </div>
  )
}
