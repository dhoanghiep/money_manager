import { HashRouter, Routes, Route } from 'react-router-dom'
import { ThemeProvider } from './context/ThemeContext.jsx'
import { AppProvider } from './context/AppContext.jsx'
import { ToastProvider } from './components/ui/Toast.jsx'
import { BottomNav } from './components/layout/BottomNav.jsx'
import { DashboardPage } from './pages/DashboardPage.jsx'
import { CalendarPage } from './pages/CalendarPage.jsx'
import { TransactionsPage } from './pages/TransactionsPage.jsx'
import { SettingsPage } from './pages/SettingsPage.jsx'
import { PasswordGate, usePasswordGate } from './components/PasswordGate.jsx'

function AppShell() {
  const { unlocked, unlock } = usePasswordGate()

  if (!unlocked) {
    return <PasswordGate onUnlock={unlock} />
  }

  return (
    <AppProvider>
      <HashRouter>
        <div className="max-w-lg mx-auto relative min-h-screen">
          <Routes>
            <Route path="/"             element={<CalendarPage />} />
            <Route path="/dashboard"    element={<DashboardPage />} />
            <Route path="/transactions" element={<TransactionsPage />} />
            <Route path="/settings"     element={<SettingsPage />} />
          </Routes>
          <BottomNav />
        </div>
      </HashRouter>
    </AppProvider>
  )
}

export default function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <AppShell />
      </ToastProvider>
    </ThemeProvider>
  )
}
