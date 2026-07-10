import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  employeesApi,
  departmentsApi,
  locationsApi,
  type Employee,
  type Department,
  type Location,
} from '../lib/api'
import { MasterChainNav, LOCATION_CHAIN } from '../components/MasterChainNav'

const COLS = 'grid-cols-[110px_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_80px_150px]'

export default function ShainListPage() {
  const [rows, setRows] = useState<Employee[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [locations, setLocations] = useState<Location[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  // 検索・フィルタ
  const [qNo, setQNo] = useState('')
  const [qName, setQName] = useState('')
  const [filterDeptId, setFilterDeptId] = useState('')
  const [filterLocId, setFilterLocId] = useState('')

  async function reload() {
    setLoading(true)
    setError('')
    try {
      const [emps, deps, locs] = await Promise.all([
        employeesApi.list(),
        departmentsApi.list(),
        locationsApi.list(),
      ])
      setRows(emps)
      setDepartments(deps)
      setLocations(locs)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    reload()
  }, [])

  async function onDelete(row: Employee) {
    if (!confirm(`「${row.name}」を削除しますか？`)) return
    setError('')
    try {
      await employeesApi.remove(row.id)
      await reload()
    } catch (e: any) {
      setError(e.message)
    }
  }

  const inputCls =
    'w-full rounded-md border border-line px-2 py-1 text-sm text-ink outline-none focus:border-accent'
  const labelCls = 'flex flex-col gap-1 text-xs font-bold text-muted'

  const filtered = rows.filter(
    (r) =>
      r.employeeNo.includes(qNo.trim()) &&
      r.name.includes(qName.trim()) &&
      (filterDeptId === '' || String(r.departmentId ?? '') === filterDeptId) &&
      (filterLocId === '' || String(r.department?.location?.id ?? '') === filterLocId),
  )

  return (
    <div>
      <MasterChainNav steps={LOCATION_CHAIN} />
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-lg font-bold text-ink2">社員マスタ</h1>
        <Link
          to="/admin/shain/new"
          className="rounded-md bg-brand px-4 py-1.5 text-xs font-bold text-white hover:bg-brand-deep"
        >
          ＋ 新規登録
        </Link>
      </div>

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
          <select value={filterDeptId} onChange={(e) => setFilterDeptId(e.target.value)} className={`${inputCls} w-40`}>
            <option value="">全部署</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        </label>
        <label className={labelCls}>
          拠点
          <select value={filterLocId} onChange={(e) => setFilterLocId(e.target.value)} className={`${inputCls} w-40`}>
            <option value="">全拠点</option>
            {locations.map((loc) => (
              <option key={loc.id} value={loc.id}>{loc.name}</option>
            ))}
          </select>
        </label>
      </div>

      {/* 一覧 */}
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
              <span>拠点</span>
              <span>ロール</span>
              <span className="text-center">操作</span>
            </div>
            {filtered.length === 0 && (
              <p className="py-6 text-center text-sm text-muted">該当する社員がありません。</p>
            )}
            {filtered.map((row) => (
              <div key={row.id} className={`grid ${COLS} items-center gap-3 border-b border-line py-2 text-sm`}>
                <span className="font-bold text-ink2">{row.employeeNo}</span>
                <span className="text-ink">{row.name}</span>
                <span className="text-ink">{row.department?.name ?? '—'}</span>
                <span className="text-ink">{row.department?.location?.name ?? '—'}</span>
                <span className="text-ink">{row.role}</span>
                <div className="flex justify-center gap-2">
                  <button onClick={() => navigate(`/admin/shain/${row.id}`)} className="rounded border border-brand/60 px-3 py-1 text-xs font-bold text-brand hover:bg-brand/5">
                    詳細・編集
                  </button>
                  <button onClick={() => onDelete(row)} className="rounded border border-danger/60 px-3 py-1 text-xs font-bold text-danger hover:bg-danger/5">
                    削除
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
