import { HashRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { LanguageProvider } from './context/LanguageContext'
import BottomNav from './components/BottomNav'
import LoginScreen from './screens/LoginScreen'
import WorkDaysScreen from './screens/WorkDaysScreen'
import AddWorkDayScreen from './screens/AddWorkDayScreen'
import SitesScreen from './screens/SitesScreen'
import WorkersScreen from './screens/WorkersScreen'
import WorkerDetailScreen from './screens/WorkerDetailScreen'
import WorkDayDetailScreen from './screens/WorkDayDetailScreen'
import ExpensesScreen from './screens/ExpensesScreen'

function ProtectedRoute() {
  const { user, loading } = useAuth()
  if (loading) return <div className="page flex items-center justify-center"><p className="text-gray-400">Loading…</p></div>
  if (!user) return <Navigate to="/login" replace />
  return (
    <>
      <Outlet />
      <BottomNav />
    </>
  )
}

function AppRoutes() {
  const { user, loading } = useAuth()
  if (loading) return null
  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <LoginScreen />} />
      <Route element={<ProtectedRoute />}>
        <Route path="/" element={<WorkDaysScreen />} />
        <Route path="/work-days/add" element={<AddWorkDayScreen />} />
        <Route path="/work-days/:id" element={<WorkDayDetailScreen />} />
        <Route path="/sites" element={<SitesScreen />} />
        <Route path="/workers" element={<WorkersScreen />} />
        <Route path="/workers/:id" element={<WorkerDetailScreen />} />
        <Route path="/expenses" element={<ExpensesScreen />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <HashRouter>
      <AuthProvider>
        <LanguageProvider>
          <AppRoutes />
        </LanguageProvider>
      </AuthProvider>
    </HashRouter>
  )
}
