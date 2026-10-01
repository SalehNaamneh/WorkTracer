import { useState, useEffect, useMemo } from 'react'
import { useParams, useSearchParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useLanguage } from '../context/LanguageContext'
import {
  getWorkers, getWorkDays, getWorkDayWorkers,
  getSites, getWorkerPayments, addWorkerPayment, updateWorkerRate,
} from '../db/storage'
import type { Worker, WorkDay, WorkDayWorker, Site, WorkerPayment } from '../types'

function formatDate(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit' })
}

function monthLabel(m: string) {
  return new Date(m + '-01').toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
}

export default function WorkerDetailScreen() {
  const { id } = useParams<{ id: string }>()
  const [params] = useSearchParams()
  const month = params.get('month') ?? new Date().toISOString().slice(0, 7)
  const { user } = useAuth()
  const { s } = useLanguage()
  const navigate = useNavigate()

  const [worker, setWorker] = useState<Worker | null>(null)
  const [workDays, setWorkDays] = useState<WorkDay[]>([])
  const [wdWorkers, setWdWorkers] = useState<WorkDayWorker[]>([])
  const [sites, setSites] = useState<Site[]>([])
  const [payments, setPayments] = useState<WorkerPayment[]>([])
  const [loading, setLoading] = useState(true)

  const [showPayment, setShowPayment] = useState(false)
  const [payAmount, setPayAmount] = useState('')
  const [payNote, setPayNote] = useState('')
  const [payDate, setPayDate] = useState(new Date().toISOString().split('T')[0])
  const [editRate, setEditRate] = useState(false)
  const [newRate, setNewRate] = useState('')

  const load = async () => {
    if (!user || !id) return
    setLoading(true)
    const [workers, wd, pmt, st] = await Promise.all([
      getWorkers(user.id),
      getWorkDays(user.id),
      getWorkerPayments(user.id),
      getSites(user.id),
    ])
    const w = workers.find(w => w.id === id) ?? null
    setWorker(w)
    setWorkDays(wd)
    setPayments(pmt.filter(p => p.worker_id === id))
    setSites(st)
    if (wd.length) {
      const ids = wd.map(d => d.id)
      const wdw = await getWorkDayWorkers(ids)
      setWdWorkers(wdw.filter(w => w.worker_id === id))
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [user, id])

  const siteMap = Object.fromEntries(sites.map(s => [s.id, s]))

  const monthDays = useMemo(() => {
    const myDayIds = new Set(wdWorkers.map(w => w.work_day_id))
    return workDays
      .filter(wd => wd.date.startsWith(month) && myDayIds.has(wd.id))
      .sort((a, b) => b.date.localeCompare(a.date))
  }, [workDays, wdWorkers, month])

  const totalEarned = monthDays.length * (worker?.daily_rate ?? 0)
  const totalPaid = payments.filter(p => p.date.startsWith(month)).reduce((sum, p) => sum + p.amount, 0)
  const totalOwed = totalEarned - totalPaid

  const handleAddPayment = async () => {
    if (!user || !id || !payAmount) return
    await addWorkerPayment(user.id, id, Number(payAmount), payDate, payNote)
    setPayAmount('')
    setPayNote('')
    setShowPayment(false)
    load()
  }

  const handleUpdateRate = async () => {
    if (!id || !newRate) return
    await updateWorkerRate(id, Number(newRate))
    setEditRate(false)
    load()
  }

  if (loading) return <div className="page flex items-center justify-center"><p className="text-gray-400">{s.loading}</p></div>
  if (!worker) return <div className="page"><p className="text-gray-400">{s.workerNotFound}</p></div>

  const initials = worker.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
  const fullyPaid = totalOwed <= 0 && totalEarned > 0
  const monthPayments = payments.filter(p => p.date.startsWith(month))

  return (
    <div className="page">
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <button onClick={() => navigate(-1)} className="back-btn">‹ {s.back}</button>
      </div>

      {/* Worker hero */}
      <div className="card p-5 mb-4 flex items-center gap-4">
        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black text-lg flex-shrink-0 ${fullyPaid ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
          {initials}
        </div>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-gray-900">{worker.name}</h1>
          <p className="text-sm text-gray-400">{monthLabel(month)}</p>
        </div>
        {fullyPaid && (
          <span className="text-xs bg-green-100 text-green-700 font-bold px-2.5 py-1 rounded-full flex-shrink-0">
            ✓ {s.fullyPaid}
          </span>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        {[
          { label: s.daysWorked, value: monthDays.length, unit: s.days },
          { label: s.totalEarned, value: `₪${totalEarned}`, unit: '' },
          { label: s.totalOwed, value: `₪${Math.abs(totalOwed)}`, unit: '', red: totalOwed > 0 },
        ].map(stat => (
          <div key={stat.label} className="card p-3 text-center">
            <p className={`text-lg font-black ${stat.red ? 'text-red-500' : 'text-gray-900'}`}>{stat.value}</p>
            {stat.unit && <p className="text-[10px] text-gray-400 -mt-0.5">{stat.unit}</p>}
            <p className="text-[10px] text-gray-400 uppercase tracking-wide mt-0.5">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Daily rate */}
      <div className="card p-4 mb-4 flex items-center justify-between">
        <div className="flex-1">
          <p className="label mb-0.5">{s.dailyRate}</p>
          {editRate ? (
            <input className="input mt-1" type="number" value={newRate} onChange={e => setNewRate(e.target.value)} autoFocus />
          ) : (
            <p className="font-bold text-gray-900">₪{worker.daily_rate}</p>
          )}
        </div>
        {editRate ? (
          <div className="flex gap-2 ms-3">
            <button onClick={handleUpdateRate} className="text-sm font-semibold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-xl">{s.save}</button>
            <button onClick={() => setEditRate(false)} className="text-sm text-gray-400 bg-gray-100 px-3 py-1.5 rounded-xl">{s.cancel}</button>
          </div>
        ) : (
          <button onClick={() => { setNewRate(String(worker.daily_rate)); setEditRate(true) }} className="text-sm font-semibold text-blue-600 ms-3">{s.edit}</button>
        )}
      </div>

      {/* Work history */}
      <p className="section-title mt-2">{s.workerHistory}</p>
      {monthDays.length === 0 ? (
        <div className="card p-5 text-center mb-4">
          <p className="text-gray-400 text-sm">{s.noData}</p>
        </div>
      ) : (
        <div className="space-y-2 mb-4">
          {monthDays.map(wd => {
            const workerEntries = wdWorkers.filter(w => w.work_day_id === wd.id)
            const workerSites = workerEntries
              .map(w => siteMap[w.site_id])
              .filter(Boolean)
              .filter((v, i, a) => a.findIndex(x => x.id === v.id) === i)
            return (
              <div key={wd.id} className="card p-3 flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                  <span className="text-blue-600 font-bold text-xs">{new Date(wd.date + 'T00:00:00').getDate()}</span>
                </div>
                <div className="flex-1">
                  <span className="text-sm font-medium text-gray-700">{formatDate(wd.date)}</span>
                  {workerSites.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {workerSites.map(site => (
                        <span key={site.id} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                          📍 {site.name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <span className="text-sm font-bold text-gray-500 flex-shrink-0">₪{worker.daily_rate}</span>
              </div>
            )
          })}
        </div>
      )}

      {/* Payments */}
      {monthPayments.length > 0 && (
        <>
          <p className="section-title">{s.paid}</p>
          <div className="space-y-2 mb-4">
            {monthPayments.map(p => (
              <div key={p.id} className="card p-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-green-50 flex items-center justify-center text-sm">✓</div>
                  <div>
                    <p className="text-sm font-semibold text-gray-800">₪{p.amount}</p>
                    {p.note && <p className="text-xs text-gray-400">{p.note}</p>}
                  </div>
                </div>
                <span className="text-xs text-gray-400">{formatDate(p.date)}</span>
              </div>
            ))}
          </div>
        </>
      )}

      <button className="btn-primary" onClick={() => setShowPayment(true)}>{s.addPayment}</button>

      {showPayment && (
        <div className="sheet-overlay" onClick={() => setShowPayment(false)}>
          <div className="sheet" onClick={e => e.stopPropagation()}>
            <div className="sheet-handle" />
            <p className="sheet-title">💵 {s.addPayment}</p>
            <div className="space-y-3">
              <div>
                <label className="label">{s.paymentAmount} (₪)</label>
                <input className="input" type="number" placeholder="0" value={payAmount} onChange={e => setPayAmount(e.target.value)} autoFocus />
              </div>
              <div>
                <label className="label">{s.date}</label>
                <input type="date" className="input" value={payDate} onChange={e => setPayDate(e.target.value)} />
              </div>
              <div>
                <label className="label">{s.note} <span className="normal-case font-normal text-gray-400">({s.optional})</span></label>
                <input className="input" placeholder="Add a note…" value={payNote} onChange={e => setPayNote(e.target.value)} />
              </div>
              <button className="btn-primary" onClick={handleAddPayment}>{s.save}</button>
              <button className="btn-ghost w-full" onClick={() => setShowPayment(false)}>{s.cancel}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
