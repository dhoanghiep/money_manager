import { useState } from 'react'
import { useApp } from '../../context/AppContext.jsx'
import { useToast } from '../ui/Toast.jsx'
import { Modal } from '../ui/Modal.jsx'
import { TransactionForm } from './TransactionForm.jsx'
import { formatCurrency } from '../../utils/currencyFormatter.js'
import { formatDisplay } from '../../utils/dateHelpers.js'

export function TransactionItem({ transaction, showDate = false }) {
  const { categories, accounts, removeTransaction } = useApp()
  const toast = useToast()
  const [editOpen, setEditOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const category = categories.find(c => c.id === transaction.categoryId)
  const account = accounts.find(a => a.id === transaction.accountId)
  const isIncome = transaction.type === 'income'

  async function handleDelete() {
    setDeleting(true)
    try {
      await removeTransaction(transaction.id)
      toast.show({ message: 'Transaction deleted' })
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
        onClick={() => setEditOpen(true)}
      >
        {/* Category icon */}
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center text-lg flex-shrink-0"
          style={{ backgroundColor: category ? category.color + '20' : '#6B728020' }}
        >
          {category ? category.icon : '📦'}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span className="font-medium text-sm text-gray-900 dark:text-gray-100 truncate">
              {category ? category.name : 'Uncategorized'}
            </span>
            <span className={`font-semibold text-sm flex-shrink-0 ${isIncome ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400'}`}>
              {isIncome ? '+' : '-'}{formatCurrency(transaction.amount)}
            </span>
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            {account && (
              <span className="text-xs text-gray-400 dark:text-gray-500">
                {account.icon} {account.name}
              </span>
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
