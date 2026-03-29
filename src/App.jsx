import { HashRouter, Routes, Route } from 'react-router-dom'
import { ThemeProvider } from './context/ThemeContext.jsx'
import { AppProvider } from './context/AppContext.jsx'
import { ToastProvider } from './components/ui/Toast.jsx'
import { BottomNav } from './components/layout/BottomNav.jsx'
import { DashboardPage } from './pages/DashboardPage.jsx'
import { CalendarPage } from './pages/CalendarPage.jsx'
import { TransactionsPage } from './pages/TransactionsPage.jsx'
import { SettingsPage } from './pages/SettingsPage.jsx'

export default function App() {
  return (
    <ThemeProvider>
      <AppProvider>
        <ToastProvider>
          <HashRouter>
            <div className="max-w-lg mx-auto relative min-h-screen">
              <Routes>
                <Route path="/"             element={<DashboardPage />} />
                <Route path="/calendar"     element={<CalendarPage />} />
                <Route path="/transactions" element={<TransactionsPage />} />
                <Route path="/settings"     element={<SettingsPage />} />
              </Routes>
              <BottomNav />
            </div>
          </HashRouter>
        </ToastProvider>
      </AppProvider>
    </ThemeProvider>
  )
}
