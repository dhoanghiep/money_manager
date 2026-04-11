import { useState } from 'react'
import { useApp } from '../../context/AppContext.jsx'
import { useCurrency } from '../../context/CurrencyContext.jsx'
import { useToast } from '../ui/Toast.jsx'
import { Modal } from '../ui/Modal.jsx'
import { TransactionForm } from './TransactionForm.jsx'
import { formatCurrency } from '../../utils/currencyFormatter.js'
import { formatDisplay } from '../../utils/dateHelpers.js'

export function TransactionItem({ transaction, showDate = false, transferNeutral = false, neutralIntraAccount = false }) {
  const { categories, accounts, transactions, removeTransaction, removeTransfer } = useApp()

  // Build a merged "transfer edit object" combining both legs, for the edit form.
  // We look up the other leg so we can pre-fill both sub-accounts.
  function buildTransferEditObj() {
    const outLegRef = transferOut ? transaction : otherLeg
    const inLegRef  = transferOut ? otherLeg : transaction
    return {
      id:               transaction.id,
      type:             'transfer',
      transferId:       transaction.transferId,
      accountId:        fromAccountId  || '',
      toAccountId:      toAccountId    || '',
      fromSubAccountId: outLegRef?.subAccountId || '',
      toSubAccountId:   inLegRef?.subAccountId  || '',
      amount:           transaction.amount,
      date:             transaction.date,
      note:             transaction.note,
      currency:         transaction.currency,
      exchangeRate:     transaction.exchangeRate,
    }
  }
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

  // When fromAccountId/toAccountId are missing (old rows before migration),
  // look up the other leg of the transfer to resolve the counterpart.
  const otherLeg = isTransfer && transaction.transferId
    ? transactions.find(t => t.transferId === transaction.transferId && t.id !== transaction.id)
    : null
  const fromAccountId = transaction.fromAccountId || (otherLeg ? otherLeg.accountId : null)
  const toAccountId   = transaction.toAccountId   || (otherLeg ? transaction.accountId : null)

  // transferLeg ('out'/'in') is the canonical direction — fall back to accountId comparison
  const transferOut = isTransfer && (
    transaction.transferLeg === 'out' ||
    (transaction.transferLeg == null && !!fromAccountId && transaction.accountId === fromAccountId)
  )
  const isIntraAccount = isTransfer && fromAccountId && fromAccountId === toAccountId
  const counterpartId = isTransfer ? (transferOut ? toAccountId : fromAccountId) : null
  const counterpart = accounts.find(a => a.id === counterpartId)
  const directionLabel = isTransfer ? (fromAccountId ? (transferOut ? 'To' : 'From') : '⇄') : null
  const fromAccount = accounts.find(a => a.id === fromAccountId)
  const toAccount   = accounts.find(a => a.id === toAccountId)
  // For intra-account: outLeg has this record's subAccountId, otherLeg has the counterpart's
  const outLeg = isIntraAccount ? (transferOut ? transaction : otherLeg) : null
  const inLeg  = isIntraAccount ? (transferOut ? otherLeg : transaction) : null
  const fromSubAcc = outLeg ? accounts.find(a => a.id === outLeg.subAccountId) : null
  const toSubAcc   = inLeg  ? accounts.find(a => a.id === inLeg.subAccountId)  : null
  const isIncome = transaction.type === 'income'
  // Render transfer as neutral (no color, no sign) when:
  // - explicitly requested via transferNeutral, OR
  // - it's an intra-account transfer shown in the "All sub-accounts" view
  const renderAsNeutral = (isTransfer && transferNeutral) || (isIntraAccount && neutralIntraAccount)

  // Hide delete for transactions older than 2 days
  const canDelete = (() => {
    const txDate = new Date(transaction.date)
    const now = new Date()
    return (now - txDate) / (1000 * 60 * 60 * 24) <= 2
  })()

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
        onClick={() => setEditOpen(true)}
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
                renderAsNeutral ? (
                  // Neutral display: "A → B" (no direction bias)
                  isIntraAccount ? (
                    <>
                      {fromSubAcc ? `${fromSubAcc.icon} ${fromSubAcc.name}` : 'General'}
                      <span className="text-gray-400 dark:text-gray-500 font-normal"> → </span>
                      {toSubAcc ? `${toSubAcc.icon} ${toSubAcc.name}` : 'General'}
                    </>
                  ) : (
                    <>
                      {fromAccount ? `${fromAccount.icon} ${fromAccount.name}` : '?'}
                      <span className="text-gray-400 dark:text-gray-500 font-normal"> → </span>
                      {toAccount ? `${toAccount.icon} ${toAccount.name}` : '?'}
                    </>
                  )
                ) : isIntraAccount ? (
                  // Directional intra-account: "To SubB" or "From SubA"
                  <>
                    <span className="text-gray-400 dark:text-gray-500 font-normal text-xs">
                      {transferOut ? 'To' : 'From'}
                    </span>
                    {' '}
                    {transferOut
                      ? (toSubAcc ? `${toSubAcc.icon} ${toSubAcc.name}` : 'General')
                      : (fromSubAcc ? `${fromSubAcc.icon} ${fromSubAcc.name}` : 'General')
                    }
                  </>
                ) : (
                  // Regular transfer: "To Account" or "From Account"
                  <>
                    <span className="text-gray-400 dark:text-gray-500 font-normal text-xs">
                      {directionLabel}
                    </span>
                    {' '}{counterpart ? `${counterpart.icon} ${counterpart.name}` : '?'}
                  </>
                )
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
                renderAsNeutral
                  ? 'text-gray-900 dark:text-gray-100'
                  : isTransfer
                    ? transferOut
                      ? 'text-red-500 dark:text-red-400'
                      : 'text-green-600 dark:text-green-400'
                    : isIncome
                      ? 'text-green-600 dark:text-green-400'
                      : 'text-red-500 dark:text-red-400'
              }`}>
                {!renderAsNeutral && (
                  isTransfer ? (transferOut ? '-' : '+') : (isIncome ? '+' : '-')
                )}
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
            {isTransfer && !renderAsNeutral ? (
              <span className="text-xs text-gray-400 dark:text-gray-500">
                {isIntraAccount
                  ? `${fromAccount?.icon} ${fromAccount?.name} · ${fromSubAcc?.name ?? 'General'} → ${toSubAcc?.name ?? 'General'}`
                  : `${account?.icon} ${account?.name} ${transferOut ? '→' : '←'} ${counterpart?.icon} ${counterpart?.name}`
                }
              </span>
            ) : !isTransfer ? (
              account && (
                <span className="text-xs text-gray-400 dark:text-gray-500">
                  {account.icon} {account.name}
                  {subAccount && (
                    <span className="text-gray-300 dark:text-gray-600">{' › '}{subAccount.name}</span>
                  )}
                </span>
              )
            ) : null}
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

        {/* Delete button — only within 2 days */}
        {canDelete && (
          <button
            className="p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition flex-shrink-0"
            onClick={e => { e.stopPropagation(); setConfirmDelete(true) }}
            title="Delete"
          >
            🗑
          </button>
        )}
      </div>

      {/* Edit modal */}
      <Modal open={editOpen} onClose={() => setEditOpen(false)} title={isTransfer ? 'Edit Transfer' : 'Edit Transaction'} size="fullscreen">
        <TransactionForm
          transaction={isTransfer ? buildTransferEditObj() : transaction}
          onClose={() => setEditOpen(false)}
        />
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
