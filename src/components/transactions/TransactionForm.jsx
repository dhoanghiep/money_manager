import { useState } from 'react'
import { useApp } from '../../context/AppContext.jsx'
import { useToast } from '../ui/Toast.jsx'
import { Button } from '../ui/Button.jsx'
import { Input, Select, Textarea } from '../ui/Input.jsx'
import { toDateString, today } from '../../utils/dateHelpers.js'

const INCOME_COLOR = '#22C55E'
const EXPENSE_COLOR = '#EF4444'

export function TransactionForm({ transaction, onClose }) {
  const { categories, accounts, addTransaction, editTransaction } = useApp()
  const toast = useToast()
  const isEdit = !!transaction

  const [type, setType] = useState(transaction?.type || 'expense')
  const [amount, setAmount] = useState(transaction?.amount?.toString() || '')
  const [date, setDate] = useState(transaction?.date || toDateString(today()))
  const [categoryId, setCategoryId] = useState(transaction?.categoryId || '')
  const [accountId, setAccountId] = useState(transaction?.accountId || '')
  const [note, setNote] = useState(transaction?.note || '')
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState({})

  const filteredCategories = categories.filter(c => c.type === type || c.type === 'both')

  function validate() {
    const errs = {}
    if (!amount || isNaN(amount) || Number(amount) <= 0) errs.amount = 'Enter a valid amount'
    if (!date) errs.date = 'Date is required'
    return errs
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }

    setLoading(true)
    try {
      const data = {
        type,
        amount: Number(amount),
        date,
        categoryId: categoryId || null,
        accountId: accountId || null,
        note: note.trim(),
      }
      if (isEdit) {
        await editTransaction(transaction.id, data)
        toast.show({ message: 'Transaction updated' })
      } else {
        await addTransaction(data)
        toast.show({ message: 'Transaction added' })
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
          <button
            key={t}
            type="button"
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

      {/* Amount */}
      <Input
        label="Amount"
        type="number"
        inputMode="decimal"
        step="0.01"
        min="0"
        placeholder="0.00"
        value={amount}
        onChange={e => setAmount(e.target.value)}
        error={errors.amount}
        className="text-2xl font-bold"
      />

      {/* Date */}
      <Input
        label="Date"
        type="date"
        value={date}
        onChange={e => setDate(e.target.value)}
        error={errors.date}
      />

      {/* Category */}
      <Select
        label="Category"
        value={categoryId}
        onChange={e => setCategoryId(e.target.value)}
      >
        <option value="">— No category —</option>
        {filteredCategories.map(c => (
          <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
        ))}
      </Select>

      {/* Account */}
      <Select
        label="Account"
        value={accountId}
        onChange={e => setAccountId(e.target.value)}
      >
        <option value="">— No account —</option>
        {accounts.map(a => (
          <option key={a.id} value={a.id}>{a.icon} {a.name}</option>
        ))}
      </Select>

      {/* Note */}
      <Textarea
        label="Note (optional)"
        placeholder="Add a note…"
        value={note}
        onChange={e => setNote(e.target.value)}
      />

      {/* Actions */}
      <div className="flex gap-3 pt-1">
        <Button type="button" variant="secondary" className="flex-1" onClick={onClose}>
          Cancel
        </Button>
        <Button
          type="submit"
          variant={type === 'income' ? 'income' : 'expense'}
          className="flex-1"
          disabled={loading}
        >
          {loading ? 'Saving…' : isEdit ? 'Update' : 'Add'}
        </Button>
      </div>
    </form>
  )
}
