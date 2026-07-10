import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { heldQualificationsApi, EMPLOYEE_ROLES, type HeldQualUser } from '../lib/api'

const COLS = 'grid-cols-[90px_minmax(0,1fr)_minmax(0,1fr)_80px_110px_120px]'

export default function HoyuShikakuListPage() {
  const [rows, setRows] = useState<HeldQualUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  // 検索・フィルタ
  const [qNo, setQNo] = useState('')
  const [qName, setQName] = useState('')
  const [filterDept, setFilterDept] = useState('')
  const [filterRole, setFilterRole] = useState('')

  useEffect(() => {
    ;(async () => {
      setLoading(true)
      try {
        setRows(await heldQualificationsApi.list())
      } catch (e: any) {
        setError(e.message)
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  const inputCls =
    'w-full rounded-md border border-line px-2 py-1 text-sm text-ink outline-none focus:border-accent'
  const labelCls = 'flex flex-col gap-1 text-xs font-bold text-muted'

  const deptOptions = Array.from(
    new Set(rows.map((r) => r.departmentName).filter((d): d is string => !!d)),
  )

  const filtered = rows.filter(
    (r) =>
      r.employeeNo.includes(qNo.trim()) &&
      r.name.includes(qName.trim()) &&
      (filterDept === '' || r.departmentName === filterDept) &&
      (filterRole === '' || r.role === filterRole),
  )

  return (
    <div>
      <h1 className="mb-4 text-lg font-bold text-ink2">保有資格マスタ</h1>
      <p className="mb-4 text-xs text-muted">ユーザーを選び、保有している資格（資格マスタから選択）を登録／確認します。</p>

      {error && (
        <p className="mb-3 rounded-md bg-danger/10 px-3 py-2 text-xs font-bold text-danger">{error}</p>
      )}

      {/* 検索・フィルタ */}
      <div className="mb-3 flex flex-wrap items-end gap-3">
        <label className={labelCls}>
          社員番号
          <input value={qNo} onChange={(e) => setQNo(e.target.value)} placeholder="社員番号" className={`${inputCls} w-32`} />
        </label>
        <label className={labelCls}>
          氏名
          <input value={qName} onChange={(e) => setQName(e.target.value)} placeholder="氏名" className={`${inputCls} w-40`} />
        </label>
        <label className={labelCls}>
          所属部署
          <select value={filterDept} onChange={(e) => setFilterDept(e.target.value)} className={`${inputCls} w-40`}>
            <option value="">全部署</option>
            {deptOptions.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </label>
        <label className={labelCls}>
          ロール
          <select value={filterRole} onChange={(e) => setFilterRole(e.target.value)} className={`${inputCls} w-32`}>
            <option value="">全ロール</option>
            {EMPLOYEE_ROLES.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </label>
      </div>

      <div className="card-grad bg-surface/60 p-4">
        {loading ? (
          <p className="py-8 text-center text-sm text-muted">読み込み中…</p>
        ) : rows.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted">社員が登録されていません。</p>
        ) : (
          <div className="space-y-1">
            <div className={`grid ${COLS} gap-3 border-b border-line2 pb-2 text-xs font-bold text-ink2`}>
              <span>社員番号</span>
              <span>氏名</span>
              <span>所属部署</span>
              <span>ロール</span>
              <span className="text-center">保有資格数</span>
              <span className="text-center">操作</span>
            </div>
            {filtered.length === 0 && (
              <p className="py-6 text-center text-sm text-muted">該当する社員がありません。</p>
            )}
            {filtered.map((row) => (
              <div key={row.employeeId} className={`grid ${COLS} items-center gap-3 border-b border-line py-2 text-sm`}>
                <span className="font-bold text-ink2">{row.employeeNo}</span>
                <span className="text-ink">{row.name}</span>
                <span className="text-ink">{row.departmentName ?? '—'}</span>
                <span className="text-ink">{row.role}</span>
                <span className="text-center text-ink">{row.heldCount}件</span>
                <div className="flex justify-center">
                  <button
                    onClick={() => navigate(`/admin/hoyu-shikaku/${row.employeeId}`)}
                    className="rounded border border-brand/60 px-3 py-1 text-xs font-bold text-brand hover:bg-brand/5"
                  >
                    資格管理
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
