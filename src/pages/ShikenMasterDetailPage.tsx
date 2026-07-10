import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { examApi, type ExamSectionDetail, type ExamQuestion } from '../lib/api'

// YES/NO バッジ
function AnswerBadge({ answer }: { answer: boolean }) {
  return (
    <span
      className={`inline-grid h-7 min-w-[48px] place-items-center rounded-full px-2 text-xs font-bold text-white ${
        answer ? 'bg-brand' : 'bg-disabled'
      }`}
    >
      {answer ? 'YES' : 'NO'}
    </span>
  )
}

export default function ShikenMasterDetailPage() {
  const { sectionId } = useParams()
  const navigate = useNavigate()
  const id = Number(sectionId)

  const [data, setData] = useState<ExamSectionDetail | null>(null)
  const [questions, setQuestions] = useState<ExamQuestion[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // 並び替え（ドラッグ＆ドロップ）
  const dragIndex = useRef<number | null>(null)
  const [overIndex, setOverIndex] = useState<number | null>(null)

  // 合格ライン
  const [passLine, setPassLine] = useState('')
  const [passMsg, setPassMsg] = useState('')

  // 追加フォーム
  const [newContent, setNewContent] = useState('')
  const [newAnswer, setNewAnswer] = useState(true)
  const [newExplanation, setNewExplanation] = useState('')

  // 編集中の設問
  const [editId, setEditId] = useState<number | null>(null)
  const [editContent, setEditContent] = useState('')
  const [editAnswer, setEditAnswer] = useState(true)
  const [editExplanation, setEditExplanation] = useState('')

  async function reload() {
    setError('')
    const d = await examApi.get(id)
    setData(d)
    setQuestions(d.questions)
    setPassLine(d.examPassLine == null ? '' : String(d.examPassLine))
  }

  // ドラッグで設問の順番を入れ替え、DBに保存
  async function onDrop(target: number) {
    const from = dragIndex.current
    dragIndex.current = null
    setOverIndex(null)
    if (from == null || from === target) return
    const next = [...questions]
    const [moved] = next.splice(from, 1)
    next.splice(target, 0, moved)
    setQuestions(next)
    try {
      await examApi.reorderQuestions(id, next.map((q) => q.id))
    } catch (e: any) {
      setError(e.message)
      await reload() // 失敗時は元の並びに戻す
    }
  }

  useEffect(() => {
    ;(async () => {
      setLoading(true)
      try {
        await reload()
      } catch (e: any) {
        setError(e.message)
      } finally {
        setLoading(false)
      }
    })()
  }, [id])

  async function onSavePassLine() {
    setError('')
    setPassMsg('')
    try {
      const v = passLine.trim() === '' ? null : Number(passLine)
      await examApi.setPassLine(id, v)
      setPassMsg('合格ラインを保存しました')
      await reload()
    } catch (e: any) {
      setError(e.message)
    }
  }

  async function onAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!newContent.trim()) return
    setError('')
    try {
      await examApi.addQuestion(id, {
        content: newContent,
        answer: newAnswer,
        explanation: newExplanation,
      })
      setNewContent('')
      setNewAnswer(true)
      setNewExplanation('')
      await reload()
    } catch (e: any) {
      setError(e.message)
    }
  }

  function startEdit(q: ExamQuestion) {
    setEditId(q.id)
    setEditContent(q.content)
    setEditAnswer(q.answer)
    setEditExplanation(q.explanation ?? '')
    setError('')
  }

  async function onSaveEdit() {
    if (editId == null) return
    if (!editContent.trim()) return
    setError('')
    try {
      await examApi.updateQuestion(editId, {
        content: editContent,
        answer: editAnswer,
        explanation: editExplanation,
      })
      setEditId(null)
      await reload()
    } catch (e: any) {
      setError(e.message)
    }
  }

  async function onRemove(q: ExamQuestion) {
    if (!confirm('この設問を削除しますか？')) return
    setError('')
    try {
      await examApi.removeQuestion(q.id)
      await reload()
    } catch (e: any) {
      setError(e.message)
    }
  }

  if (loading) {
    return <p className="py-8 text-center text-sm text-muted">読み込み中…</p>
  }
  if (!data) {
    return <p className="py-8 text-center text-sm text-danger">{error || '対象が見つかりません'}</p>
  }

  const inputCls =
    'w-full rounded-md border border-line px-2 py-1 text-sm text-ink outline-none focus:border-accent'

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-ink2">筆記試験</h1>
          <p className="text-sm text-muted">
            {data.course ? `${data.course.name} / ` : ''}
            <span className="font-bold text-ink2">{data.name}</span>
          </p>
        </div>
        <button
          onClick={() => navigate('/admin/shiken')}
          className="rounded-md bg-disabled px-4 py-1.5 text-xs font-bold text-white hover:brightness-95"
        >
          一覧へ戻る
        </button>
      </div>

      {error && (
        <p className="mb-3 rounded-md bg-danger/10 px-3 py-2 text-xs font-bold text-danger">{error}</p>
      )}

      {/* 合格ライン */}
      <div className="card-grad mb-5 flex flex-wrap items-end gap-3 bg-surface/60 p-4">
        <label className="flex flex-col gap-1">
          <span className="text-xs font-bold text-muted">合格ライン（正答率 ％）</span>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={0}
              max={100}
              value={passLine}
              onChange={(e) => setPassLine(e.target.value)}
              placeholder="例: 80"
              className={`${inputCls} w-28`}
            />
            <span className="text-sm text-muted">%</span>
          </div>
        </label>
        <button
          onClick={onSavePassLine}
          className="rounded-md bg-brand px-4 py-1.5 text-xs font-bold text-white hover:bg-brand-deep"
        >
          合格ラインを保存
        </button>
        {passMsg && <span className="text-xs font-bold text-brand">{passMsg}</span>}
        <span className="text-[11px] text-muted">空欄で保存すると「未設定」になります。</span>
      </div>

      {/* 設問の追加 */}
      <form onSubmit={onAdd} className="card-grad mb-5 space-y-3 bg-surface/60 p-4">
        <h2 className="text-sm font-bold text-ink2">設問を追加</h2>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-bold text-muted">設問内容 <span className="text-danger">*</span></span>
          <textarea
            value={newContent}
            onChange={(e) => setNewContent(e.target.value)}
            rows={2}
            placeholder="設問内容を入力"
            className={inputCls}
          />
        </label>
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-xs font-bold text-muted">正解</span>
            <select
              value={newAnswer ? 'yes' : 'no'}
              onChange={(e) => setNewAnswer(e.target.value === 'yes')}
              className={`${inputCls} w-28`}
            >
              <option value="yes">YES（○）</option>
              <option value="no">NO（×）</option>
            </select>
          </label>
          <label className="flex flex-1 flex-col gap-1">
            <span className="text-xs font-bold text-muted">解説（任意）</span>
            <textarea
              value={newExplanation}
              onChange={(e) => setNewExplanation(e.target.value)}
              rows={1}
              placeholder="解説を入力"
              className={inputCls}
            />
          </label>
          <button
            type="submit"
            disabled={!newContent.trim()}
            className="rounded-md bg-brand px-5 py-1.5 text-xs font-bold text-white hover:bg-brand-deep disabled:opacity-60"
          >
            追加
          </button>
        </div>
      </form>

      {/* 設問一覧 */}
      <div className="card-grad bg-surface/60 p-4">
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="text-sm font-bold text-ink2">設問一覧</h2>
          <span className="text-[11px] text-muted">
            全 {questions.length} 問 ・ ⠿ をドラッグして並び替え（自動保存）
          </span>
        </div>
        {questions.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted">設問が登録されていません。</p>
        ) : (
          <div className="space-y-2">
            {questions.map((q, idx) => (
              <div
                key={q.id}
                onDragOver={(e) => {
                  if (editId != null) return
                  e.preventDefault()
                  if (overIndex !== idx) setOverIndex(idx)
                }}
                onDragLeave={() => setOverIndex((p) => (p === idx ? null : p))}
                onDrop={(e) => {
                  if (editId != null) return
                  e.preventDefault()
                  onDrop(idx)
                }}
                className={`rounded-md border bg-white/60 p-3 ${
                  overIndex === idx ? 'border-brand ring-2 ring-brand' : 'border-line'
                }`}
              >
                {editId === q.id ? (
                  <div className="space-y-2">
                    <label className="flex flex-col gap-1">
                      <span className="text-xs font-bold text-muted">設問内容 <span className="text-danger">*</span></span>
                      <textarea value={editContent} onChange={(e) => setEditContent(e.target.value)} rows={2} className={inputCls} />
                    </label>
                    <div className="flex flex-wrap items-end gap-3">
                      <label className="flex flex-col gap-1">
                        <span className="text-xs font-bold text-muted">正解</span>
                        <select
                          value={editAnswer ? 'yes' : 'no'}
                          onChange={(e) => setEditAnswer(e.target.value === 'yes')}
                          className={`${inputCls} w-28`}
                        >
                          <option value="yes">YES（○）</option>
                          <option value="no">NO（×）</option>
                        </select>
                      </label>
                      <label className="flex flex-1 flex-col gap-1">
                        <span className="text-xs font-bold text-muted">解説（任意）</span>
                        <textarea value={editExplanation} onChange={(e) => setEditExplanation(e.target.value)} rows={1} className={inputCls} />
                      </label>
                      <div className="flex gap-2">
                        <button onClick={onSaveEdit} className="rounded bg-brand px-3 py-1 text-xs font-bold text-white hover:bg-brand-deep">保存</button>
                        <button onClick={() => setEditId(null)} className="rounded bg-disabled px-3 py-1 text-xs font-bold text-white hover:brightness-95">取消</button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start gap-3">
                    <span
                      draggable
                      onDragStart={(e) => {
                        dragIndex.current = idx
                        e.dataTransfer.effectAllowed = 'move'
                      }}
                      onDragEnd={() => {
                        dragIndex.current = null
                        setOverIndex(null)
                      }}
                      title="ドラッグして並び替え"
                      className="mt-0.5 cursor-grab select-none px-1 text-base leading-6 text-muted active:cursor-grabbing"
                    >
                      ⠿
                    </span>
                    <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-gauge text-[11px] font-bold text-white">
                      {idx + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="whitespace-pre-line text-sm font-bold text-ink2">{q.content}</p>
                      {q.explanation && (
                        <p className="mt-1 whitespace-pre-line text-xs leading-relaxed text-muted">解説：{q.explanation}</p>
                      )}
                    </div>
                    <div className="shrink-0"><AnswerBadge answer={q.answer} /></div>
                    <div className="flex shrink-0 gap-2">
                      <button
                        onClick={() => startEdit(q)}
                        className="rounded border border-brand/60 px-3 py-1 text-xs font-bold text-brand hover:bg-brand/5"
                      >
                        編集
                      </button>
                      <button
                        onClick={() => onRemove(q)}
                        className="rounded border border-danger/60 px-3 py-1 text-xs font-bold text-danger hover:bg-danger/5"
                      >
                        削除
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
