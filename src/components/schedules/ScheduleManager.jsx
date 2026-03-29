import { useState } from 'react'
import { useApp } from '../../context/AppContext.jsx'
import { useToast } from '../ui/Toast.jsx'
import { Button } from '../ui/Button.jsx'
import { Input, Select, Textarea } from '../ui/Input.jsx'
import { Modal } from '../ui/Modal.jsx'
import { EmptyState } from '../ui/EmptyState.jsx'
import { formatDisplay, toDateString, today } from '../../utils/dateHelpers.js'
import { formatCurrency } from '../../utils/currencyFormatter.js'

const FREQUENCIES = [
  { value: 'daily',     label: 'Daily'      },
  { value: 'weekly',    label: 'Weekly'     },
  { value: 'biweekly',  label: 'Biweekly'   },
  { value: 'monthly',   label: 'Monthly'    },
  { value: 'yearly',    label: 'Yearly'     },
]

// ── Schedule Form ─────────────────────────────────────────────

function ScheduleForm({ schedule, onClose }) {
  const { categories, accounts, addSchedule, editSchedule } = useApp()
  const toast = useToast()
  const isEdit = !!schedule?.id

  const [name, setName] = useState(schedule?.name || '')
  const [type, setType] = useState(schedule?.type || 'expense')
  const [amount, setAmount] = useState(schedule?.amount?.toString() || '')
  const [categoryId, setCategoryId] = useState(schedule?.categoryId || '')
  const [accountId, setAccountId] = useState(() => {
    if (schedule?.accountId) return schedule.accountId
    const bank = accounts.find(a => a.type === 'bank') ?? accounts[0]
    return bank?.id || ''
  })
  const [note, setNote] = useState(schedule?.note || '')
  const [frequency, setFrequency] = useState(schedule?.frequency || 'monthly')
  const [startDate, setStartDate] = useState(schedule?.startDate || toDateString(today()))
  const [endDate, setEndDate] = useState(schedule?.endDate || '')
  const [loading, setLoading] = useState(false)

  const filteredCategories = categories.filter(c => c.type === type || c.type === 'both')

  async function handleSubmit(e) {
    e.preventDefault()
    if (!name.trim() || !amount || Number(amount) <= 0) return
    setLoading(true)
    try {
      const data = {
        name: name.trim(),
        type,
        amount: Number(amount),
        categoryId: categoryId || '',
        accountId: accountId || '',
        note: note.trim(),
        frequency,
        startDate,
        endDate: endDate || '',
      }
      if (isEdit) {
        await editSchedule(schedule.id, data)
        toast.show({ message: 'Schedule updated' })
      } else {
        await addSchedule(data)
        toast.show({ message: 'Schedule created' })
      }
      onClose()
    } catch (err) {
      toast.show({ message: err.message, type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-5">
      {/* Type toggle */}
      <div className="flex rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700">
        {['expense', 'income'].map(t => (
          <button key={t} type="button"
            onClick={() => { setType(t); setCategoryId('') }}
            className={`flex-1 py-2.5 text-sm font-semibold transition ${
              type === t
                ? t === 'income' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
                : 'bg-transparent text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
            }`}
          >
            {t === 'income' ? '↑ Income' : '↓ Expense'}
          </button>
        ))}
      </div>

      <Input label="Name" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Rent, Netflix, Salary…" required />

      <Input
        label="Amount"
        type="number" inputMode="decimal" step="0.01" min="0"
        placeholder="0.00"
        value={amount}
        onChange={e => setAmount(e.target.value)}
        className="text-2xl font-bold"
      />

      <Select label="Frequency" value={frequency} onChange={e => setFrequency(e.target.value)}>
        {FREQUENCIES.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
      </Select>

      <div className="grid grid-cols-2 gap-3">
        <Input label="Start Date" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} required />
        <Input label="End Date (optional)" type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
      </div>

      <Select label="Category" value={categoryId} onChange={e => setCategoryId(e.target.value)}>
        <option value="">— No category —</option>
        {filteredCategories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
      </Select>

      <Select label="Account" value={accountId} onChange={e => setAccountId(e.target.value)}>
        <option value="">— No account —</option>
        {accounts.map(a => <option key={a.id} value={a.id}>{a.icon} {a.name}</option>)}
      </Select>

      <Textarea label="Note (optional)" placeholder="Add a note…" value={note} onChange={e => setNote(e.target.value)} />

      <div className="flex gap-3 pt-1">
        <Button type="button" variant="secondary" className="flex-1" onClick={onClose}>Cancel</Button>
        <Button type="submit" variant={type === 'income' ? 'income' : 'expense'} className="flex-1" disabled={loading}>
          {loading ? 'Saving…' : isEdit ? 'Update' : 'Create'}
        </Button>
      </div>
    </form>
  )
}

// ── Schedule Manager ──────────────────────────────────────────

const FREQ_LABEL = { daily: 'Daily', weekly: 'Weekly', biweekly: 'Biweekly', monthly: 'Monthly', yearly: 'Yearly' }
const FREQ_ICON  = { daily: '📆', weekly: '🗓', biweekly: '🗓', monthly: '📅', yearly: '🗃' }

export function ScheduleManager() {
  const { schedules, categories, accounts, removeSchedule, editSchedule } = useApp()
  const toast = useToast()
  const [formOpen, setFormOpen] = useState(false)
  const [editTarget, setEditTarget] = useState(null)

  async function handleDelete(sch) {
    if (!confirm(`Delete "${sch.name}"?`)) return
    try {
      await removeSchedule(sch.id)
      toast.show({ message: 'Schedule deleted' })
    } catch (err) {
      toast.show({ message: err.message, type: 'error' })
    }
  }

  async function toggleActive(sch) {
    try {
      await editSchedule(sch.id, { isActive: !sch.isActive })
      toast.show({ message: sch.isActive ? 'Schedule paused' : 'Schedule resumed' })
    } catch (err) {
      toast.show({ message: err.message, type: 'error' })
    }
  }

  if (schedules.length === 0) {
    return (
      <div>
        <EmptyState
          icon="🔁"
          title="No scheduled transactions"
          description="Set up recurring income or expenses like rent, salary, or subscriptions."
          action={
            <Button onClick={() => { setEditTarget(null); setFormOpen(true) }}>
              + Add Schedule
            </Button>
          }
        />
        <Modal open={formOpen} onClose={() => setFormOpen(false)} title="New Schedule">
          <ScheduleForm onClose={() => setFormOpen(false)} />
        </Modal>
      </div>
    )
  }

  const active   = schedules.filter(s => s.isActive)
  const inactive = schedules.filter(s => !s.isActive)

  return (
    <div>
      {[['Active', active], ['Paused', inactive]].map(([label, list]) =>
        list.length > 0 && (
          <div key={label} className="mb-2">
            <div className="px-4 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide bg-gray-50 dark:bg-gray-900/50">
              {label}
            </div>
            {list.map(sch => {
              const cat = categories.find(c => c.id === sch.categoryId)
              const acc = accounts.find(a => a.id === sch.accountId)
              const isIncome = sch.type === 'income'

              return (
                <div key={sch.id} className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 dark:border-gray-800">
                  {/* Frequency icon */}
                  <div className="w-10 h-10 rounded-full bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center text-lg flex-shrink-0">
                    {FREQ_ICON[sch.frequency] || '🔁'}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{sch.name}</span>
                      <span className={`text-sm font-bold flex-shrink-0 ${isIncome ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400'}`}>
                        {isIncome ? '+' : '-'}{formatCurrency(sch.amount)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-400 dark:text-gray-500">
                      <span>{FREQ_LABEL[sch.frequency]}</span>
                      {cat && <span>· {cat.icon} {cat.name}</span>}
                      {acc && <span>· {acc.icon} {acc.name}</span>}
                      {sch.nextDate && (
                        <span className="ml-auto text-indigo-500 dark:text-indigo-400 font-medium">
                          Next: {formatDisplay(sch.nextDate, 'MMM d')}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {/* Pause/resume toggle */}
                    <button
                      onClick={() => toggleActive(sch)}
                      title={sch.isActive ? 'Pause' : 'Resume'}
                      className="p-1.5 text-gray-400 hover:text-indigo-500 transition text-base"
                    >
                      {sch.isActive ? '⏸' : '▶️'}
                    </button>
                    <button onClick={() => { setEditTarget(sch); setFormOpen(true) }}
                      className="p-1.5 text-gray-400 hover:text-indigo-600 transition">✏️</button>
                    <button onClick={() => handleDelete(sch)}
                      className="p-1.5 text-gray-400 hover:text-red-500 transition">🗑</button>
                  </div>
                </div>
              )
            })}
          </div>
        )
      )}

      <div className="p-4">
        <Button variant="secondary" className="w-full" onClick={() => { setEditTarget(null); setFormOpen(true) }}>
          + Add Schedule
        </Button>
      </div>

      <Modal open={formOpen} onClose={() => setFormOpen(false)} title={editTarget ? 'Edit Schedule' : 'New Schedule'} size="lg">
        <ScheduleForm schedule={editTarget} onClose={() => setFormOpen(false)} />
      </Modal>
    </div>
  )
}
