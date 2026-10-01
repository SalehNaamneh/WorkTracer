export interface Site {
  id: string
  name: string
  user_id: string
  created_at: string
}

export interface Worker {
  id: string
  name: string
  daily_rate: number
  user_id: string
  created_at: string
}

export interface WorkDay {
  id: string
  date: string
  user_id: string
  created_at: string
}

export interface WorkDaySite {
  id: string
  work_day_id: string
  site_id: string
}

export interface WorkDayWorker {
  id: string
  work_day_id: string
  worker_id: string
  site_id: string
}

export interface WorkerPayment {
  id: string
  worker_id: string
  amount: number
  date: string
  note: string
  user_id: string
  created_at: string
}

export interface Expense {
  id: string
  date: string
  amount: number
  description: string
  note: string
  is_worker_pay: boolean
  worker_id: string | null
  work_day_id: string | null
  site_id: string | null
  user_id: string
  created_at: string
}

// Enriched types used in UI
export interface WorkDayWithDetails extends WorkDay {
  sites: Site[]
  workers: Array<WorkDayWorker & { worker: Worker; site: Site }>
}

export interface WorkerWithStats extends Worker {
  totalEarned: number
  totalPaid: number
  totalOwed: number
  daysWorked: number
}
