import { useState } from 'react'
import { useApp } from '../../context/AppContext.jsx'
import { useToast } from '../ui/Toast.jsx'
import { Button } from '../ui/Button.jsx'
import { Input, Select } from '../ui/Input.jsx'
import { Modal } from '../ui/Modal.jsx'

const COLORS = ['#22C55E','#3B82F6','#EF4444','#A855F7','#F59E0B','#14B8A6','#6B7280']
const ACCOUNT_TYPES = ['cash', 'bank', 'credit', 'investment', 'other']

function AccountForm({ account, onClose }) {
  const { addAccount, editAccount } = useApp()
  const toast = useToast()
  const isEdit = !!account

  const [name, setName] = useState(account?.name || '')
  const [icon, setIcon] = useState(account?.icon || '💳')
  const [color, setColor] = useState(account?.color || '#3B82F6')
  const [type, setType] = useState(account?.type || 'bank')
  const [initialBalance, setInitialBalance] = useState(account?.initialBalance?.toString() || '0')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!name.trim()) return
    setLoading(true)
    try {
      const data = { name: name.trim(), icon, color, type, initialBalance: Number(initialBalance) || 0 }
      if (isEdit) {
        await editAccount(account.id, data)
        toast.show({ message: 'Account updated' })
      } else {
        await addAccount(data)
        toast.show({ message: 'Account added' })
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
      <Input label="Name" value={name} onChange={e => setName(e.target.value)} placeholder="Account name" required />

      <div className="flex gap-3">
        <Input label="Icon (emoji)" value={icon} onChange={e => setIcon(e.target.value)} className="text-xl text-center w-20" maxLength={2} />
        <Select label="Type" value={type} onChange={e => setType(e.target.value)} className="flex-1">
          {ACCOUNT_TYPES.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
        </Select>
      </div>

      <Input
        label="Initial Balance"
        type="number"
        inputMode="decimal"
        step="0.01"
        value={initialBalance}
        onChange={e => setInitialBalance(e.target.value)}
      />

      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Color</label>
        <div className="flex flex-wrap gap-2">
          {COLORS.map(c => (
            <button key={c} type="button" onClick={() => setColor(c)}
              className={`w-7 h-7 rounded-full transition-transform ${color === c ? 'scale-125 ring-2 ring-offset-2 ring-gray-400 dark:ring-offset-gray-900' : 'hover:scale-110'}`}
              style={{ backgroundColor: c }} />
          ))}
        </div>
      </div>

      <div className="flex gap-3 pt-1">
        <Button type="button" variant="secondary" className="flex-1" onClick={onClose}>Cancel</Button>
        <Button type="submit" className="flex-1" disabled={loading}>{loading ? 'Saving…' : isEdit ? 'Update' : 'Add'}</Button>
      </div>
    </form>
  )
}

export function AccountManager() {
  const { accounts, removeAccount } = useApp()
  const toast = useToast()
  const [formOpen, setFormOpen] = useState(false)
  const [editTarget, setEditTarget] = useState(null)

  async function handleDelete(acc) {
    if (!confirm(`Delete "${acc.name}"?`)) return
    try {
      await removeAccount(acc.id)
      toast.show({ message: 'Account deleted' })
    } catch (err) {
      toast.show({ message: err.message, type: 'error' })
    }
  }

  return (
    <div>
      {accounts.map(acc => (
        <div key={acc.id} className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 dark:border-gray-800">
          <div className="w-9 h-9 rounded-full flex items-center justify-center text-lg flex-shrink-0"
            style={{ backgroundColor: acc.color + '20' }}>
            {acc.icon}
          </div>
          <div className="flex-1">
            <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{acc.name}</div>
            <div className="text-xs text-gray-500 dark:text-gray-400">{acc.type}</div>
          </div>
          <button className="p-1.5 text-gray-400 hover:text-indigo-600 transition" onClick={() => { setEditTarget(acc); setFormOpen(true) }}>✏️</button>
          {!acc.isDefault && (
            <button className="p-1.5 text-gray-400 hover:text-red-500 transition" onClick={() => handleDelete(acc)}>🗑</button>
          )}
        </div>
      ))}

      <div className="p-4">
        <Button variant="secondary" className="w-full" onClick={() => { setEditTarget(null); setFormOpen(true) }}>
          + Add Account
        </Button>
      </div>

      <Modal open={formOpen} onClose={() => setFormOpen(false)} title={editTarget ? 'Edit Account' : 'New Account'}>
        <AccountForm account={editTarget} onClose={() => setFormOpen(false)} />
      </Modal>
    </div>
  )
}
