import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  trainingMaterialsApi,
  trainingItemsApi,
  type TrainingItem,
  type TrainingMaterial,
  type TrainingMaterialInput,
  type Procedure,
} from '../lib/api'

const BLOCKS = [1, 2, 3, 4, 5, 6, 7, 8]

const emptyProcedure = (): Procedure => ({ stepHeader: '工程', pointHeader: '見るべきポイント', steps: [] })

function makeEmptyForm(): TrainingMaterialInput {
  const f: any = { note: '', sortOrder: 0, attachmentUrl: '', itemId: null, procedure: emptyProcedure() }
  for (const i of BLOCKS) {
    f[`detail${i}Flag`] = i === 1
    f[`detail${i}Title`] = ''
    f[`detail${i}Content`] = ''
  }
  return f as TrainingMaterialInput
}

function toForm(m: TrainingMaterial): TrainingMaterialInput {
  const f: any = {
    note: m.note ?? '',
    sortOrder: m.sortOrder,
    attachmentUrl: m.attachmentUrl ?? '',
    itemId: m.itemId,
    procedure: m.procedure
      ? {
          stepHeader: m.procedure.stepHeader || '工程',
          pointHeader: m.procedure.pointHeader || '見るべきポイント',
          steps: m.procedure.steps ?? [],
        }
      : emptyProcedure(),
  }
  for (const i of BLOCKS) {
    f[`detail${i}Flag`] = (m as any)[`detail${i}Flag`]
    f[`detail${i}Title`] = (m as any)[`detail${i}Title`] ?? ''
    f[`detail${i}Content`] = (m as any)[`detail${i}Content`] ?? ''
  }
  return f as TrainingMaterialInput
}

export default function KenshuMaterialFormPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isEdit = id != null
  const materialId = id ? Number(id) : null

  const [form, setForm] = useState<TrainingMaterialInput>(makeEmptyForm())
  const [items, setItems] = useState<TrainingItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [tab, setTab] = useState<'detail' | 'procedure'>('detail')

  const set = (k: string, v: any) => setForm((f) => ({ ...f, [k]: v }))
  const get = (k: string) => (form as any)[k]

  // ===== 手順書の操作 =====
  const setProcHeader = (key: 'stepHeader' | 'pointHeader', v: string) =>
    setForm((f) => ({ ...f, procedure: { ...f.procedure, [key]: v } }))
  const updateSteps = (fn: (steps: Procedure['steps']) => Procedure['steps']) =>
    setForm((f) => ({ ...f, procedure: { ...f.procedure, steps: fn(f.procedure.steps) } }))
  const addStep = () => updateSteps((s) => [...s, { name: '', points: [''] }])
  const removeStep = (si: number) => updateSteps((s) => s.filter((_, i) => i !== si))
  const setStepName = (si: number, v: string) =>
    updateSteps((s) => s.map((st, i) => (i === si ? { ...st, name: v } : st)))
  const addPoint = (si: number) =>
    updateSteps((s) => s.map((st, i) => (i === si ? { ...st, points: [...st.points, ''] } : st)))
  const removePoint = (si: number, pi: number) =>
    updateSteps((s) => s.map((st, i) => (i === si ? { ...st, points: st.points.filter((_, p) => p !== pi) } : st)))
  const setPoint = (si: number, pi: number, v: string) =>
    updateSteps((s) => s.map((st, i) => (i === si ? { ...st, points: st.points.map((p, pp) => (pp === pi ? v : p)) } : st)))

  useEffect(() => {
    ;(async () => {
      setLoading(true)
      try {
        setItems(await trainingItemsApi.list())
        if (materialId != null) {
          setForm(toForm(await trainingMaterialsApi.get(materialId)))
        }
      } catch (e: any) {
        setError(e.message)
      } finally {
        setLoading(false)
      }
    })()
  }, [materialId])

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.detail1Title.trim()) {
      setError('研修詳細タイトル1は必須です')
      setTab('detail') // 必須項目のあるタブへ切り替え
      return
    }
    setError('')
    try {
      if (isEdit && materialId != null) await trainingMaterialsApi.update(materialId, form)
      else await trainingMaterialsApi.create(form)
      navigate('/admin/kenshu-material')
    } catch (e: any) {
      setError(e.message)
    }
  }

  async function onDelete() {
    if (materialId == null) return
    if (!confirm('この教材を削除しますか？')) return
    try {
      await trainingMaterialsApi.remove(materialId)
      navigate('/admin/kenshu-material')
    } catch (e: any) {
      setError(e.message)
    }
  }

  const inputCls =
    'w-full rounded-md border border-line px-2 py-1 text-sm text-ink outline-none focus:border-accent'

  if (loading) {
    return <p className="py-8 text-center text-sm text-muted">読み込み中…</p>
  }

  const TABS = [
    { key: 'detail', label: '詳細' },
    { key: 'procedure', label: '手順書' },
  ] as const

  return (
    <div>
      <h1 className="mb-4 text-lg font-bold text-ink2">研修教材{isEdit ? '詳細・編集' : '登録'}</h1>

      {error && (
        <p className="mb-3 rounded-md bg-danger/10 px-3 py-2 text-xs font-bold text-danger">{error}</p>
      )}

      <div className="flex items-start">
        {/* 左タブ（詳細 / 手順書 / メモ） */}
        <div className="-mr-2 flex shrink-0 flex-col gap-2 pt-2">
          {TABS.map((t) => (
            <button
              type="button"
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex w-20 items-center justify-center px-2 py-1.5 text-[11px] font-bold text-white transition-[filter] ${
                tab === t.key ? 'tab-grad-active' : 'tab-grad-idle hover:brightness-95'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <form onSubmit={onSubmit} className="card-grad relative z-10 min-w-0 flex-1 bg-surface/60 p-5">
          {/* === 詳細タブ === */}
          {tab === 'detail' && (
            <>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="flex flex-col gap-1 text-xs font-bold text-muted">
                  研修項目
                  <select
                    value={form.itemId ?? ''}
                    onChange={(e) => set('itemId', e.target.value === '' ? null : Number(e.target.value))}
                    className={inputCls}
                  >
                    <option value="">未設定</option>
                    {items.map((it) => (
                      <option key={it.id} value={it.id}>
                        {it.title}{it.section ? `（${it.section.name}）` : ''}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col gap-1 text-xs font-bold text-muted">
                  添付（画像・動画 URL / ファイル名）
                  <input value={form.attachmentUrl} onChange={(e) => set('attachmentUrl', e.target.value)} placeholder="任意（実アップロードは後日対応）" className={inputCls} />
                </label>
              </div>

              <p className="mb-2 mt-5 border-b border-line2 pb-1 text-sm font-bold text-ink2">研修詳細ブロック 1〜8</p>
              <div className="space-y-3">
                {BLOCKS.map((i) => (
                  <div key={i} className="rounded-md border border-line p-3">
                    <div className="mb-2 flex items-center gap-2">
                      <label className="flex items-center gap-1 text-xs font-bold text-muted">
                        <input type="checkbox" checked={get(`detail${i}Flag`)} onChange={(e) => set(`detail${i}Flag`, e.target.checked)} className="h-4 w-4 accent-brand" />
                        ブロック{i}を表示
                      </label>
                      {i === 1 && <span className="text-[11px] font-bold text-danger">タイトル必須</span>}
                    </div>
                    <input
                      value={get(`detail${i}Title`)}
                      onChange={(e) => set(`detail${i}Title`, e.target.value)}
                      placeholder={`タイトル${i === 1 ? ' *' : ''}`}
                      className={`${inputCls} mb-2`}
                    />
                    <textarea
                      value={get(`detail${i}Content`)}
                      onChange={(e) => set(`detail${i}Content`, e.target.value)}
                      placeholder="内容"
                      rows={2}
                      className={inputCls}
                    />
                  </div>
                ))}
              </div>

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
            </>
          )}

          {/* === 手順書タブ === */}
          {tab === 'procedure' && (
            <>
              <p className="mb-2 border-b border-line2 pb-1 text-sm font-bold text-ink2">手順書（工程・見るべきポイント）</p>
              <div className="mb-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="flex flex-col gap-1 text-xs font-bold text-muted">
                  工程の見出し
                  <input value={form.procedure.stepHeader} onChange={(e) => setProcHeader('stepHeader', e.target.value)} placeholder="工程" className={inputCls} />
                </label>
                <label className="flex flex-col gap-1 text-xs font-bold text-muted">
                  ポイントの見出し
                  <input value={form.procedure.pointHeader} onChange={(e) => setProcHeader('pointHeader', e.target.value)} placeholder="見るべきポイント" className={inputCls} />
                </label>
              </div>

              <div className="space-y-3">
                {form.procedure.steps.map((step, si) => (
                  <div key={si} className="rounded-md border border-line p-3">
                    <div className="mb-2 flex items-center gap-2">
                      <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-brand text-[11px] font-bold text-white">{si + 1}</span>
                      <input
                        value={step.name}
                        onChange={(e) => setStepName(si, e.target.value)}
                        placeholder="工程名（例：作業準備）"
                        className={`${inputCls} font-bold`}
                      />
                      <button type="button" onClick={() => removeStep(si)} className="shrink-0 rounded border border-danger/60 px-2 py-1 text-xs font-bold text-danger hover:bg-danger/5">
                        工程削除
                      </button>
                    </div>
                    <div className="space-y-1 pl-8">
                      <span className="text-[11px] font-bold text-muted">{form.procedure.pointHeader || '見るべきポイント'}</span>
                      {step.points.map((pt, pi) => (
                        <div key={pi} className="flex items-center gap-2">
                          <span className="w-5 shrink-0 text-center text-[11px] text-muted">{pi + 1}</span>
                          <input value={pt} onChange={(e) => setPoint(si, pi, e.target.value)} placeholder="ポイント" className={inputCls} />
                          <button type="button" onClick={() => removePoint(si, pi)} className="shrink-0 rounded border border-line2 px-2 py-1 text-xs text-muted hover:bg-line/40">
                            ×
                          </button>
                        </div>
                      ))}
                      <button type="button" onClick={() => addPoint(si)} className="mt-1 rounded border border-brand/60 px-3 py-1 text-xs font-bold text-brand hover:bg-brand/5">
                        ＋ ポイント追加
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <button type="button" onClick={addStep} className="mt-3 rounded-md bg-accent px-4 py-1.5 text-xs font-bold text-white hover:brightness-95">
                ＋ 工程を追加
              </button>
            </>
          )}

          {/* 操作（全タブ共通） */}
          <div className="mt-6 flex flex-wrap gap-2 border-t border-line2 pt-4">
            <button type="submit" className="rounded-md bg-brand px-5 py-1.5 text-xs font-bold text-white hover:bg-brand-deep">
              {isEdit ? '保存' : '登録'}
            </button>
            <button type="button" onClick={() => navigate('/admin/kenshu-material')} className="rounded-md bg-disabled px-5 py-1.5 text-xs font-bold text-white hover:brightness-95">
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
    </div>
  )
}
