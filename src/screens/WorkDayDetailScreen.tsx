import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useLanguage } from '../context/LanguageContext'
import { getWorkDays, getWorkDaySites, getWorkDayWorkers, getSites, getWorkers, deleteWorkDay } from '../db/storage'
import type { WorkDay, WorkDaySite, WorkDayWorker, Site, Worker } from '../types'
import DeleteConfirmModal from '../components/DeleteConfirmModal'

function formatDate(d: string) {
  const date = new Date(d + 'T00:00:00')
  return date.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}

export default function WorkDayDetailScreen() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const { s } = useLanguage()
  const navigate = useNavigate()

  const [workDay, setWorkDay] = useState<WorkDay | null>(null)
  const [wdSites, setWdSites] = useState<WorkDaySite[]>([])
  const [wdWorkers, setWdWorkers] = useState<WorkDayWorker[]>([])
  const [sites, setSites] = useState<Site[]>([])
  const [workers, setWorkers] = useState<Worker[]>([])
  const [loading, setLoading] = useState(true)
  const [showDelete, setShowDelete] = useState(false)

  useEffect(() => {
    if (!user || !id) return
    setLoading(true)
    Promise.all([getWorkDays(user.id), getSites(user.id), getWorkers(user.id)]).then(
      async ([wds, s2, w]) => {
        const wd = wds.find(d => d.id === id) ?? null
        setWorkDay(wd)
        setSites(s2)
        setWorkers(w)
        if (wd) {
          const [wdSiteData, wdWorkerData] = await Promise.all([
            getWorkDaySites([wd.id]),
            getWorkDayWorkers([wd.id]),
          ])
          setWdSites(wdSiteData)
          setWdWorkers(wdWorkerData)
        }
        setLoading(false)
      }
    )
  }, [user, id])

  const siteMap = Object.fromEntries(sites.map(s => [s.id, s]))
  const workerMap = Object.fromEntries(workers.map(w => [w.id, w]))

  const handleDelete = async () => {
    if (!id) return
    await deleteWorkDay(id)
    navigate('/', { replace: true })
  }

  if (loading) {
    return (
      <div className="page flex items-center justify-center">
        <p className="text-gray-400">{s.loading}</p>
      </div>
    )
  }

  if (!workDay) {
    return (
      <div className="page">
        <button onClick={() => navigate(-1)} className="back-btn mb-4">‹ {s.back}</button>
        <p className="text-gray-400">{s.noData}</p>
      </div>
    )
  }

  const uniqueWorkerIds = [...new Set(wdWorkers.map(w => w.worker_id))]

  return (
    <div className="page">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <button onClick={() => navigate(-1)} className="back-btn">‹ {s.back}</button>
        <button
          onClick={() => setShowDelete(true)}
          className="text-xs text-red-500 font-semibold bg-red-50 px-3 py-1.5 rounded-xl"
        >
          {s.delete}
        </button>
      </div>

      {/* Date hero */}
      <div className="card p-5 mb-4 bg-gradient-to-br from-blue-600 to-blue-700 text-white">
        <p className="text-xs font-semibold text-blue-200 uppercase tracking-wider mb-1">{s.workDay}</p>
        <p className="text-xl font-bold leading-tight">{formatDate(workDay.date)}</p>
        <div className="flex gap-4 mt-3">
          <div>
            <p className="text-2xl font-black">{wdSites.length}</p>
            <p className="text-xs text-blue-200">{wdSites.length === 1 ? s.sites.slice(0,-1) : s.sites}</p>
          </div>
          <div className="w-px bg-blue-500" />
          <div>
            <p className="text-2xl font-black">{uniqueWorkerIds.length}</p>
            <p className="text-xs text-blue-200">{s.workersLabel}</p>
          </div>
        </div>
      </div>

      {/* Sites breakdown */}
      <p className="section-title">{s.sites}</p>
      <div className="space-y-3 mb-4">
        {wdSites.map(ws => {
          const site = siteMap[ws.site_id]
          const siteWorkers = wdWorkers.filter(w => w.site_id === ws.site_id)
          return (
            <div key={ws.id} className="card p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center">📍</div>
                <p className="font-bold text-gray-800">{site?.name}</p>
              </div>

              {siteWorkers.length === 0 ? (
                <p className="text-sm text-gray-400 ps-12">{s.noWorkers}</p>
              ) : (
                <div className="flex flex-wrap gap-2 ps-0">
                  {siteWorkers.map(ww => {
                    const worker = workerMap[ww.worker_id]
                    const initials = worker?.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() ?? '?'
                    return (
                      <div key={ww.id} className="flex items-center gap-1.5 bg-gray-50 rounded-xl px-3 py-1.5">
                        <div className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center text-[9px] font-bold text-blue-700">
                          {initials}
                        </div>
                        <span className="text-sm font-medium text-gray-700">{worker?.name}</span>
                        <span className="text-xs text-gray-400">₪{worker?.daily_rate}</span>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Total pay for the day */}
      {uniqueWorkerIds.length > 0 && (
        <div className="card p-4 flex items-center justify-between">
          <p className="text-sm font-semibold text-gray-600">Total pay this day</p>
          <p className="font-bold text-lg text-blue-600">
            ₪{uniqueWorkerIds.reduce((sum, wid) => sum + (workerMap[wid]?.daily_rate ?? 0), 0)}
          </p>
        </div>
      )}

      {showDelete && (
        <DeleteConfirmModal
          title={formatDate(workDay.date)}
          onConfirm={handleDelete}
          onClose={() => setShowDelete(false)}
        />
      )}
    </div>
  )
}
