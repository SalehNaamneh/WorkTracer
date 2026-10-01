import { useState, useEffect, useMemo } from 'react'
import { useAuth } from '../context/AuthContext'
import { useLanguage } from '../context/LanguageContext'
import { getExpenses, addExpense, deleteExpense, getWorkers, getSites } from '../db/storage'
import type { Expense, Worker, Site } from '../types'

function formatDate(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit' })
}

function monthLabel(m: string) {
  return new Date(m + '-01').toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
}

export default function ExpensesScreen() {
  const { user } = useAuth()
  const { s } = useLanguage()

  const [expenses, setExpenses] = useState<Expense[]>([])
  const [workers, setWorkers] = useState<Worker[]>([])
  const [sites, setSites] = useState<Site[]>([])
  const [loading, setLoading] = useState(true)

  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set())
  const [filterSiteId, setFilterSiteId] = useState<string | null>(null) // null = all

  const [showAdd, setShowAdd] = useState(false)
  const [newDate, setNewDate] = useState(new Date().toISOString().split('T')[0])
  const [newAmount, setNewAmount] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [newNote, setNewNote] = useState('')
  const [newSiteId, setNewSiteId] = useState('')
  const [saving, setSaving] = useState(false)
  const [addError, setAddError] = useState('')

  const load = async () => {
    if (!user) return
    setLoading(true)
    const [exp, wrk, st] = await Promise.all([getExpenses(user.id), getWorkers(user.id), getSites(user.id)])
    setExpenses(exp)
    setWorkers(wrk)
    setSites(st)
    setLoading(false)
  }

  useEffect(() => { load() }, [user])

  const workerMap = Object.fromEntries(workers.map(w => [w.id, w]))
  const siteMap = Object.fromEntries(sites.map(s => [s.id, s]))

  // Apply site filter
  const filtered = useMemo(() => {
    if (filterSiteId === null) return expenses
    if (filterSiteId === '') return expenses.filter(e => !e.site_id) // unassigned
    return expenses.filter(e => e.site_id === filterSiteId)
  }, [expenses, filterSiteId])

  // Group by month
  const grouped = useMemo(() => {
    const groups: Record<string, { workerPay: Expense[]; manual: Expense[]; total: number }> = {}
    filtered.forEach(e => {
      const m = e.date.slice(0, 7)
      if (!groups[m]) groups[m] = { workerPay: [], manual: [], total: 0 }
      if (e.is_worker_pay) groups[m].workerPay.push(e)
      else groups[m].manual.push(e)
      groups[m].total += e.amount
    })
    return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]))
  }, [filtered])

  const toggleExpand = (key: string) => {
    setExpandedKeys(prev => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
  }

  const handleAdd = async () => {
    if (!user || !newAmount || !newDesc) return
    setSaving(true)
    setAddError('')
    try {
      await addExpense(user.id, newDate, Number(newAmount), newDesc, newNote, newSiteId || null)
      setNewAmount('')
      setNewDesc('')
      setNewNote('')
      setNewSiteId('')
      setShowAdd(false)
      load()
    } catch (e) {
      setAddError(e instanceof Error ? e.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this expense?')) return
    await deleteExpense(id)
    load()
  }

  const grandTotal = expenses.reduce((t, e) => t + e.amount, 0)

  return (
    <div className="page">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{s.expenses}</h1>
          {expenses.length > 0 && (
            <p className="text-sm text-gray-400 mt-0.5">₪{grandTotal.toLocaleString()} {s.total.toLowerCase()}</p>
          )}
        </div>
        <button onClick={() => setShowAdd(true)} className="fab">＋</button>
      </div>

      {/* Site filter pills */}
      {sites.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1 mb-4 -mx-4 px-4 no-scrollbar">
          <button
            onClick={() => setFilterSiteId(null)}
            className={`pill flex-shrink-0 ${filterSiteId === null ? 'pill-active' : ''}`}
          >
            {s.allExpenses}
          </button>
          {sites.map(site => (
            <button
              key={site.id}
              onClick={() => setFilterSiteId(id => id === site.id ? null : site.id)}
              className={`pill flex-shrink-0 ${filterSiteId === site.id ? 'pill-active' : ''}`}
            >
              {site.name}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <p className="text-gray-400 text-sm text-center py-10">{s.loading}</p>
      ) : grouped.length === 0 ? (
        <div className="card p-8 text-center">
          <p className="text-3xl mb-2">💰</p>
          <p className="text-gray-400 text-sm">{s.noExpenses}</p>
        </div>
      ) : (
        <div className="space-y-6">
          {grouped.map(([month, { workerPay, manual, total }]) => {
            const wpKey = `wp-${month}`
            const wpExpanded = expandedKeys.has(wpKey)
            const wpTotal = workerPay.reduce((sum, e) => sum + e.amount, 0)

            return (
              <div key={month}>
                <div className="flex items-center justify-between mb-3 px-1">
                  <span className="section-title mb-0">{monthLabel(month)}</span>
                  <span className="text-sm font-bold text-gray-700">₪{total.toLocaleString()}</span>
                </div>

                <div className="space-y-2">
                  {/* Workers Pay — collapsible */}
                  {workerPay.length > 0 && (
                    <div className="card overflow-hidden">
                      <button onClick={() => toggleExpand(wpKey)} className="w-full p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-lg flex-shrink-0">👷</div>
                          <div className="text-start">
                            <p className="font-semibold text-gray-800 text-sm">{s.workerPay}</p>
                            <p className="text-xs text-gray-400 mt-0.5">
                              {workerPay.length} {workerPay.length === 1 ? s.entry : s.entries}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-gray-900">₪{wpTotal.toLocaleString()}</span>
                          <span className={`chevron ${wpExpanded ? 'chevron-open' : ''}`}>▼</span>
                        </div>
                      </button>

                      {wpExpanded && (
                        <div className="border-t border-gray-100">
                          {workerPay.map((exp, i) => (
                            <div key={exp.id} className={`flex items-center justify-between px-4 py-3 ${i < workerPay.length - 1 ? 'border-b border-gray-50' : ''}`}>
                              <div className="flex items-center gap-2">
                                <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center text-[10px] font-bold text-blue-700">
                                  {workerMap[exp.worker_id ?? '']?.name?.[0]?.toUpperCase() ?? '?'}
                                </div>
                                <div>
                                  <p className="text-sm text-gray-700">{workerMap[exp.worker_id ?? '']?.name ?? 'Worker'}</p>
                                  {exp.site_id && (
                                    <p className="text-xs text-gray-400">📍 {siteMap[exp.site_id]?.name}</p>
                                  )}
                                </div>
                              </div>
                              <div className="text-end">
                                <p className="text-sm font-semibold text-gray-800">₪{exp.amount}</p>
                                <p className="text-xs text-gray-400">{formatDate(exp.date)}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Manual expenses */}
                  {manual.map(exp => (
                    <div key={exp.id} className="card p-4 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-lg flex-shrink-0">🧾</div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm text-gray-800">{exp.description}</p>
                        {exp.site_id && (
                          <p className="text-xs text-blue-500 mt-0.5">📍 {siteMap[exp.site_id]?.name}</p>
                        )}
                        {exp.note && <p className="text-xs text-gray-400 mt-0.5">{exp.note}</p>}
                        <p className="text-xs text-gray-400 mt-0.5">{formatDate(exp.date)}</p>
                      </div>
                      <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                        <span className="font-bold text-gray-900">₪{exp.amount}</span>
                        <button
                          onClick={() => handleDelete(exp.id)}
                          className="text-xs text-red-500 font-semibold bg-red-50 px-2 py-0.5 rounded-lg"
                        >
                          {s.delete}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Add Expense Sheet */}
      {showAdd && (
        <div className="sheet-overlay" onClick={() => setShowAdd(false)}>
          <div className="sheet" onClick={e => e.stopPropagation()}>
            <div className="sheet-handle" />
            <p className="sheet-title">🧾 {s.addExpense}</p>
            <div className="space-y-3">
              <div>
                <label className="label">{s.date}</label>
                <input type="date" className="input" value={newDate} onChange={e => setNewDate(e.target.value)} />
              </div>
              <div>
                <label className="label">{s.amount} (₪)</label>
                <input className="input" type="number" placeholder="0" value={newAmount} onChange={e => setNewAmount(e.target.value)} autoFocus />
              </div>
              <div>
                <label className="label">{s.description}</label>
                <input className="input" placeholder="e.g. Diesel, Materials…" value={newDesc} onChange={e => setNewDesc(e.target.value)} />
              </div>
              {sites.length > 0 && (
                <div>
                  <label className="label">{s.forSite} <span className="normal-case font-normal text-gray-400">({s.optional})</span></label>
                  <select className="input" value={newSiteId} onChange={e => setNewSiteId(e.target.value)}>
                    <option value="">— {s.allExpenses} —</option>
                    {sites.map(site => <option key={site.id} value={site.id}>{site.name}</option>)}
                  </select>
                </div>
              )}
              <div>
                <label className="label">{s.note} <span className="normal-case font-normal text-gray-400">({s.optional})</span></label>
                <input className="input" placeholder="Add a note…" value={newNote} onChange={e => setNewNote(e.target.value)} />
              </div>
              {addError && <p className="text-red-500 text-sm text-center">{addError}</p>}
              <button className="btn-primary" onClick={handleAdd} disabled={saving}>
                {saving ? s.loading : s.add}
              </button>
              <button className="btn-ghost w-full" onClick={() => setShowAdd(false)}>{s.cancel}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
