import { supabase } from '../lib/supabase'
import type { Site, Worker, WorkDay, WorkDaySite, WorkDayWorker, WorkerPayment, Expense } from '../types'

// ── Sites ─────────────────────────────────────────────────────────────────────

export async function getSites(userId: string): Promise<Site[]> {
  const { data, error } = await supabase
    .from('sites')
    .select('*')
    .eq('user_id', userId)
    .order('name')
  if (error) throw error
  return data
}

export async function addSite(userId: string, name: string): Promise<Site> {
  const { data, error } = await supabase
    .from('sites')
    .insert({ name, user_id: userId })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteSite(id: string) {
  const { error } = await supabase.from('sites').delete().eq('id', id)
  if (error) throw error
}

// ── Workers ───────────────────────────────────────────────────────────────────

export async function getWorkers(userId: string): Promise<Worker[]> {
  const { data, error } = await supabase
    .from('workers')
    .select('*')
    .eq('user_id', userId)
    .order('name')
  if (error) throw error
  return data
}

export async function addWorker(userId: string, name: string, daily_rate: number): Promise<Worker> {
  const { data, error } = await supabase
    .from('workers')
    .insert({ name, daily_rate, user_id: userId })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateWorkerRate(id: string, daily_rate: number) {
  const { error } = await supabase.from('workers').update({ daily_rate }).eq('id', id)
  if (error) throw error
}

export async function deleteWorker(id: string) {
  const { error } = await supabase.from('workers').delete().eq('id', id)
  if (error) throw error
}

// ── Work Days ─────────────────────────────────────────────────────────────────

export interface WorkDayEntry {
  date: string
  sites: Array<{
    site_id: string
    workers: Array<{ worker_id: string }>
  }>
}

export async function addWorkDay(userId: string, entry: WorkDayEntry): Promise<WorkDay> {
  // Insert work_day
  const { data: workDay, error: wdErr } = await supabase
    .from('work_days')
    .insert({ date: entry.date, user_id: userId })
    .select()
    .single()
  if (wdErr) throw wdErr

  for (const siteEntry of entry.sites) {
    // Insert work_day_site
    const { error: sErr } = await supabase
      .from('work_day_sites')
      .insert({ work_day_id: workDay.id, site_id: siteEntry.site_id })
    if (sErr) throw sErr

    // Insert work_day_workers for this site
    for (const w of siteEntry.workers) {
      const { error: wwErr } = await supabase
        .from('work_day_workers')
        .insert({ work_day_id: workDay.id, worker_id: w.worker_id, site_id: siteEntry.site_id })
      if (wwErr) throw wwErr
    }
  }

  // Auto-insert expenses for each unique worker
  const seen = new Set<string>()
  for (const siteEntry of entry.sites) {
    for (const w of siteEntry.workers) {
      if (seen.has(w.worker_id)) continue
      seen.add(w.worker_id)

      // Fetch worker rate
      const { data: worker, error: wErr } = await supabase
        .from('workers')
        .select('daily_rate')
        .eq('id', w.worker_id)
        .single()
      if (wErr) throw wErr

      await supabase.from('expenses').insert({
        date: entry.date,
        amount: worker.daily_rate,
        description: 'Worker pay',
        note: '',
        is_worker_pay: true,
        worker_id: w.worker_id,
        work_day_id: workDay.id,
        site_id: siteEntry.site_id,
        user_id: userId,
      })
    }
  }

  return workDay
}

export async function getWorkDays(userId: string): Promise<WorkDay[]> {
  const { data, error } = await supabase
    .from('work_days')
    .select('*')
    .eq('user_id', userId)
    .order('date', { ascending: false })
  if (error) throw error
  return data
}

export async function getWorkDaySites(workDayIds: string[]): Promise<WorkDaySite[]> {
  if (!workDayIds.length) return []
  const { data, error } = await supabase
    .from('work_day_sites')
    .select('*')
    .in('work_day_id', workDayIds)
  if (error) throw error
  return data
}

export async function getWorkDayWorkers(workDayIds: string[]): Promise<WorkDayWorker[]> {
  if (!workDayIds.length) return []
  const { data, error } = await supabase
    .from('work_day_workers')
    .select('*')
    .in('work_day_id', workDayIds)
  if (error) throw error
  return data
}

export async function deleteWorkDay(id: string) {
  // Fetch date + worker IDs before removing anything
  const [{ data: wd }, { data: wdwRows }] = await Promise.all([
    supabase.from('work_days').select('date').eq('id', id).single(),
    supabase.from('work_day_workers').select('worker_id').eq('work_day_id', id),
  ])
  const workerIds = [...new Set((wdwRows ?? []).map(r => r.worker_id))]

  // Delete worker-pay expenses linked by work_day_id
  await supabase.from('expenses').delete().eq('work_day_id', id).eq('is_worker_pay', true)

  // Fallback: delete any orphaned worker-pay expenses (work_day_id nulled by SET NULL race)
  if (workerIds.length && wd?.date) {
    await supabase
      .from('expenses')
      .delete()
      .in('worker_id', workerIds)
      .eq('date', wd.date)
      .eq('is_worker_pay', true)
      .is('work_day_id', null)
  }

  // Explicitly remove child rows BEFORE deleting the work_day (while RLS still allows it)
  await Promise.all([
    supabase.from('work_day_workers').delete().eq('work_day_id', id),
    supabase.from('work_day_sites').delete().eq('work_day_id', id),
  ])

  const { error } = await supabase.from('work_days').delete().eq('id', id)
  if (error) throw error
}

// ── Worker Payments ───────────────────────────────────────────────────────────

export async function getWorkerPayments(userId: string): Promise<WorkerPayment[]> {
  const { data, error } = await supabase
    .from('worker_payments')
    .select('*')
    .eq('user_id', userId)
    .order('date', { ascending: false })
  if (error) throw error
  return data
}

export async function addWorkerPayment(
  userId: string,
  worker_id: string,
  amount: number,
  date: string,
  note: string
): Promise<WorkerPayment> {
  const { data, error } = await supabase
    .from('worker_payments')
    .insert({ worker_id, amount, date, note, user_id: userId })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateWorkerPayment(id: string, amount: number, date: string, note: string) {
  const { error } = await supabase
    .from('worker_payments')
    .update({ amount, date, note })
    .eq('id', id)
  if (error) throw error
}

export async function deleteWorkerPayment(id: string) {
  const { error } = await supabase.from('worker_payments').delete().eq('id', id)
  if (error) throw error
}

// ── Expenses ──────────────────────────────────────────────────────────────────

export async function getExpenses(userId: string): Promise<Expense[]> {
  const { data, error } = await supabase
    .from('expenses')
    .select('*')
    .eq('user_id', userId)
    .order('date', { ascending: false })
  if (error) throw error
  return data
}

export async function addExpense(
  userId: string,
  date: string,
  amount: number,
  description: string,
  note: string,
  site_id: string | null = null
): Promise<Expense> {
  // Only include site_id when it has a value — avoids errors if column not yet migrated
  const row: Record<string, unknown> = {
    date, amount, description, note,
    is_worker_pay: false, worker_id: null, work_day_id: null,
    user_id: userId,
  }
  if (site_id) row.site_id = site_id

  const { data, error } = await supabase
    .from('expenses')
    .insert(row)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteExpense(id: string) {
  const { error } = await supabase.from('expenses').delete().eq('id', id)
  if (error) throw error
}

// ── Export ────────────────────────────────────────────────────────────────────

export async function fetchExportData(userId: string) {
  const [workers, workDays, sites, payments, expenses] = await Promise.all([
    getWorkers(userId),
    getWorkDays(userId),
    getSites(userId),
    getWorkerPayments(userId),
    getExpenses(userId),
  ])
  let wdWorkers: WorkDayWorker[] = []
  let wdSites: WorkDaySite[] = []
  if (workDays.length) {
    const ids = workDays.map(d => d.id)
    ;[wdWorkers, wdSites] = await Promise.all([getWorkDayWorkers(ids), getWorkDaySites(ids)])
  }
  return { workers, workDays, sites, payments, expenses, wdWorkers, wdSites }
}
