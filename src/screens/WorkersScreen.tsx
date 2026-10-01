import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useLanguage } from '../context/LanguageContext'
import { getWorkers, getWorkDays, getWorkDayWorkers, getWorkerPayments, addWorker, fetchExportData } from '../db/storage'
import type { Worker, WorkDay, WorkDayWorker, WorkerPayment } from '../types'
import { buildCSV, downloadCSV } from '../lib/csvExport'

function monthLabel(dateStr: string) {
  const d = new Date(dateStr + '-01')
  return d.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
}

function currentMonth() {
  const n = new Date()
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}`
}

export default function WorkersScreen() {
  const { user } = useAuth()
  const { s } = useLanguage()
  const navigate = useNavigate()

  const [workers, setWorkers] = useState<Worker[]>([])
  const [workDays, setWorkDays] = useState<WorkDay[]>([])
  const [wdWorkers, setWdWorkers] = useState<WorkDayWorker[]>([])
  const [payments, setPayments] = useState<WorkerPayment[]>([])
  const [loading, setLoading] = useState(true)

  const [showAddWorker, setShowAddWorker] = useState(false)
  const [newName, setNewName] = useState('')
  const [newRate, setNewRate] = useState('')

  const load = async () => {
    if (!user) return
    setLoading(true)
    const [w, wd, pmt] = await Promise.all([
      getWorkers(user.id),
      getWorkDays(user.id),
      getWorkerPayments(user.id),
    ])
    setWorkers(w)
    setWorkDays(wd)
    setPayments(pmt)
    if (wd.length) {
      const wdw = await getWorkDayWorkers(wd.map(d => d.id))
      setWdWorkers(wdw)
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [user])

  const months = useMemo(() => {
    const monthSet = new Set<string>()
    workDays.forEach(wd => monthSet.add(wd.date.slice(0, 7)))
    monthSet.add(currentMonth())
    return Array.from(monthSet).sort((a, b) => b.localeCompare(a))
  }, [workDays])

  const handleAddWorker = async () => {
    if (!user || !newName.trim() || !newRate) return
    await addWorker(user.id, newName.trim(), Number(newRate))
    setNewName('')
    setNewRate('')
    setShowAddWorker(false)
    load()
  }

  const getWorkerMonthStats = (workerId: string, month: string) => {
    const monthDays = workDays.filter(wd => wd.date.startsWith(month))
    const monthDayIds = new Set(monthDays.map(d => d.id))
    const daysWorkedEntries = wdWorkers.filter(w => w.worker_id === workerId && monthDayIds.has(w.work_day_id))
    const uniqueDays = new Set(daysWorkedEntries.map(d => d.work_day_id)).size
    const worker = workers.find(w => w.id === workerId)
    const earned = uniqueDays * (worker?.daily_rate ?? 0)
    const paid = payments
      .filter(p => p.worker_id === workerId && p.date.startsWith(month))
      .reduce((sum, p) => sum + p.amount, 0)
    return { daysWorked: uniqueDays, earned, paid, owed: earned - paid }
  }

  const cur = currentMonth()

  const handleExport = async () => {
    if (!user) return
    const d = await fetchExportData(user.id)
    const siteMap = Object.fromEntries(d.sites.map(s => [s.id, s]))
    const workerMap = Object.fromEntries(d.workers.map(w => [w.id, w]))

    // Section 1 — Worker monthly summary
    const summaryRows: (string | number)[][] = []
    const monthSet = new Set<string>()
    d.workDays.forEach(wd => monthSet.add(wd.date.slice(0, 7)))
    monthSet.add(cur)
    const allMonths = Array.from(monthSet).sort((a, b) => b.localeCompare(a))

    for (const month of allMonths) {
      const monthDayIds = new Set(d.workDays.filter(wd => wd.date.startsWith(month)).map(wd => wd.id))
      for (const w of d.workers) {
        const entries = d.wdWorkers.filter(x => x.worker_id === w.id && monthDayIds.has(x.work_day_id))
        const days = new Set(entries.map(x => x.work_day_id)).size
        const earned = days * w.daily_rate
        const paid = d.payments.filter(p => p.worker_id === w.id && p.date.startsWith(month)).reduce((s, p) => s + p.amount, 0)
        summaryRows.push([w.name, month, days, earned, paid, earned - paid])
      }
    }

    // Section 2 — Work days
    const wdRows: (string | number)[][] = d.workDays.map(wd => {
      const sitesForDay = d.wdSites.filter(ws => ws.work_day_id === wd.id).map(ws => siteMap[ws.site_id]?.name ?? '').join(' | ')
      const workersForDay = [...new Set(d.wdWorkers.filter(w => w.work_day_id === wd.id).map(w => workerMap[w.worker_id]?.name ?? ''))].join(' | ')
      return [wd.date, sitesForDay, workersForDay]
    })

    // Section 3 — Expenses
    const expRows: (string | number)[][] = d.expenses.map(e => [
      e.date, e.description, e.amount,
      e.site_id ? (siteMap[e.site_id]?.name ?? '') : '',
      e.note,
      e.is_worker_pay ? 'Worker Pay' : 'Manual',
    ])

    // Section 4 — Worker payments
    const payRows: (string | number)[][] = d.payments.map(p => [
      workerMap[p.worker_id]?.name ?? '', p.amount, p.date, p.note,
    ])

    const csv = buildCSV([
      { title: 'Worker Monthly Summary', headers: ['Worker', 'Month', 'Days Worked', 'Earned (₪)', 'Paid (₪)', 'Owed (₪)'], rows: summaryRows },
      { title: 'Work Days', headers: ['Date', 'Sites', 'Workers'], rows: wdRows },
      { title: 'Expenses', headers: ['Date', 'Description', 'Amount (₪)', 'Site', 'Note', 'Type'], rows: expRows },
      { title: 'Worker Payments', headers: ['Worker', 'Amount (₪)', 'Date', 'Note'], rows: payRows },
    ])
    downloadCSV(csv, `work-data-${cur}.csv`)
  }

  return (
    <div className="page">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{s.workers}</h1>
          {workers.length > 0 && (
            <p className="text-sm text-gray-400 mt-0.5">{workers.length} {s.workersLabel.toLowerCase()}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExport}
            className="w-10 h-10 rounded-2xl bg-gray-100 flex items-center justify-center text-gray-500 text-base"
            title={s.exportCSV}
          >
            ⬇
          </button>
          <button onClick={() => setShowAddWorker(true)} className="fab">＋</button>
        </div>
      </div>

      {loading ? (
        <p className="text-gray-400 text-sm text-center py-10">{s.loading}</p>
      ) : (
        <div className="space-y-6">
          {months.map(month => {
            const activeWorkers = workers.filter(w => {
              const stats = getWorkerMonthStats(w.id, month)
              return stats.daysWorked > 0 || month === cur
            })

            const allPaid = activeWorkers.length > 0 && activeWorkers.every(w => {
              const stats = getWorkerMonthStats(w.id, month)
              return stats.owed <= 0 && stats.earned > 0
            })

            return (
              <div key={month}>
                <div className="flex items-center justify-between mb-3 px-1">
                  <span className="section-title mb-0">{monthLabel(month)}</span>
                  {allPaid && (
                    <span className="text-xs bg-green-100 text-green-700 font-semibold px-2 py-0.5 rounded-full">
                      All paid ✓
                    </span>
                  )}
                </div>

                {activeWorkers.length === 0 ? (
                  <div className="card p-5 text-center">
                    <p className="text-gray-400 text-sm">{s.noData}</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {activeWorkers.map(worker => {
                      const stats = getWorkerMonthStats(worker.id, month)
                      const fullyPaid = stats.owed <= 0 && stats.earned > 0
                      const initials = worker.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()

                      return (
                        <button
                          key={worker.id}
                          onClick={() => navigate(`/workers/${worker.id}?month=${month}`)}
                          className="card p-4 w-full text-start flex items-center gap-3"
                        >
                          {/* Avatar */}
                          <div className={`w-11 h-11 rounded-xl flex items-center justify-center font-bold text-sm flex-shrink-0 ${fullyPaid ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                            {initials}
                          </div>

                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-gray-800">{worker.name}</span>
                              {fullyPaid && (
                                <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full">✓</span>
                              )}
                            </div>
                            <div className="flex items-center gap-3 mt-1">
                              <span className="text-xs text-gray-400">{stats.daysWorked} {s.days}</span>
                              <span className="text-xs text-gray-400">earned ₪{stats.earned}</span>
                            </div>
                          </div>

                          {/* Owed badge */}
                          <div className="text-end flex-shrink-0">
                            <p className={`font-bold text-base ${stats.owed > 0 ? 'text-red-500' : 'text-green-600'}`}>
                              ₪{Math.abs(stats.owed)}
                            </p>
                            <p className="text-xs text-gray-400">{stats.owed > 0 ? 'owed' : 'settled'}</p>
                          </div>

                          <span className="text-gray-300 text-sm flex-shrink-0">›</span>
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {showAddWorker && (
        <div className="sheet-overlay" onClick={() => setShowAddWorker(false)}>
          <div className="sheet" onClick={e => e.stopPropagation()}>
            <div className="sheet-handle" />
            <p className="sheet-title">👷 {s.addWorker}</p>
            <div className="space-y-3">
              <div>
                <label className="label">{s.workerName}</label>
                <input className="input" placeholder="Full name" value={newName} onChange={e => setNewName(e.target.value)} autoFocus />
              </div>
              <div>
                <label className="label">{s.dailyRate} (₪)</label>
                <input className="input" type="number" placeholder="0" value={newRate} onChange={e => setNewRate(e.target.value)} />
              </div>
              <button className="btn-primary" onClick={handleAddWorker}>{s.add}</button>
              <button className="btn-ghost w-full" onClick={() => setShowAddWorker(false)}>{s.cancel}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
