import { Header } from '../components/layout/Header.jsx'
import { ScheduleManager } from '../components/schedules/ScheduleManager.jsx'

export function SchedulesPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <Header title="Schedules" />
      <div className="flex-1 overflow-y-auto pb-20">
        <ScheduleManager />
      </div>
    </div>
  )
}
