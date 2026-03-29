import { useState, useEffect } from 'react'
import { useApp } from '../../context/AppContext.jsx'
import { useCurrency } from '../../context/CurrencyContext.jsx'
import { SUPPORTED_CURRENCIES } from '../../utils/exchangeRates.js'
import { useToast } from '../ui/Toast.jsx'
import { Button } from '../ui/Button.jsx'
import { Input, Select, Textarea } from '../ui/Input.jsx'
import { toDateString, today } from '../../utils/dateHelpers.js'
import { formatCurrency } from '../../utils/currencyFormatter.js'
import { getDefaultAccountId, getDefaultSubAccountId } from '../accounts/AccountManager.jsx'

export function TransactionForm({ transaction, onClose }) {
  const { categories, accounts, addTransaction, editTransaction, topLevelCategories, subCategoriesOf, topLevelAccounts, subAccountsOf } = useApp()
  const { defaultCurrency, getRate, fetchSingleRate } = useCurrency()
  const toast = useToast()
  const isEdit = !!transaction?.id

  const [type, setType] = useState(transaction?.type || 'expense')
  const [amount, setAmount] = useState(transaction?.amount?.toString() || '')
  const [date, setDate] = useState(transaction?.date || toDateString(today()))
  const [categoryId, setCategoryId] = useState(transaction?.categoryId || '')
  const [subCategoryId, setSubCategoryId] = useState(transaction?.subCategoryId || '')
  const [accountId, setAccountId] = useState(transaction?.accountId || '')
  const [subAccountId, setSubAccountId] = useState(transaction?.subAccountId || '')
  const [currency, setCurrency] = useState(transaction?.currency || defaultCurrency)
  const [exchangeRate, setExchangeRate] = useState(
    transaction?.exchangeRate ? String(transaction.exchangeRate) : ''
  )
  const [fetchingRate, setFetchingRate] = useState(false)
  const [note, setNote] = useState(transaction?.note || '')
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState({})

  // Default account for new transactions: user-set default → bank type → first account
  useEffect(() => {
    if (!isEdit && !transaction?.accountId && accounts.length > 0 && !accountId) {
      const savedId = getDefaultAccountId()
      const saved = savedId && accounts.find(a => a.id === savedId)
      const fallback = accounts.find(a => a.type === 'bank') ?? accounts[0]
      if (saved || fallback) setAccountId((saved || fallback).id)
    }
  }, [accounts])

  // When currency changes, pre-fill rate from cached rates
  useEffect(() => {
    if (currency === defaultCurrency) {
      setExchangeRate('')
    } else {
      const cached = getRate(currency)
      if (cached && cached !== 1) setExchangeRate(String(cached))
    }
  }, [currency, defaultCurrency])

  // Reset sub-category when parent category changes
  useEffect(() => { setSubCategoryId('') }, [categoryId])

  // Auto-select default sub-account when parent account changes
  useEffect(() => {
    if (!accountId) { setSubAccountId(''); return }
    const savedSub = getDefaultSubAccountId(accountId)
    setSubAccountId(savedSub || '')
  }, [accountId])

  const filteredCategories = topLevelCategories.filter(c => c.type === type || c.type === 'both')
  const availableSubCategories = categoryId ? subCategoriesOf(categoryId) : []
  const availableSubAccounts = accountId ? subAccountsOf(accountId) : []

  const isForeign = currency !== defaultCurrency
  const rate = parseFloat(exchangeRate) || 0
  const convertedAmount = isForeign && rate > 0 && amount ? parseFloat(amount) * rate : null

  async function handleFetchRate() {
    if (!isForeign) return
    setFetchingRate(true)
    try {
      const r = await fetchSingleRate(currency)
      if (r) {
        setExchangeRate(String(r))
        toast.show({ message: `Live rate: 1 ${currency} = ${r.toFixed(6)} ${defaultCurrency}` })
      }
    } catch (e) {
      toast.show({ message: `Could not fetch rate: ${e.message}`, type: 'error' })
    } finally {
      setFetchingRate(false)
    }
  }

  function validate() {
    const errs = {}
    if (!amount || isNaN(amount) || Number(amount) <= 0) errs.amount = 'Enter a valid amount'
    if (!date) errs.date = 'Date is required'
    if (isForeign && (!exchangeRate || isNaN(exchangeRate) || Number(exchangeRate) <= 0)) {
      errs.exchangeRate = 'Enter the exchange rate'
    }
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
        subCategoryId: subCategoryId || null,
        accountId: accountId || null,
        subAccountId: subAccountId || null,
        note: note.trim(),
        currency: currency || defaultCurrency,
        exchangeRate: isForeign ? Number(exchangeRate) : 1,
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

      {/* Amount + Currency row */}
      <div className="flex gap-2 items-end">
        <div className="flex-1">
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
        </div>
        <div className="pb-0.5">
          <Select
            label="Currency"
            value={currency}
            onChange={e => setCurrency(e.target.value)}
          >
            {SUPPORTED_CURRENCIES.map(c => (
              <option key={c.code} value={c.code}>{c.symbol} {c.code}</option>
            ))}
          </Select>
        </div>
      </div>

      {/* Exchange rate (only when foreign currency) */}
      {isForeign && (
        <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-3 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-800 dark:text-amber-400">
              Exchange rate: 1 {currency} = ? {defaultCurrency}
            </span>
            <button
              type="button"
              onClick={handleFetchRate}
              disabled={fetchingRate}
              className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold hover:underline disabled:opacity-50"
            >
              {fetchingRate ? 'Fetching…' : '↻ Suggest live rate'}
            </button>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="number"
              step="any"
              min="0"
              placeholder="e.g. 1.55"
              value={exchangeRate}
              onChange={e => setExchangeRate(e.target.value)}
              className={`flex-1 px-3 py-2 text-sm rounded-lg border bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                errors.exchangeRate ? 'border-red-400' : 'border-gray-200 dark:border-gray-700'
              }`}
            />
            <span className="text-sm text-gray-500 dark:text-gray-400">{defaultCurrency}</span>
          </div>
          {errors.exchangeRate && <p className="text-xs text-red-500">{errors.exchangeRate}</p>}
          {convertedAmount !== null && (
            <p className="text-xs text-amber-700 dark:text-amber-400">
              ≈ {formatCurrency(convertedAmount, defaultCurrency)} {defaultCurrency}
            </p>
          )}
        </div>
      )}

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

      {/* Sub-category */}
      {categoryId && (
        <Select
          label="Sub-category"
          value={subCategoryId}
          onChange={e => setSubCategoryId(e.target.value)}
        >
          <option value="">General</option>
          {availableSubCategories.map(c => (
            <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
          ))}
        </Select>
      )}

      {/* Account */}
      <Select
        label="Account"
        value={accountId}
        onChange={e => setAccountId(e.target.value)}
      >
        <option value="">— No account —</option>
        {topLevelAccounts.map(a => (
          <option key={a.id} value={a.id}>{a.icon} {a.name}</option>
        ))}
      </Select>

      {/* Sub-account */}
      {accountId && availableSubAccounts.length > 0 && (
        <Select
          label="Sub-account"
          value={subAccountId}
          onChange={e => setSubAccountId(e.target.value)}
        >
          <option value="">General</option>
          {availableSubAccounts.map(a => (
            <option key={a.id} value={a.id}>{a.icon} {a.name}</option>
          ))}
        </Select>
      )}

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
