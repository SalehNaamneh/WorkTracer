import { useState, useEffect, useMemo } from 'react'
import { useAuth } from '../context/AuthContext'
import { useLanguage } from '../context/LanguageContext'
import { getSites, getWorkers, getWorkDays, getWorkDaySites, getWorkDayWorkers, addSite, deleteSite } from '../db/storage'
import type { Site, Worker, WorkDay, WorkDaySite, WorkDayWorker } from '../types'
import DeleteConfirmModal from '../components/DeleteConfirmModal'

function formatDate(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit' })
}

type SortMode = 'date' | 'site'

interface DayRow {
  workDayId: string
  date: string
  site: Site | undefined
  workers: WorkDayWorker[]
}

export default function SitesScreen() {
  const { user } = useAuth()
  const { s } = useLanguage()

  const [sites, setSites] = useState<Site[]>([])
  const [workers, setWorkers] = useState<Worker[]>([])
  const [workDays, setWorkDays] = useState<WorkDay[]>([])
  const [wdSites, setWdSites] = useState<WorkDaySite[]>([])
  const [wdWorkers, setWdWorkers] = useState<WorkDayWorker[]>([])
  const [loading, setLoading] = useState(true)

  const [sortMode, setSortMode] = useState<SortMode>('date')
  const [filterSiteId, setFilterSiteId] = useState('')
  const [expandedSites, setExpandedSites] = useState<Set<string>>(new Set())
  const [showAddSite, setShowAddSite] = useState(false)
  const [newSiteName, setNewSiteName] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<Site | null>(null)

  const load = async () => {
    if (!user) return
    setLoading(true)
    const [s2, w, wd] = await Promise.all([getSites(user.id), getWorkers(user.id), getWorkDays(user.id)])
    setSites(s2)
    setWorkers(w)
    setWorkDays(wd)
    if (wd.length) {
      const ids = wd.map(d => d.id)
      const [wds, wdw] = await Promise.all([getWorkDaySites(ids), getWorkDayWorkers(ids)])
      setWdSites(wds)
      setWdWorkers(wdw)
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [user])

  const siteMap = Object.fromEntries(sites.map(s => [s.id, s]))
  const workerMap = Object.fromEntries(workers.map(w => [w.id, w]))

  const rows = useMemo<DayRow[]>(() => {
    return wdSites
      .filter(ws => !filterSiteId || ws.site_id === filterSiteId)
      .map(ws => {
        const wd = workDays.find(d => d.id === ws.work_day_id)
        const rowWorkers = wdWorkers.filter(w => w.work_day_id === ws.work_day_id && w.site_id === ws.site_id)
        return { workDayId: ws.work_day_id, date: wd?.date ?? '', site: siteMap[ws.site_id], workers: rowWorkers }
      })
      .filter(r => r.site && r.date)
      .sort((a, b) => b.date.localeCompare(a.date))
  }, [wdSites, wdWorkers, workDays, filterSiteId, siteMap])

  const byDate = useMemo(() => {
    const groups: Record<string, DayRow[]> = {}
    rows.forEach(r => {
      if (!groups[r.date]) groups[r.date] = []
      groups[r.date].push(r)
    })
    return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]))
  }, [rows])

  const bySite = useMemo(() => {
    const groups: Record<string, DayRow[]> = {}
    rows.forEach(r => {
      const key = r.site?.id ?? ''
      if (!groups[key]) groups[key] = []
      groups[key].push(r)
    })
    return Object.entries(groups).sort((a, b) =>
      (siteMap[a[0]]?.name ?? '').localeCompare(siteMap[b[0]]?.name ?? '')
    )
  }, [rows, siteMap])

  const toggleSiteExpand = (id: string) => {
    setExpandedSites(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const handleAddSite = async () => {
    if (!user || !newSiteName.trim()) return
    await addSite(user.id, newSiteName.trim())
    setNewSiteName('')
    setShowAddSite(false)
    load()
  }

  const handleDeleteSite = async () => {
    if (!deleteTarget) return
    await deleteSite(deleteTarget.id)
    setDeleteTarget(null)
    load()
  }

  return (
    <div className="page">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{s.sites}</h1>
          {sites.length > 0 && (
            <p className="text-sm text-gray-400 mt-0.5">{sites.length} {s.sites.toLowerCase()}</p>
          )}
        </div>
        <button onClick={() => setShowAddSite(true)} className="fab">＋</button>
      </div>

      {/* Filter pills */}
      {sites.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1 mb-3 -mx-4 px-4 no-scrollbar">
          <button onClick={() => setFilterSiteId('')} className={`pill flex-shrink-0 ${!filterSiteId ? 'pill-active' : ''}`}>
            {s.all}
          </button>
          {sites.map(site => (
            <button
              key={site.id}
              onClick={() => setFilterSiteId(id => id === site.id ? '' : site.id)}
              className={`pill flex-shrink-0 ${filterSiteId === site.id ? 'pill-active' : ''}`}
            >
              {site.name}
            </button>
          ))}
        </div>
      )}

      {/* Sort toggle */}
      <div className="flex gap-2 mb-4">
        <button onClick={() => setSortMode('date')} className={`pill ${sortMode === 'date' ? 'pill-active' : ''}`}>
          📅 {s.sortByDate}
        </button>
        <button onClick={() => setSortMode('site')} className={`pill ${sortMode === 'site' ? 'pill-active' : ''}`}>
          📍 {s.sortBySite}
        </button>
      </div>

      {loading ? (
        <p className="text-gray-400 text-sm text-center py-10">{s.loading}</p>
      ) : rows.length === 0 ? (
        <div className="card p-8 text-center">
          <p className="text-3xl mb-2">📍</p>
          <p className="text-gray-400 text-sm">{s.noDaysRecorded}</p>
        </div>
      ) : sortMode === 'date' ? (
        <div className="space-y-3">
          {byDate.map(([date, dayRows]) => {
            const d = new Date(date + 'T00:00:00')
            const dayNum = d.getDate()
            const dayName = d.toLocaleDateString('en-GB', { weekday: 'short' })
            const monthShort = d.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })

            return (
              <div key={date} className="card overflow-hidden">
                {/* Date header */}
                <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 border-b border-gray-100">
                  <div className="w-10 h-10 rounded-xl bg-blue-600 flex flex-col items-center justify-center flex-shrink-0">
                    <span className="text-white font-black text-sm leading-none">{dayNum}</span>
                    <span className="text-blue-200 text-[9px] font-bold uppercase leading-none mt-0.5">{dayName}</span>
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-gray-800 text-sm">{monthShort}</p>
                    <p className="text-xs text-gray-400">{dayRows.length} {dayRows.length === 1 ? s.sites.toLowerCase().slice(0, -1) : s.sites.toLowerCase()}</p>
                  </div>
                </div>

                {/* Sites for this day */}
                <div className="divide-y divide-gray-50">
                  {dayRows.map((r, i) => {
                    const workerNames = r.workers.map(w => workerMap[w.worker_id]?.name).filter(Boolean)
                    return (
                      <div key={i} className="flex items-start gap-3 px-4 py-3">
                        <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center text-sm flex-shrink-0 mt-0.5">📍</div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm text-gray-800">{r.site?.name}</p>
                          {workerNames.length > 0 ? (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {workerNames.map((name, ni) => (
                                <span key={ni} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{name}</span>
                              ))}
                            </div>
                          ) : (
                            <p className="text-xs text-gray-300 mt-0.5">{s.noWorkers}</p>
                          )}
                        </div>
                        <span className="text-xs text-gray-400 flex-shrink-0 mt-0.5">{r.workers.length} 👷</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        /* Sort by site — cards with counters */
        <div className="space-y-3">
          {bySite.map(([siteId, siteRows]) => {
            const site = siteMap[siteId]
            const uniqueWorkerIds = new Set(
              siteRows.flatMap(r => [...new Set(r.workers.map(w => w.worker_id))])
            )
            const uniqueDays = new Set(siteRows.map(r => r.date)).size
            const isExpanded = expandedSites.has(siteId)

            return (
              <div key={siteId} className="card overflow-hidden">
                <button onClick={() => toggleSiteExpand(siteId)} className="w-full p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">📍</span>
                      <span className="font-bold text-base text-gray-900">{site?.name}</span>
                    </div>
                    <span className={`chevron ${isExpanded ? 'chevron-open' : ''}`}>▼</span>
                  </div>
                  <div className="flex gap-3">
                    <div className="stat-badge flex-1">
                      <p className="stat-badge-value">{uniqueDays}</p>
                      <p className="stat-badge-label">{s.daysLabel}</p>
                    </div>
                    <div className="stat-badge flex-1">
                      <p className="stat-badge-value">{uniqueWorkerIds.size}</p>
                      <p className="stat-badge-label">{s.workersLabel}</p>
                    </div>
                  </div>
                </button>

                {isExpanded && (
                  <div className="border-t border-gray-100">
                    {siteRows
                      .sort((a, b) => b.date.localeCompare(a.date))
                      .map((r, i) => (
                        <div key={i} className={`flex items-center justify-between px-4 py-3 ${i < siteRows.length - 1 ? 'border-b border-gray-50' : ''}`}>
                          <span className="text-sm font-medium text-blue-600">{formatDate(r.date)}</span>
                          <p className="text-xs text-gray-500 text-end max-w-[55%] truncate">
                            {r.workers.length > 0
                              ? r.workers.map(w => workerMap[w.worker_id]?.name).filter(Boolean).join(', ')
                              : <span className="text-gray-300">{s.noWorkers}</span>
                            }
                          </p>
                        </div>
                      ))
                    }
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Manage sites */}
      {sites.length > 0 && (
        <div className="mt-6">
          <p className="section-title">{s.manageSites}</p>
          <div className="space-y-2">
            {sites.map(site => (
              <div key={site.id} className="card p-3 flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">{site.name}</span>
                <button
                  onClick={() => setDeleteTarget(site)}
                  className="text-xs text-red-500 font-medium bg-red-50 px-2.5 py-1 rounded-lg"
                >
                  {s.delete}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add site sheet */}
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

      {deleteTarget && (
        <DeleteConfirmModal
          title={deleteTarget.name}
          onConfirm={handleDeleteSite}
          onClose={() => setDeleteTarget(null)}
        />
      )}
    </div>
  )
}
