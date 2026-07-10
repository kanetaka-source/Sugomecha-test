import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  trainingItemsApi,
  trainingMaterialsApi,
  type TrainingItem,
  type TrainingMaterial,
} from '../lib/api'

const BLOCKS = [1, 2, 3, 4, 5, 6, 7, 8]

export default function KenshuDetailPage() {
  const { itemId } = useParams()
  const navigate = useNavigate()
  const id = Number(itemId)

  const [item, setItem] = useState<TrainingItem | null>(null)
  const [material, setMaterial] = useState<TrainingMaterial | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [tab, setTab] = useState<'detail' | 'procedure'>('detail')

  useEffect(() => {
    ;(async () => {
      setLoading(true)
      try {
        const [it, materials] = await Promise.all([
          trainingItemsApi.get(id),
          trainingMaterialsApi.list(),
        ])
        setItem(it)
        setMaterial(materials.find((m) => m.itemId === id) ?? null)
      } catch (e: any) {
        setError(e.message)
      } finally {
        setLoading(false)
      }
    })()
  }, [id])

  if (loading) {
    return <p className="py-8 text-center text-sm text-muted">読み込み中…</p>
  }

  // 表示する詳細ブロック（フラグON かつ タイトルか内容あり）
  const detailBlocks = material
    ? BLOCKS.filter(
        (i) =>
          (material as any)[`detail${i}Flag`] &&
          ((material as any)[`detail${i}Title`] || (material as any)[`detail${i}Content`]),
      )
    : []
  const procedure = material?.procedure ?? null

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-ink2">研修詳細</h1>
          <p className="text-sm text-muted">
            {item?.section?.course ? `${item.section.course.name} / ` : ''}
            {item?.section ? `${item.section.name} / ` : ''}
            <span className="font-bold text-ink2">{item?.title ?? ''}</span>
          </p>
        </div>
        <button
          onClick={() => navigate(-1)}
          className="rounded-md bg-disabled px-4 py-1.5 text-xs font-bold text-white hover:brightness-95"
        >
          戻る
        </button>
      </div>

      {error && (
        <p className="mb-3 rounded-md bg-danger/10 px-3 py-2 text-xs font-bold text-danger">{error}</p>
      )}

      {!material ? (
        <div className="card-grad bg-surface/70 p-8 text-center text-sm text-muted">
          この項目の教材が登録されていません。
        </div>
      ) : (
        <div className="flex items-start">
          {/* 左タブ（詳細 / 手順書） */}
          <div className="-mr-2 flex shrink-0 flex-col gap-2 pt-2">
            {([
              { key: 'detail', label: '詳細' },
              { key: 'procedure', label: '手順書' },
            ] as const).map((t) => (
              <button
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

          <div className="card-grad relative z-10 min-w-0 flex-1 bg-surface/70 p-5 shadow-sm">
            {/* === 詳細タブ === */}
            {tab === 'detail' && (
              <div className="space-y-4">
                {detailBlocks.length === 0 ? (
                  <p className="py-6 text-center text-sm text-muted">詳細が登録されていません。</p>
                ) : (
                  detailBlocks.map((i) => (
                    <div key={i} className="rounded-md border border-line bg-white/60 p-3">
                      <p className="mb-1 text-sm font-bold text-ink2">{(material as any)[`detail${i}Title`]}</p>
                      <p className="whitespace-pre-line text-sm leading-relaxed text-ink">
                        {(material as any)[`detail${i}Content`] || '—'}
                      </p>
                    </div>
                  ))
                )}
                {material.attachmentUrl && (
                  <p className="text-xs text-muted">
                    添付：<span className="text-ink">{material.attachmentUrl}</span>
                  </p>
                )}
              </div>
            )}

            {/* === 手順書タブ === */}
            {tab === 'procedure' && (
              <>
                {!procedure || procedure.steps.length === 0 ? (
                  <p className="py-6 text-center text-sm text-muted">手順書が登録されていません。</p>
                ) : (
                  <div>
                    {/* ヘッダー */}
                    <div className="grid grid-cols-[48px_120px_minmax(0,1fr)] gap-3 border-b border-line2 pb-2 text-center text-[13px] font-bold text-ink2">
                      <span>No</span>
                      <span>{procedure.stepHeader || '工程'}</span>
                      <span>{procedure.pointHeader || '見るべきポイント'}</span>
                    </div>
                    {procedure.steps.map((step, si) => (
                      <div
                        key={si}
                        className="grid grid-cols-[48px_120px_minmax(0,1fr)] items-start gap-3 border-b border-line py-3 text-sm"
                      >
                        <span className="text-center font-bold text-ink2">{si + 1}</span>
                        <span className="font-bold text-ink2">{step.name || '—'}</span>
                        <div className="space-y-1">
                          {step.points.filter((p) => p.trim()).length === 0 ? (
                            <span className="text-muted">—</span>
                          ) : (
                            step.points
                              .filter((p) => p.trim())
                              .map((p, pi) => (
                                <div key={pi} className="flex items-center gap-2 rounded-md border border-line bg-white px-2 py-1">
                                  <span className="grid h-4 w-4 shrink-0 place-items-center rounded-full bg-gauge text-[9px] font-bold text-white">
                                    {pi + 1}
                                  </span>
                                  <span className="text-[12px] text-ink">{p}</span>
                                </div>
                              ))
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
