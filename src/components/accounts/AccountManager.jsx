import { useState } from 'react'
import { useApp } from '../../context/AppContext.jsx'
import { api } from '../../api/client.js'

const DEFAULT_ACCOUNT_KEY = 'mm_default_account_id'
export function getDefaultAccountId() { return localStorage.getItem(DEFAULT_ACCOUNT_KEY) || '' }
export function setDefaultAccountId(id) { localStorage.setItem(DEFAULT_ACCOUNT_KEY, id) }

const DEFAULT_SUBACCOUNT_KEY = 'mm_default_subaccount_'
export function getDefaultSubAccountId(parentId) { return localStorage.getItem(DEFAULT_SUBACCOUNT_KEY + parentId) || '' }
export function setDefaultSubAccountId(parentId, id) { localStorage.setItem(DEFAULT_SUBACCOUNT_KEY + parentId, id) }
import { useToast } from '../ui/Toast.jsx'
import { Button } from '../ui/Button.jsx'
import { Input, Select } from '../ui/Input.jsx'
import { Modal } from '../ui/Modal.jsx'

const COLORS = ['#22C55E','#3B82F6','#EF4444','#A855F7','#F59E0B','#14B8A6','#6B7280','#EC4899','#F97316','#84CC16']
const ACCOUNT_TYPES = ['cash', 'bank', 'credit', 'investment', 'other']

// ── Account Form ──────────────────────────────────────────────

function AccountForm({ account, parentId, onClose }) {
  const { addAccount, editAccount } = useApp()
  const toast = useToast()
  const isEdit = !!account
  const isSub = !!(parentId || account?.parentId)

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
        await addAccount({ ...data, parentId: parentId || '' })
        toast.show({ message: isSub ? 'Sub-account added' : 'Account added' })
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
        {!isSub && (
          <Select label="Type" value={type} onChange={e => setType(e.target.value)} className="flex-1">
            {ACCOUNT_TYPES.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
          </Select>
        )}
      </div>

      {!isSub && (
        <Input
          label="Initial Balance"
          type="number"
          inputMode="decimal"
          step="0.01"
          value={initialBalance}
          onChange={e => setInitialBalance(e.target.value)}
        />
      )}

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

// ── Account Manager ───────────────────────────────────────────

export function AccountManager() {
  const { topLevelAccounts, subAccountsOf, removeAccount } = useApp()
  const toast = useToast()
  const [formOpen, setFormOpen] = useState(false)
  const [editTarget, setEditTarget] = useState(null)
  const [addSubParentId, setAddSubParentId] = useState(null)
  const [expandedIds, setExpandedIds] = useState(new Set())
  const [defaultId, setDefaultId] = useState(getDefaultAccountId)
  const [defaultSubIds, setDefaultSubIds] = useState({}) // { [parentId]: subAccountId }

  function handleSetDefault(id) {
    setDefaultAccountId(id)
    setDefaultId(id)
    api.setPreference('mm_default_account_id', id).catch(() => {})
    toast.show({ message: 'Default account updated' })
  }

  function handleSetDefaultSub(parentId, subId) {
    setDefaultSubAccountId(parentId, subId)
    setDefaultSubIds(prev => ({ ...prev, [parentId]: subId }))
    api.setPreference('mm_default_subaccount_' + parentId, subId).catch(() => {})
    toast.show({ message: 'Default sub-account updated' })
  }

  function getDefaultSub(parentId) {
    return defaultSubIds[parentId] ?? getDefaultSubAccountId(parentId)
  }

  function toggleExpand(id) {
    setExpandedIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  async function handleDelete(acc) {
    const subs = subAccountsOf(acc.id)
    const msg = subs.length > 0
      ? `Delete "${acc.name}" and its ${subs.length} sub-account${subs.length === 1 ? '' : 's'}?`
      : `Delete "${acc.name}"?`
    if (!confirm(msg)) return
    try {
      for (const sub of subs) await removeAccount(sub.id)
      await removeAccount(acc.id)
      toast.show({ message: 'Account deleted' })
    } catch (err) {
      toast.show({ message: err.message, type: 'error' })
    }
  }

  function openAddSub(parentId) {
    setEditTarget(null)
    setAddSubParentId(parentId)
    setFormOpen(true)
    setExpandedIds(prev => new Set([...prev, parentId]))
  }

  function openEdit(acc) {
    setEditTarget(acc)
    setAddSubParentId(null)
    setFormOpen(true)
  }

  function openAddTop() {
    setEditTarget(null)
    setAddSubParentId(null)
    setFormOpen(true)
  }

  return (
    <div>
      {topLevelAccounts.map(acc => {
        const subs = subAccountsOf(acc.id)
        const expanded = expandedIds.has(acc.id)

        return (
          <div key={acc.id}>
            {/* Parent account row */}
            <div
              className="flex items-center gap-2 px-4 py-3 border-b border-gray-100 dark:border-gray-800 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition"
              onClick={() => subs.length > 0 ? toggleExpand(acc.id) : null}
            >
              <div className="w-9 h-9 rounded-full flex items-center justify-center text-lg flex-shrink-0"
                style={{ backgroundColor: acc.color + '20' }}>
                {acc.icon}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{acc.name}</span>
                  {defaultId === acc.id && (
                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-400 leading-none">
                      default
                    </span>
                  )}
                </div>
                <div className="text-xs text-gray-400 dark:text-gray-500 flex items-center gap-1">
                  <span>{acc.type}</span>
                  {subs.length > 0 && (
                    <span>· {subs.length} sub-account{subs.length !== 1 ? 's' : ''}</span>
                  )}
                </div>
              </div>

              {/* Expand indicator */}
              {subs.length > 0 && (
                <span className="text-xs text-gray-400 dark:text-gray-500 select-none">
                  {expanded ? '▾' : '▸'}
                </span>
              )}

              {/* Default star */}
              <button
                onClick={e => { e.stopPropagation(); handleSetDefault(acc.id) }}
                title={defaultId === acc.id ? 'Default account' : 'Set as default'}
                className={`p-1.5 transition text-base leading-none ${
                  defaultId === acc.id
                    ? 'text-yellow-400'
                    : 'text-gray-200 dark:text-gray-700 hover:text-yellow-400'
                }`}
              >
                ★
              </button>

              <button onClick={e => { e.stopPropagation(); openAddSub(acc.id) }}
                className="p-1.5 text-gray-400 hover:text-indigo-500 transition text-sm" title="Add sub-account">⊕</button>
              <button onClick={e => { e.stopPropagation(); openEdit(acc) }}
                className="p-1.5 text-gray-400 hover:text-indigo-600 transition">✏️</button>
              {!acc.isDefault && (
                <button onClick={e => { e.stopPropagation(); handleDelete(acc) }}
                  className="p-1.5 text-gray-400 hover:text-red-500 transition">🗑</button>
              )}
            </div>

            {/* Sub-accounts (expanded) */}
            {expanded && subs.map(sub => {
              const isDefaultSub = getDefaultSub(acc.id) === sub.id
              return (
                <div key={sub.id} className="flex items-center gap-2 pl-10 pr-4 py-2.5 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/20">
                  <div className="w-1 h-4 rounded-full bg-gray-200 dark:bg-gray-700 flex-shrink-0" />
                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-sm flex-shrink-0"
                    style={{ backgroundColor: sub.color + '20' }}>
                    {sub.icon}
                  </div>
                  <div className="flex-1 min-w-0 flex items-center gap-1.5">
                    <span className="text-sm text-gray-700 dark:text-gray-300">{sub.name}</span>
                    {isDefaultSub && (
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-400 leading-none">
                        default
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => handleSetDefaultSub(acc.id, sub.id)}
                    title={isDefaultSub ? 'Default sub-account' : 'Set as default sub-account'}
                    className={`p-1 transition text-sm leading-none ${isDefaultSub ? 'text-yellow-400' : 'text-gray-200 dark:text-gray-700 hover:text-yellow-400'}`}
                  >★</button>
                  <button onClick={() => openEdit(sub)}
                    className="p-1 text-gray-400 hover:text-indigo-600 transition text-sm">✏️</button>
                  <button onClick={() => handleDelete(sub)}
                    className="p-1 text-gray-400 hover:text-red-500 transition text-sm">🗑</button>
                </div>
              )
            })}

            {/* "Default" placeholder when expanded and has subs */}
            {expanded && subs.length > 0 && (
              <div className="flex items-center gap-2 pl-10 pr-4 py-2 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/20">
                <div className="w-1 h-4 rounded-full bg-gray-200 dark:bg-gray-700 flex-shrink-0" />
                <div className="w-7 h-7 rounded-full flex items-center justify-center text-sm flex-shrink-0 bg-gray-100 dark:bg-gray-800">
                  {acc.icon}
                </div>
                <span className="flex-1 text-sm text-gray-400 dark:text-gray-500 italic">General (default)</span>
              </div>
            )}
          </div>
        )
      })}

      <div className="p-4">
        <Button variant="secondary" className="w-full" onClick={openAddTop}>
          + Add Account
        </Button>
      </div>

      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editTarget ? 'Edit Account' : addSubParentId ? 'Add Sub-account' : 'New Account'}
      >
        <AccountForm
          account={editTarget}
          parentId={addSubParentId}
          onClose={() => setFormOpen(false)}
        />
      </Modal>
    </div>
  )
}
