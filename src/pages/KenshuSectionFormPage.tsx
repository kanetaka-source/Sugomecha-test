import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  trainingSectionsApi,
  trainingCoursesApi,
  EVAL_TYPES,
  EVAL_COUNT_MAX,
  type TrainingCourse,
  type TrainingSection,
  type TrainingSectionInput,
} from '../lib/api'

const emptyForm: TrainingSectionInput = {
  name: '',
  note: '',
  sortOrder: 0,
  courseId: null,
  header1Flag: true, header1Name: '',
  header2Flag: false, header2Name: '',
  header3Flag: false, header3Name: '',
  header4Flag: false, header4Name: '',
  header5Flag: false, header5Name: '',
  selfEval1Flag: false, selfEval1Type: '印', selfEval1Name: '', selfEval1Count: 0,
  selfEval2Flag: false, selfEval2Type: '印', selfEval2Name: '', selfEval2Count: 0,
  adminEval1Flag: false, adminEval1Type: '印', adminEval1Name: '', adminEval1Count: 0,
  adminEval2Flag: false, adminEval2Type: '印', adminEval2Name: '', adminEval2Count: 0,
  adminEval3Flag: false, adminEval3Type: '印', adminEval3Name: '', adminEval3Count: 0,
}

// 取得した既存データ → フォーム入力へ変換
function toForm(s: TrainingSection): TrainingSectionInput {
  const f: any = { ...emptyForm, name: s.name, note: s.note ?? '', sortOrder: s.sortOrder, courseId: s.courseId }
  for (let i = 1; i <= 5; i++) {
    f[`header${i}Flag`] = (s as any)[`header${i}Flag`]
    f[`header${i}Name`] = (s as any)[`header${i}Name`] ?? ''
  }
  for (const [prefix, n] of [['selfEval', 2], ['adminEval', 3]] as const) {
    for (let i = 1; i <= n; i++) {
      f[`${prefix}${i}Flag`] = (s as any)[`${prefix}${i}Flag`]
      f[`${prefix}${i}Type`] = (s as any)[`${prefix}${i}Type`] ?? '印'
      f[`${prefix}${i}Name`] = (s as any)[`${prefix}${i}Name`] ?? ''
      f[`${prefix}${i}Count`] = (s as any)[`${prefix}${i}Count`] ?? 0
    }
  }
  return f as TrainingSectionInput
}

export default function KenshuSectionFormPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isEdit = id != null
  const sectionId = id ? Number(id) : null

  const [form, setForm] = useState<TrainingSectionInput>({ ...emptyForm })
  const [courses, setCourses] = useState<TrainingCourse[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const set = (k: keyof TrainingSectionInput, v: any) => setForm((f) => ({ ...f, [k]: v }))
  const get = (k: string) => (form as any)[k]

  useEffect(() => {
    ;(async () => {
      setLoading(true)
      try {
        const cs = await trainingCoursesApi.list()
        setCourses(cs)
        if (sectionId != null) {
          const s = await trainingSectionsApi.get(sectionId)
          setForm(toForm(s))
        }
      } catch (e: any) {
        setError(e.message)
      } finally {
        setLoading(false)
      }
    })()
  }, [sectionId])

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) {
      setError('研修セクション名は必須です')
      return
    }
    setError('')
    try {
      if (isEdit && sectionId != null) {
        await trainingSectionsApi.update(sectionId, form)
      } else {
        await trainingSectionsApi.create(form)
      }
      navigate('/admin/kenshu-section')
    } catch (e: any) {
      setError(e.message)
    }
  }

  async function onDelete() {
    if (sectionId == null) return
    if (!confirm(`「${form.name}」を削除しますか？`)) return
    try {
      await trainingSectionsApi.remove(sectionId)
      navigate('/admin/kenshu-section')
    } catch (e: any) {
      setError(e.message)
    }
  }

  const inputCls =
    'w-full rounded-md border border-line px-2 py-1 text-sm text-ink outline-none focus:border-accent'

  // 入力欄の共通スタイル（幅指定なし。幅は各所で付与）
  const fieldBase =
    'rounded-md border border-line px-2 py-1 text-sm text-ink outline-none focus:border-accent'

  // フラグ＋名前（＋種別）の行。※コンポーネント化せず関数で描画（再マウント＝入力フォーカス喪失を防ぐ）
  function renderConfigRow(prefix: string, i: number, withType = false) {
    const flagKey = `${prefix}${i}Flag`
    const nameKey = `${prefix}${i}Name`
    const typeKey = `${prefix}${i}Type`
    const countKey = `${prefix}${i}Count`
    const isCount = get(typeKey) === 'カウント'
    return (
      <div key={`${prefix}-${i}`} className="flex items-center gap-3 py-1">
        <label className="flex w-14 shrink-0 items-center gap-1 text-xs font-bold text-muted">
          <input type="checkbox" checked={get(flagKey)} onChange={(e) => set(flagKey as any, e.target.checked)} className="h-4 w-4 accent-brand" />
          {i}
        </label>
        {withType && (
          <select
            value={get(typeKey)}
            onChange={(e) => {
              const v = e.target.value
              set(typeKey as any, v)
              // カウントに切り替えたら回数を1以上に（未設定なら3）、カウント以外なら0に
              if (v === 'カウント' && !(get(countKey) > 0)) set(countKey as any, 3)
              if (v !== 'カウント') set(countKey as any, 0)
            }}
            className={`${fieldBase} w-28 shrink-0`}
          >
            {EVAL_TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        )}
        {withType && isCount && (
          <label className="flex shrink-0 items-center gap-1 text-[11px] font-bold text-muted">
            回数
            <input
              type="number"
              min={1}
              max={EVAL_COUNT_MAX}
              value={get(countKey) || 1}
              onChange={(e) => {
                const n = Math.max(1, Math.min(EVAL_COUNT_MAX, Math.trunc(Number(e.target.value) || 1)))
                set(countKey as any, n)
              }}
              className={`${fieldBase} w-16`}
            />
            <span className="text-muted">/ 最大{EVAL_COUNT_MAX}</span>
          </label>
        )}
        <input
          value={get(nameKey)}
          onChange={(e) => set(nameKey as any, e.target.value)}
          placeholder="表示名"
          className={`${fieldBase} min-w-0 flex-1`}
        />
      </div>
    )
  }

  const sectionTitle = (text: string) => (
    <h2 className="mb-2 mt-5 border-b border-line2 pb-1 text-sm font-bold text-ink2">{text}</h2>
  )

  if (loading) {
    return <p className="py-8 text-center text-sm text-muted">読み込み中…</p>
  }

  // 紐づく研修コース名（見出し表示用）
  const linkedCourseName = courses.find((c) => c.id === form.courseId)?.name ?? null

  return (
    <div>
      <h1 className="mb-1 text-lg font-bold text-ink2">
        研修セクション{isEdit ? '詳細・編集' : '登録'}
      </h1>
      <p className="mb-4 text-sm text-muted">
        研修コース：
        <span className="font-bold text-ink2">{linkedCourseName ?? '未設定'}</span>
      </p>

      {error && (
        <p className="mb-3 rounded-md bg-danger/10 px-3 py-2 text-xs font-bold text-danger">{error}</p>
      )}

      <form onSubmit={onSubmit} className="card-grad bg-surface/60 p-5">
        {/* 基本情報 */}
        {sectionTitle('基本情報')}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-xs font-bold text-muted">
            <span>研修セクション名 <span className="text-danger">*</span></span>
            <input value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="セクション名" className={inputCls} />
          </label>
          <label className="flex flex-col gap-1 text-xs font-bold text-muted">
            研修コース
            <select value={form.courseId ?? ''} onChange={(e) => set('courseId', e.target.value === '' ? null : Number(e.target.value))} className={inputCls}>
              <option value="">未設定</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs font-bold text-muted">
            表示順
            <input type="number" value={form.sortOrder} onChange={(e) => set('sortOrder', Number(e.target.value))} className={inputCls} />
          </label>
          <label className="flex flex-col gap-1 text-xs font-bold text-muted">
            備考
            <input value={form.note} onChange={(e) => set('note', e.target.value)} placeholder="任意" className={inputCls} />
          </label>
        </div>

        {/* 研修ヘッダー（列見出し） */}
        {sectionTitle('研修ヘッダー（表の列見出し）1〜5')}
        <p className="mb-1 text-[11px] text-muted">チェックを入れた列が自己評価テーブルに表示されます。</p>
        {[1, 2, 3, 4, 5].map((i) => renderConfigRow('header', i))}

        {/* 自己評価 */}
        {sectionTitle('自己評価 列 1〜2')}
        {[1, 2].map((i) => renderConfigRow('selfEval', i, true))}

        {/* 管理者評価 */}
        {sectionTitle('管理者評価 列 1〜3')}
        {[1, 2, 3].map((i) => renderConfigRow('adminEval', i, true))}

        {/* 操作 */}
        <div className="mt-6 flex flex-wrap gap-2">
          <button type="submit" className="rounded-md bg-brand px-5 py-1.5 text-xs font-bold text-white hover:bg-brand-deep">
            {isEdit ? '保存' : '登録'}
          </button>
          <button type="button" onClick={() => navigate('/admin/kenshu-section')} className="rounded-md bg-disabled px-5 py-1.5 text-xs font-bold text-white hover:brightness-95">
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
