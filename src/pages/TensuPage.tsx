import { useEffect, useMemo, useState } from 'react'
import {
  trainingCoursesApi,
  trainingSectionsApi,
  trainingItemsApi,
  employeesApi,
  evalStampsApi,
  type TrainingCourse,
  type TrainingSection,
  type TrainingItem,
  type Employee,
} from '../lib/api'
import { isItemAllPassed } from '../lib/evalProgress'

// 点数一覧の集計対象外ロール（管理者のみ除外＝受講者・評価者が対象）
const EXCLUDED_ROLE = '管理者'

// CSVセルのエスケープ
function csvCell(v: string | number): string {
  const s = String(v)
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export default function TensuPage() {
  const [courses, setCourses] = useState<TrainingCourse[]>([])
  const [sections, setSections] = useState<TrainingSection[]>([])
  const [items, setItems] = useState<TrainingItem[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  // employeeId → その社員の押印集合 / カウント
  const [stampsByEmp, setStampsByEmp] = useState<Map<number, { set: Set<string>; counts: Map<string, number> }>>(
    new Map(),
  )
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filterLocation, setFilterLocation] = useState('')

  useEffect(() => {
    ;(async () => {
      setLoading(true)
      try {
        const [cs, secs, its, emps, allStamps] = await Promise.all([
          trainingCoursesApi.list(),
          trainingSectionsApi.list(),
          trainingItemsApi.list(),
          employeesApi.list(),
          evalStampsApi.listAll(),
        ])
        setCourses(cs)
        setSections(secs)
        setItems(its)
        setEmployees(emps)
        // 社員ごとに押印集合とカウントを構築
        const byEmp = new Map<number, { set: Set<string>; counts: Map<string, number> }>()
        for (const s of allStamps) {
          let e = byEmp.get(s.employeeId)
          if (!e) {
            e = { set: new Set(), counts: new Map() }
            byEmp.set(s.employeeId, e)
          }
          const key = `${s.itemId}-${s.kind}-${s.idx}`
          e.set.add(key)
          e.counts.set(key, s.count ?? 0)
        }
        setStampsByEmp(byEmp)
      } catch (e: any) {
        setError(e.message)
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  const sectionById = useMemo(() => new Map(sections.map((s) => [s.id, s])), [sections])

  // コースID → その配下の {item, section}[]（点数計算対象）
  const itemsByCourse = useMemo(() => {
    const m = new Map<number, { item: TrainingItem; section: TrainingSection }[]>()
    for (const it of items) {
      if (it.sectionId == null) continue
      const sec = sectionById.get(it.sectionId)
      if (!sec || sec.courseId == null) continue
      const arr = m.get(sec.courseId) ?? []
      arr.push({ item: it, section: sec })
      m.set(sec.courseId, arr)
    }
    return m
  }, [items, sectionById])

  // 社員 × コースの得点（全合格の項目数）
  function courseScore(empId: number, courseId: number): number {
    const emp = stampsByEmp.get(empId)
    if (!emp) return 0
    const list = itemsByCourse.get(courseId) ?? []
    return list.reduce(
      (n, { item, section }) => n + (isItemAllPassed(item.id, section, emp.set, emp.counts) ? 1 : 0),
      0,
    )
  }
  const totalScore = (empId: number) => courses.reduce((s, c) => s + courseScore(empId, c.id), 0)

  // 対象社員（管理者を除く＝受講者・評価者）→ 拠点でグループ化
  const targets = useMemo(
    () => employees.filter((e) => e.role !== EXCLUDED_ROLE),
    [employees],
  )
  const locationOf = (e: Employee) => e.department?.location?.name ?? '未所属'

  const groups = useMemo(() => {
    const filtered = filterLocation ? targets.filter((e) => locationOf(e) === filterLocation) : targets
    const m = new Map<string, Employee[]>()
    for (const e of filtered) {
      const loc = locationOf(e)
      const arr = m.get(loc) ?? []
      arr.push(e)
      m.set(loc, arr)
    }
    // 拠点名でソート、社員は社員番号順
    return [...m.entries()]
      .sort((a, b) => a[0].localeCompare(b[0], 'ja'))
      .map(([loc, emps]) => [loc, [...emps].sort((a, b) => a.employeeNo.localeCompare(b.employeeNo))] as const)
  }, [targets, filterLocation, stampsByEmp, itemsByCourse])

  const locationOptions = useMemo(
    () => Array.from(new Set(targets.map(locationOf))).sort((a, b) => a.localeCompare(b, 'ja')),
    [targets],
  )

  function exportCsv() {
    const header = ['拠点', '部署', '社員番号', '氏名', 'ロール', ...courses.map((c) => c.name), '合計']
    const lines: string[] = [header.map(csvCell).join(',')]
    for (const [loc, emps] of groups) {
      for (const e of emps) {
        const scores = courses.map((c) => courseScore(e.id, c.id))
        const row = [
          loc,
          e.department?.name ?? '',
          e.employeeNo,
          e.name,
          e.role,
          ...scores.map((n) => String(n)),
          String(scores.reduce((a, b) => a + b, 0)),
        ]
        lines.push(row.map(csvCell).join(','))
      }
    }
    // Excel(日本語)向けに BOM 付き UTF-8
    const blob = new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    const d = new Date()
    const p = (n: number) => String(n).padStart(2, '0')
    a.href = url
    a.download = `点数一覧_${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (loading) return <p className="py-8 text-center text-sm text-muted">読み込み中…</p>

  const thCls = 'whitespace-nowrap px-3 py-2 text-xs font-bold text-ink2'
  const tdCls = 'whitespace-nowrap px-3 py-2 text-sm text-ink'

  return (
    <div>
      <div className="mb-1 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-lg font-bold text-ink2">点数一覧</h1>
        <button
          onClick={exportCsv}
          disabled={groups.length === 0}
          className="rounded-md bg-brand px-4 py-1.5 text-xs font-bold text-white hover:bg-brand-deep disabled:opacity-50"
        >
          CSV出力
        </button>
      </div>
      <p className="mb-4 text-xs text-muted">
        給与計算用。研修項目の自己評価・管理者評価がすべて合格した項目を1点として、研修コースごとに集計します（対象：管理者を除く全社員）。
      </p>

      {error && (
        <p className="mb-3 rounded-md bg-danger/10 px-3 py-2 text-xs font-bold text-danger">{error}</p>
      )}

      {/* 拠点フィルタ */}
      <div className="mb-3 flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-xs font-bold text-muted">
          拠点
          <select
            value={filterLocation}
            onChange={(e) => setFilterLocation(e.target.value)}
            className="w-48 rounded-md border border-line px-2 py-1 text-sm text-ink outline-none focus:border-accent"
          >
            <option value="">全拠点</option>
            {locationOptions.map((l) => (
              <option key={l} value={l}>{l}</option>
            ))}
          </select>
        </label>
      </div>

      {groups.length === 0 ? (
        <div className="card-grad bg-surface/70 p-8 text-center text-sm text-muted">対象の社員がいません。</div>
      ) : (
        <div className="space-y-6">
          {groups.map(([loc, emps]) => (
            <section key={loc}>
              <h2 className="mb-2 flex items-center gap-2 text-sm font-bold text-ink2">
                <span className="rounded-md bg-brand px-2 py-0.5 text-[11px] font-bold text-white">{loc}</span>
                <span className="text-muted">{emps.length}名</span>
              </h2>
              <div className="scroll-area overflow-x-auto rounded-lg border border-line bg-surface/60">
                <table className="min-w-full border-collapse">
                  <thead>
                    <tr className="border-b border-line2 bg-white/60">
                      <th className={`${thCls} text-left`}>社員番号</th>
                      <th className={`${thCls} text-left`}>氏名</th>
                      <th className={`${thCls} text-left`}>部署</th>
                      {courses.map((c) => (
                        <th key={c.id} className={`${thCls} text-center`}>{c.name}</th>
                      ))}
                      <th className={`${thCls} text-center`}>合計</th>
                    </tr>
                  </thead>
                  <tbody>
                    {emps.map((e) => {
                      const scores = courses.map((c) => courseScore(e.id, c.id))
                      const total = scores.reduce((a, b) => a + b, 0)
                      return (
                        <tr key={e.id} className="border-b border-line last:border-0">
                          <td className={tdCls}>{e.employeeNo}</td>
                          <td className={`${tdCls} font-bold text-ink2`}>{e.name}</td>
                          <td className={tdCls}>{e.department?.name ?? '—'}</td>
                          {scores.map((n, i) => (
                            <td key={courses[i].id} className={`${tdCls} text-center ${n > 0 ? 'font-bold text-ink2' : 'text-muted'}`}>
                              {n}
                            </td>
                          ))}
                          <td className="whitespace-nowrap px-3 py-2 text-center text-sm font-bold text-brand">{total}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}
