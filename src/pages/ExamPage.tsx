import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { examApi, examApplicationsApi, type ExamSectionDetail } from '../lib/api'
import { getCurrentUser } from '../lib/currentUser'

// YES/NO 選択ボタン
function ChoiceButton({
  label,
  active,
  onClick,
}: {
  label: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-24 rounded-md border-2 py-2 text-sm font-bold transition-colors ${
        active
          ? 'border-brand bg-brand text-white'
          : 'border-line2 bg-white text-ink hover:border-brand/60'
      }`}
    >
      {label}
    </button>
  )
}

export default function ExamPage() {
  const { sectionId } = useParams()
  const navigate = useNavigate()
  const id = Number(sectionId)
  const currentUser = getCurrentUser()

  const [data, setData] = useState<ExamSectionDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [answers, setAnswers] = useState<Record<number, boolean>>({})
  const [phase, setPhase] = useState<'answering' | 'result'>('answering')
  const [appId, setAppId] = useState<number | null>(null)

  useEffect(() => {
    ;(async () => {
      setLoading(true)
      try {
        const d = await examApi.get(id)
        setData(d)
        if (currentUser) {
          const apps = await examApplicationsApi.list({
            applicantId: currentUser.id,
            sectionId: id,
            status: '承認済',
          })
          setAppId(apps[0]?.id ?? null)
        }
      } catch (e: any) {
        setError(e.message)
      } finally {
        setLoading(false)
      }
    })()
  }, [id])

  const questions = data?.questions ?? []
  const total = questions.length
  const answeredCount = questions.filter((q) => answers[q.id] !== undefined).length
  const allAnswered = total > 0 && answeredCount === total

  const correctCount = questions.filter((q) => answers[q.id] === q.answer).length
  const scorePct = total ? Math.round((correctCount / total) * 100) : 0
  const passLine = data?.examPassLine ?? null
  const passed = passLine != null ? scorePct >= passLine : null

  function setAnswer(qid: number, val: boolean) {
    setAnswers((p) => ({ ...p, [qid]: val }))
  }

  async function onFinish() {
    if (!allAnswered) return
    setPhase('result')
    window.scrollTo(0, 0)
    // 採点結果を承認済申請の合否結果として記録（合格ライン未設定なら記録しない）
    if (appId != null && passed != null) {
      try {
        await examApplicationsApi.setResult(appId, passed ? '合格' : '不合格')
      } catch {
        /* 記録失敗は受験結果表示の妨げにしない */
      }
    }
  }

  if (loading) {
    return <p className="py-8 text-center text-sm text-muted">読み込み中…</p>
  }
  if (error || !data) {
    return <p className="py-8 text-center text-sm text-danger">{error || '対象が見つかりません'}</p>
  }

  const yn = (v: boolean) => (v ? 'YES' : 'NO')

  return (
    <div>
      {/* タイトル */}
      <div className="mb-4">
        <h1 className="text-lg font-bold text-ink2">筆記試験</h1>
        <p className="text-sm text-muted">
          {data.course ? `${data.course.name} / ` : ''}
          <span className="font-bold text-ink2">{data.name}</span>
          {passLine != null && <span className="ml-2 text-xs">（合格ライン {passLine}%）</span>}
        </p>
      </div>

      {total === 0 ? (
        <div className="card-grad bg-surface/70 p-8 text-center text-sm text-muted">
          この研修セクションの筆記試験（設問）が登録されていません。
        </div>
      ) : phase === 'answering' ? (
        /* ===== 回答フェーズ ===== */
        <div>
          <div className="card-grad bg-surface/60 p-4">
            <div className="space-y-3">
              {questions.map((q, idx) => (
                <div key={q.id} className="rounded-md border border-line bg-white/60 p-4">
                  <div className="mb-3 flex items-start gap-3">
                    <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-gauge text-[11px] font-bold text-white">
                      {idx + 1}
                    </span>
                    <p className="whitespace-pre-line text-sm font-bold text-ink2">{q.content}</p>
                  </div>
                  <div className="flex justify-center gap-4">
                    <ChoiceButton label="YES" active={answers[q.id] === true} onClick={() => setAnswer(q.id, true)} />
                    <ChoiceButton label="NO" active={answers[q.id] === false} onClick={() => setAnswer(q.id, false)} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* フッター（回答状況 + 試験終了） */}
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <span className="text-sm text-muted">
              回答状況：<span className="font-bold text-ink2">{answeredCount} / {total}</span>
            </span>
            <div className="flex gap-3">
              <button
                onClick={() => navigate(-1)}
                className="rounded-md bg-disabled px-4 py-2 text-xs font-bold text-white hover:brightness-95"
              >
                中断して戻る
              </button>
              <button
                onClick={onFinish}
                disabled={!allAnswered}
                title={allAnswered ? '' : 'すべての設問に回答してください'}
                className="rounded-md bg-brand px-6 py-2 text-xs font-bold text-white hover:bg-brand-deep disabled:opacity-60"
              >
                試験終了
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* ===== 採点結果フェーズ ===== */
        <div>
          {/* 合否サマリー */}
          <div className="card-grad mb-5 bg-surface/70 p-6 text-center">
            {passed != null ? (
              <div
                className={`mx-auto mb-3 inline-grid h-20 w-20 place-items-center rounded-full text-2xl font-bold text-white ${
                  passed ? 'bg-ok' : 'bg-danger'
                }`}
              >
                {passed ? '合格' : '不合格'}
              </div>
            ) : (
              <p className="mb-3 text-sm font-bold text-muted">合格ライン未設定（点数のみ表示）</p>
            )}
            <p className="text-3xl font-bold text-ink2">{scorePct}<span className="text-lg">点</span></p>
            <p className="mt-1 text-sm text-muted">
              正解 {correctCount} / {total} 問
              {passLine != null && ` ・ 合格ライン ${passLine}%`}
            </p>
          </div>

          {/* 各設問の採点 */}
          <h2 className="mb-3 text-sm font-bold text-ink2">設問ごとの採点・解説</h2>
          <div className="space-y-2">
            {questions.map((q, idx) => {
              const mine = answers[q.id]
              const ok = mine === q.answer
              return (
                <div
                  key={q.id}
                  className={`card-grad bg-surface/60 p-4 ${ok ? '' : 'ring-1 ring-danger/40'}`}
                >
                  <div className="flex items-start gap-3">
                    <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-gauge text-[11px] font-bold text-white">
                      {idx + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="whitespace-pre-line text-sm font-bold text-ink2">{q.content}</p>
                      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
                        <span className="text-muted">
                          あなたの回答：
                          <span className={`font-bold ${ok ? 'text-ink2' : 'text-danger'}`}>
                            {mine === undefined ? '—' : yn(mine)}
                          </span>
                        </span>
                        <span className="text-muted">
                          正解：<span className="font-bold text-ink2">{yn(q.answer)}</span>
                        </span>
                      </div>
                      {q.explanation && (
                        <p className="mt-2 whitespace-pre-line rounded-md bg-white/70 px-3 py-2 text-xs leading-relaxed text-ink">
                          解説：{q.explanation}
                        </p>
                      )}
                    </div>
                    <span
                      className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-lg font-bold ${
                        ok ? 'text-ok' : 'text-danger'
                      }`}
                    >
                      {ok ? '○' : '×'}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>

          <div className="mt-6 flex justify-center">
            <button
              onClick={() => navigate(-1)}
              className="rounded-md bg-brand px-6 py-2 text-xs font-bold text-white hover:bg-brand-deep"
            >
              自己評価へ戻る
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
