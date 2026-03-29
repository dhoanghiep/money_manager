import { useState } from 'react'
import { useApp } from '../../context/AppContext.jsx'
import { useCurrency } from '../../context/CurrencyContext.jsx'
import { useToast } from '../ui/Toast.jsx'
import { Modal } from '../ui/Modal.jsx'
import { TransactionForm } from './TransactionForm.jsx'
import { formatCurrency } from '../../utils/currencyFormatter.js'
import { formatDisplay } from '../../utils/dateHelpers.js'

export function TransactionItem({ transaction, showDate = false }) {
  const { categories, accounts, removeTransaction, removeTransfer } = useApp()
  const { defaultCurrency } = useCurrency()
  const toast = useToast()
  const [editOpen, setEditOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const isTransfer = transaction.type === 'transfer'
  const category = categories.find(c => c.id === transaction.categoryId)
  const subCategory = categories.find(c => c.id === transaction.subCategoryId)
  const account = accounts.find(a => a.id === transaction.accountId)
  const subAccount = accounts.find(a => a.id === transaction.subAccountId)
  // Transfer direction: is money leaving this account?
  const transferOut = isTransfer && transaction.accountId === transaction.fromAccountId
  const counterpartId = isTransfer ? (transferOut ? transaction.toAccountId : transaction.fromAccountId) : null
  const counterpart = accounts.find(a => a.id === counterpartId)
  const isIncome = transaction.type === 'income'

  const txCurrency = transaction.currency || defaultCurrency
  const isForeign = txCurrency !== defaultCurrency
  const exchangeRate = Number(transaction.exchangeRate) || 1
  const convertedAmount = Number(transaction.amount) * exchangeRate

  async function handleDelete() {
    setDeleting(true)
    try {
      if (isTransfer && transaction.transferId) {
        await removeTransfer(transaction.transferId)
        toast.show({ message: 'Transfer deleted' })
      } else {
        await removeTransaction(transaction.id)
        toast.show({ message: 'Transaction deleted' })
      }
    } catch (err) {
      toast.show({ message: err.message, type: 'error' })
    } finally {
      setDeleting(false)
      setConfirmDelete(false)
    }
  }

  return (
    <>
      <div
        className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 active:bg-gray-100 dark:active:bg-gray-800 transition cursor-pointer"
        onClick={() => !isTransfer && setEditOpen(true)}
      >
        {/* Icon */}
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center text-lg flex-shrink-0"
          style={{ backgroundColor: isTransfer ? '#6366F120' : (category ? category.color + '20' : '#6B728020') }}
        >
          {isTransfer ? '⇄' : (category ? category.icon : '📦')}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span className="font-medium text-sm text-gray-900 dark:text-gray-100 truncate">
              {isTransfer ? (
                <>
                  <span className="text-gray-400 dark:text-gray-500 font-normal text-xs">
                    {transferOut ? 'To' : 'From'}
                  </span>
                  {' '}{counterpart ? `${counterpart.icon} ${counterpart.name}` : 'Unknown'}
                </>
              ) : (
                <>
                  {category ? category.name : 'Uncategorized'}
                  {category && (
                    <span className="text-gray-400 dark:text-gray-500 font-normal">
                      {' › '}{subCategory ? subCategory.name : 'General'}
                    </span>
                  )}
                </>
              )}
            </span>
            <div className="flex flex-col items-end flex-shrink-0">
              <span className={`font-semibold text-sm ${
                isTransfer
                  ? transferOut
                    ? 'text-red-500 dark:text-red-400'
                    : 'text-green-600 dark:text-green-400'
                  : isIncome
                    ? 'text-green-600 dark:text-green-400'
                    : 'text-red-500 dark:text-red-400'
              }`}>
                {isTransfer ? (transferOut ? '-' : '+') : (isIncome ? '+' : '-')}
                {isForeign
                  ? formatCurrency(transaction.amount, txCurrency)
                  : formatCurrency(transaction.amount, defaultCurrency)
                }
              </span>
              {isForeign && (
                <span className="text-xs text-gray-400 dark:text-gray-500">
                  ≈ {formatCurrency(convertedAmount, defaultCurrency)}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            {isTransfer ? (
              <span className="text-xs text-gray-400 dark:text-gray-500">
                {account?.icon} {account?.name} {transferOut ? '→' : '←'} {counterpart?.icon} {counterpart?.name}
              </span>
            ) : (
              account && (
                <span className="text-xs text-gray-400 dark:text-gray-500">
                  {account.icon} {account.name}
                  {subAccount && (
                    <span className="text-gray-300 dark:text-gray-600">{' › '}{subAccount.name}</span>
                  )}
                </span>
              )
            )}
            {transaction.note && (
              <span className="text-xs text-gray-400 dark:text-gray-500 truncate">
                {account ? '· ' : ''}{transaction.note}
              </span>
            )}
            {showDate && (
              <span className="text-xs text-gray-400 dark:text-gray-500 ml-auto">
                {formatDisplay(transaction.date, 'MMM d')}
              </span>
            )}
          </div>
        </div>

        {/* Delete button */}
        <button
          className="p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition flex-shrink-0"
          onClick={e => { e.stopPropagation(); setConfirmDelete(true) }}
          title="Delete"
        >
          🗑
        </button>
      </div>

      {/* Edit modal */}
      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Edit Transaction">
        <TransactionForm transaction={transaction} onClose={() => setEditOpen(false)} />
      </Modal>

      {/* Confirm delete */}
      <Modal open={confirmDelete} onClose={() => setConfirmDelete(false)} title="Delete Transaction?" size="sm">
        <div className="p-5 flex flex-col gap-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            This will permanently delete this transaction.
          </p>
          <div className="flex gap-3">
            <button
              className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
              onClick={() => setConfirmDelete(false)}
            >
              Cancel
            </button>
            <button
              className="flex-1 px-4 py-2.5 rounded-xl bg-red-500 text-white text-sm font-medium hover:bg-red-600 transition disabled:opacity-50"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? 'Deleting…' : 'Delete'}
            </button>
          </div>
        </div>
      </Modal>
    </>
  )
}
