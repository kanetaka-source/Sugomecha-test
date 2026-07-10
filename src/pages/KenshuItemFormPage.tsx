import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  trainingItemsApi,
  trainingSectionsApi,
  qualificationsApi,
  type TrainingItem,
  type TrainingItemInput,
  type TrainingSection,
  type Qualification,
} from '../lib/api'

const emptyForm: TrainingItemInput = {
  title: '',
  note: '',
  sortOrder: 0,
  sectionId: null,
  flag1: true, value1: '',
  flag2: false, value2: '',
  flag3: false, value3: '',
  flag4: false, value4: '',
  flag5: false, value5: '',
  requiredQualificationIds: [],
}

function toForm(it: TrainingItem): TrainingItemInput {
  return {
    title: it.title,
    note: it.note ?? '',
    sortOrder: it.sortOrder,
    sectionId: it.sectionId,
    flag1: it.flag1, value1: it.value1 ?? '',
    flag2: it.flag2, value2: it.value2 ?? '',
    flag3: it.flag3, value3: it.value3 ?? '',
    flag4: it.flag4, value4: it.value4 ?? '',
    flag5: it.flag5, value5: it.value5 ?? '',
    requiredQualificationIds: it.requiredQualifications.map((q) => q.id),
  }
}

export default function KenshuItemFormPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isEdit = id != null
  const itemId = id ? Number(id) : null

  const [form, setForm] = useState<TrainingItemInput>({ ...emptyForm })
  const [sections, setSections] = useState<TrainingSection[]>([])
  const [quals, setQuals] = useState<Qualification[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const set = (k: keyof TrainingItemInput, v: any) => setForm((f) => ({ ...f, [k]: v }))
  const get = (k: string) => (form as any)[k]

  const MAX_QUALS = 5

  // プルダウン1枠の選択を反映（空＝その枠を削除）
  function setQualSlot(i: number, value: string) {
    setForm((f) => {
      const next = [...f.requiredQualificationIds]
      if (value === '') next.splice(i, 1)
      else next[i] = Number(value)
      return { ...f, requiredQualificationIds: next }
    })
  }

  useEffect(() => {
    ;(async () => {
      setLoading(true)
      try {
        const [secs, qs] = await Promise.all([trainingSectionsApi.list(), qualificationsApi.list()])
        setSections(secs)
        setQuals(qs)
        if (itemId != null) {
          setForm(toForm(await trainingItemsApi.get(itemId)))
        }
      } catch (e: any) {
        setError(e.message)
      } finally {
        setLoading(false)
      }
    })()
  }, [itemId])

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.title.trim()) {
      setError('研修項目タイトルは必須です')
      return
    }
    setError('')
    try {
      if (isEdit && itemId != null) await trainingItemsApi.update(itemId, form)
      else await trainingItemsApi.create(form)
      navigate('/admin/kenshu-item')
    } catch (e: any) {
      setError(e.message)
    }
  }

  async function onDelete() {
    if (itemId == null) return
    if (!confirm(`「${form.title}」を削除しますか？`)) return
    try {
      await trainingItemsApi.remove(itemId)
      navigate('/admin/kenshu-item')
    } catch (e: any) {
      setError(e.message)
    }
  }

  const inputCls =
    'w-full rounded-md border border-line px-2 py-1 text-sm text-ink outline-none focus:border-accent'

  // 選択中セクション（値の見出しに使う）
  const selSec = sections.find((s) => String(s.id) === String(form.sectionId))
  const headerLabel = (i: number) => (selSec && (selSec as any)[`header${i}Name`]) || `研修項目${i}`
  const visibleRows = [1, 2, 3, 4, 5].filter((i) => !selSec || (selSec as any)[`header${i}Flag`])

  if (loading) {
    return <p className="py-8 text-center text-sm text-muted">読み込み中…</p>
  }

  return (
    <div>
      <h1 className="mb-4 text-lg font-bold text-ink2">
        研修項目{isEdit ? '詳細・編集' : '登録'}
      </h1>

      {error && (
        <p className="mb-3 rounded-md bg-danger/10 px-3 py-2 text-xs font-bold text-danger">{error}</p>
      )}

      <form onSubmit={onSubmit} className="card-grad bg-surface/60 p-5">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-xs font-bold text-muted">
            研修セクション
            <select
              value={form.sectionId ?? ''}
              onChange={(e) => set('sectionId', e.target.value === '' ? null : Number(e.target.value))}
              className={inputCls}
            >
              <option value="">未設定</option>
              {sections.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}{s.course ? `（${s.course.name}）` : ''}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs font-bold text-muted">
            <span>研修項目タイトル <span className="text-danger">*</span></span>
            <input value={form.title} onChange={(e) => set('title', e.target.value)} placeholder="タイトル" className={inputCls} />
          </label>
        </div>

        {/* 値（セクションの列見出しに対応） */}
        <p className="mb-1 mt-5 border-b border-line2 pb-1 text-sm font-bold text-ink2">
          各列の値{selSec ? `（${selSec.name} の列構成）` : ''}
        </p>
        {visibleRows.map((i) => (
          <div key={i} className="flex items-center gap-3 py-1">
            <label className="flex w-28 shrink-0 items-center gap-1 text-xs font-bold text-muted">
              <input type="checkbox" checked={get(`flag${i}`)} onChange={(e) => set(`flag${i}` as any, e.target.checked)} className="h-4 w-4 accent-brand" />
              {headerLabel(i)}
            </label>
            <input value={get(`value${i}`)} onChange={(e) => set(`value${i}` as any, e.target.value)} placeholder="値" className={inputCls} />
          </div>
        ))}

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-xs font-bold text-muted">
            備考
            <input value={form.note} onChange={(e) => set('note', e.target.value)} placeholder="任意" className={inputCls} />
          </label>
          <label className="flex flex-col gap-1 text-xs font-bold text-muted">
            表示順
            <input type="number" value={form.sortOrder} onChange={(e) => set('sortOrder', Number(e.target.value))} className={inputCls} />
          </label>
        </div>

        {/* 必要資格（資格マスタから選択・最大5件） */}
        <p className="mb-1 mt-5 border-b border-line2 pb-1 text-sm font-bold text-ink2">必要資格（資格マスタから選択・最大{MAX_QUALS}件）</p>
        {quals.length === 0 ? (
          <p className="py-2 text-xs text-muted">資格マスタに資格が登録されていません。</p>
        ) : (
          <div className="grid grid-cols-1 gap-3 py-1 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: Math.min(form.requiredQualificationIds.length + 1, MAX_QUALS) }, (_, i) => {
              const current = form.requiredQualificationIds[i]
              // 他の枠で選択済みの資格は候補から除外（重複防止）
              const otherIds = form.requiredQualificationIds.filter((_, idx) => idx !== i)
              const opts = quals.filter((q) => !otherIds.includes(q.id))
              return (
                <label key={i} className="flex flex-col gap-1 text-xs font-bold text-muted">
                  必要資格 {i + 1}
                  <select value={current ?? ''} onChange={(e) => setQualSlot(i, e.target.value)} className={inputCls}>
                    <option value="">未設定</option>
                    {opts.map((q) => (
                      <option key={q.id} value={q.id}>
                        {q.name}{q.category ? `（${q.category}）` : ''}
                      </option>
                    ))}
                  </select>
                </label>
              )
            })}
          </div>
        )}

        <div className="mt-6 flex flex-wrap gap-2">
          <button type="submit" className="rounded-md bg-brand px-5 py-1.5 text-xs font-bold text-white hover:bg-brand-deep">
            {isEdit ? '保存' : '登録'}
          </button>
          <button type="button" onClick={() => navigate('/admin/kenshu-item')} className="rounded-md bg-disabled px-5 py-1.5 text-xs font-bold text-white hover:brightness-95">
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
