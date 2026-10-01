import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useLanguage } from '../context/LanguageContext'
import { getSites, getWorkers, addWorkDay, addSite, addWorker } from '../db/storage'
import type { Site, Worker } from '../types'

interface SiteEntry {
  site_id: string
  workers: string[]
}

export default function AddWorkDayScreen() {
  const { user } = useAuth()
  const { s } = useLanguage()
  const navigate = useNavigate()

  const today = new Date().toISOString().split('T')[0]
  const [date, setDate] = useState(today)
  const [sites, setSites] = useState<Site[]>([])
  const [workers, setWorkers] = useState<Worker[]>([])
  const [entries, setEntries] = useState<SiteEntry[]>([{ site_id: '', workers: [] }])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [showAddSite, setShowAddSite] = useState(false)
  const [newSiteName, setNewSiteName] = useState('')
  const [showAddWorker, setShowAddWorker] = useState(false)
  const [newWorkerName, setNewWorkerName] = useState('')
  const [newWorkerRate, setNewWorkerRate] = useState('')
  const [addingForEntry, setAddingForEntry] = useState(0)

  useEffect(() => {
    if (!user) return
    getSites(user.id).then(setSites)
    getWorkers(user.id).then(setWorkers)
  }, [user])

  const addEntry = () => setEntries(e => [...e, { site_id: '', workers: [] }])
  const removeEntry = (idx: number) => setEntries(e => e.filter((_, i) => i !== idx))

  const updateSite = (idx: number, site_id: string) =>
    setEntries(e => e.map((en, i) => i === idx ? { ...en, site_id } : en))

  const toggleWorker = (entryIdx: number, workerId: string) => {
    setEntries(e => e.map((en, i) => {
      if (i !== entryIdx) return en
      const next = en.workers.includes(workerId)
        ? en.workers.filter(w => w !== workerId)
        : [...en.workers, workerId]
      return { ...en, workers: next }
    }))
  }

  const handleAddSite = async () => {
    if (!user || !newSiteName.trim()) return
    const site = await addSite(user.id, newSiteName.trim())
    setSites(prev => [...prev, site])
    updateSite(addingForEntry, site.id)
    setNewSiteName('')
    setShowAddSite(false)
  }

  const handleAddWorker = async () => {
    if (!user || !newWorkerName.trim() || !newWorkerRate) return
    const worker = await addWorker(user.id, newWorkerName.trim(), Number(newWorkerRate))
    setWorkers(prev => [...prev, worker])
    toggleWorker(addingForEntry, worker.id)
    setNewWorkerName('')
    setNewWorkerRate('')
    setShowAddWorker(false)
  }

  const save = async () => {
    if (!user) return
    const valid = entries.filter(e => e.site_id)
    if (!valid.length) { setError('Select at least one site'); return }
    setSaving(true)
    setError('')
    try {
      await addWorkDay(user.id, {
        date,
        sites: valid.map(e => ({ site_id: e.site_id, workers: e.workers.map(w => ({ worker_id: w })) })),
      })
      navigate('/')
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error')
    } finally {
      setSaving(false)
    }
  }

  const dateDisplay = new Date(date + 'T00:00:00').toLocaleDateString('en-GB', {
    weekday: 'short', day: 'numeric', month: 'short',
  })

  return (
    <div className="page">
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <button onClick={() => navigate(-1)} className="back-btn">‹ {s.back}</button>
        <h1 className="text-xl font-bold text-gray-900">{s.addWorkDay}</h1>
      </div>

      <div className="space-y-3">
        {/* Date card */}
        <div className="card p-4">
          <label className="label">{s.date}</label>
          <div className="flex items-center gap-3">
            <input type="date" className="input" value={date} onChange={e => setDate(e.target.value)} />
            <div className="text-xs text-blue-600 font-semibold bg-blue-50 px-3 py-2 rounded-xl whitespace-nowrap flex-shrink-0">
              {dateDisplay}
            </div>
          </div>
        </div>

        {/* Site entries */}
        {entries.map((entry, idx) => (
          <div key={idx} className="card overflow-hidden">
            {/* Site selector row */}
            <div className="flex items-center gap-3 p-4">
              <div className="w-8 h-8 rounded-full bg-blue-600 text-white text-xs font-black flex items-center justify-center flex-shrink-0">
                {idx + 1}
              </div>
              <div className="flex-1 min-w-0">
                <select
                  className="input py-2"
                  value={entry.site_id}
                  onChange={e => {
                    if (e.target.value === '__add__') {
                      setAddingForEntry(idx)
                      setShowAddSite(true)
                    } else {
                      updateSite(idx, e.target.value)
                    }
                  }}
                >
                  <option value="">— {s.chooseSite} —</option>
                  {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  <option value="__add__">＋ {s.newSiteOption}</option>
                </select>
              </div>
              {entries.length > 1 && (
                <button onClick={() => removeEntry(idx)} className="w-7 h-7 rounded-full bg-red-50 flex items-center justify-center text-red-400 text-xs flex-shrink-0">
                  ✕
                </button>
              )}
            </div>

            {/* Workers — only when site is picked */}
            {entry.site_id && (
              <div className="border-t border-gray-100 px-4 py-3">
                <p className="label mb-2">{s.workersAtSite}</p>
                <div className="flex flex-wrap gap-2">
                  {workers.map(w => {
                    const active = entry.workers.includes(w.id)
                    return (
                      <button
                        key={w.id}
                        onClick={() => toggleWorker(idx, w.id)}
                        className={`pill text-sm ${active ? 'pill-active' : ''}`}
                      >
                        {active && <span className="me-1 text-xs">✓</span>}{w.name}
                      </button>
                    )
                  })}
                  <button
                    onClick={() => { setAddingForEntry(idx); setShowAddWorker(true) }}
                    className="pill pill-add text-sm"
                  >
                    ＋ {s.newWorker}
                  </button>
                </div>
                {entry.workers.length > 0 && (
                  <p className="text-xs text-blue-500 mt-2 font-semibold">
                    {entry.workers.length} {entry.workers.length === 1 ? s.workerSelected : s.workersSelected}
                  </p>
                )}
              </div>
            )}
          </div>
        ))}

        {/* Compact add another site */}
        <button
          onClick={addEntry}
          className="flex items-center gap-2 text-blue-600 text-sm font-semibold mx-auto py-2 px-4 rounded-xl hover:bg-blue-50 transition-colors"
        >
          <span className="w-6 h-6 rounded-full border-2 border-blue-300 flex items-center justify-center text-blue-500 text-base leading-none">＋</span>
          {s.addAnotherSite}
        </button>

        {error && (
          <div className="bg-red-50 border border-red-100 rounded-xl p-3">
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}

        <button onClick={save} disabled={saving} className="btn-primary">
          {saving ? s.loading : `✓  ${s.saveWorkDay}`}
        </button>
      </div>

      {/* Add Site Sheet */}
      {showAddSite && (
        <div className="sheet-overlay" onClick={() => setShowAddSite(false)}>
          <div className="sheet" onClick={e => e.stopPropagation()}>
            <div className="sheet-handle" />
            <p className="sheet-title">📍 {s.addSite}</p>
            <div className="space-y-3">
              <div>
                <label className="label">{s.siteName}</label>
                <input className="input" placeholder="e.g. Haifa Port" value={newSiteName} onChange={e => setNewSiteName(e.target.value)} autoFocus onKeyDown={e => e.key === 'Enter' && handleAddSite()} />
              </div>
              <button className="btn-primary" onClick={handleAddSite}>{s.add}</button>
              <button className="btn-ghost w-full" onClick={() => setShowAddSite(false)}>{s.cancel}</button>
            </div>
          </div>
        </div>
      )}

      {/* Add Worker Sheet */}
      {showAddWorker && (
        <div className="sheet-overlay" onClick={() => setShowAddWorker(false)}>
          <div className="sheet" onClick={e => e.stopPropagation()}>
            <div className="sheet-handle" />
            <p className="sheet-title">👷 {s.addWorker}</p>
            <div className="space-y-3">
              <div>
                <label className="label">{s.workerName}</label>
                <input className="input" placeholder={s.fullName} value={newWorkerName} onChange={e => setNewWorkerName(e.target.value)} autoFocus />
              </div>
              <div>
                <label className="label">{s.dailyRate} (₪)</label>
                <input className="input" type="number" placeholder="0" value={newWorkerRate} onChange={e => setNewWorkerRate(e.target.value)} />
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
