import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useLanguage } from '../context/LanguageContext'
import { getWorkDays, getWorkDaySites, getWorkDayWorkers, getSites, getWorkers } from '../db/storage'
import type { WorkDay, Site, Worker, WorkDaySite, WorkDayWorker } from '../types'

function formatDate(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit' })
}

function monthLabel(m: string) {
  return new Date(m + '-01').toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
}

export default function WorkDaysScreen() {
  const { user } = useAuth()
  const { s } = useLanguage()
  const navigate = useNavigate()

  const [workDays, setWorkDays] = useState<WorkDay[]>([])
  const [wdSites, setWdSites] = useState<WorkDaySite[]>([])
  const [wdWorkers, setWdWorkers] = useState<WorkDayWorker[]>([])
  const [sites, setSites] = useState<Site[]>([])
  const [workers, setWorkers] = useState<Worker[]>([])
  const [loading, setLoading] = useState(true)

  const load = async () => {
    if (!user) return
    setLoading(true)
    const [wd, s2, w] = await Promise.all([getWorkDays(user.id), getSites(user.id), getWorkers(user.id)])
    setWorkDays(wd)
    setSites(s2)
    setWorkers(w)
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

  const byMonth: Record<string, WorkDay[]> = {}
  workDays.forEach(wd => {
    const m = wd.date.slice(0, 7)
    if (!byMonth[m]) byMonth[m] = []
    byMonth[m].push(wd)
  })
  const months = Object.entries(byMonth).sort((a, b) => b[0].localeCompare(a[0]))

  return (
    <div className="page">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{s.workDays}</h1>
          {workDays.length > 0 && (
            <p className="text-sm text-gray-400 mt-0.5">{workDays.length} {s.daysLogged}</p>
          )}
        </div>
        <button onClick={() => navigate('/work-days/add')} className="fab">＋</button>
      </div>

      {loading ? (
        <p className="text-gray-400 text-sm text-center py-10">{s.loading}</p>
      ) : workDays.length === 0 ? (
        <div className="card p-8 text-center">
          <p className="text-4xl mb-3">📅</p>
          <p className="font-semibold text-gray-600 mb-1">{s.noWorkDays}</p>
          <p className="text-sm text-gray-400">{s.tapToAdd}</p>
        </div>
      ) : (
        <div className="space-y-6">
          {months.map(([month, days]) => (
            <div key={month}>
              <p className="section-title">
                {monthLabel(month)}
                <span className="ms-2 text-gray-300 font-normal normal-case tracking-normal">
                  {days.length} {days.length === 1 ? s.day : s.days}
                </span>
              </p>
              <div className="space-y-2">
                {[...days].sort((a, b) => b.date.localeCompare(a.date)).map(wd => {
                  const daySites = wdSites.filter(ws => ws.work_day_id === wd.id)
                  const dayWorkers = wdWorkers.filter(ww => ww.work_day_id === wd.id)
                  const uniqueWorkerIds = [...new Set(dayWorkers.map(w => w.worker_id))]

                  return (
                    <button
                      key={wd.id}
                      onClick={() => navigate(`/work-days/${wd.id}`)}
                      className="card p-4 w-full text-start active:scale-[0.98] transition-transform"
                    >
                      <div className="flex items-start gap-3">
                        {/* Calendar chip */}
                        <div className="w-11 h-11 rounded-xl bg-blue-600 flex flex-col items-center justify-center flex-shrink-0">
                          <span className="text-white font-black text-base leading-none">
                            {new Date(wd.date + 'T00:00:00').getDate()}
                          </span>
                          <span className="text-blue-200 text-[9px] font-semibold uppercase leading-none mt-0.5">
                            {new Date(wd.date + 'T00:00:00').toLocaleDateString('en-GB', { month: 'short' })}
                          </span>
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-2">
                            <p className="font-bold text-gray-800">{formatDate(wd.date)}</p>
                            <div className="flex items-center gap-2 text-xs text-gray-400">
                              <span>📍{daySites.length}</span>
                              <span>👷{uniqueWorkerIds.length}</span>
                              <span className="text-gray-300">›</span>
                            </div>
                          </div>

                          <div className="space-y-1">
                            {daySites.map(ds => {
                              const site = siteMap[ds.site_id]
                              const siteWorkers = dayWorkers.filter(w => w.site_id === ds.site_id)
                              return (
                                <div key={ds.id} className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-1.5">
                                  <span className="text-xs text-gray-500 font-medium flex-1 truncate">{site?.name}</span>
                                  {siteWorkers.length > 0 && (
                                    <span className="text-xs text-gray-400 truncate max-w-[120px]">
                                      {siteWorkers.map(w => workerMap[w.worker_id]?.name).filter(Boolean).join(', ')}
                                    </span>
                                  )}
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
