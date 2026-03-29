import { useState } from 'react'
import { useApp } from '../../context/AppContext.jsx'
import { useToast } from '../ui/Toast.jsx'
import { Button } from '../ui/Button.jsx'
import { Input, Select } from '../ui/Input.jsx'
import { Modal } from '../ui/Modal.jsx'

const COLORS = ['#EF4444','#F97316','#F59E0B','#84CC16','#22C55E','#14B8A6','#3B82F6','#6366F1','#A855F7','#EC4899','#6B7280']

function CategoryForm({ category, onClose }) {
  const { addCategory, editCategory } = useApp()
  const toast = useToast()
  const isEdit = !!category

  const [name, setName] = useState(category?.name || '')
  const [icon, setIcon] = useState(category?.icon || '📦')
  const [color, setColor] = useState(category?.color || '#6366F1')
  const [type, setType] = useState(category?.type || 'expense')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!name.trim()) return
    setLoading(true)
    try {
      if (isEdit) {
        await editCategory(category.id, { name: name.trim(), icon, color, type })
        toast.show({ message: 'Category updated' })
      } else {
        await addCategory({ name: name.trim(), icon, color, type })
        toast.show({ message: 'Category added' })
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
      <Input label="Name" value={name} onChange={e => setName(e.target.value)} placeholder="Category name" required />

      <div className="flex gap-3">
        <Input label="Icon (emoji)" value={icon} onChange={e => setIcon(e.target.value)} className="text-xl text-center w-20" maxLength={2} />
        <Select label="Type" value={type} onChange={e => setType(e.target.value)} className="flex-1">
          <option value="expense">Expense</option>
          <option value="income">Income</option>
          <option value="both">Both</option>
        </Select>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Color</label>
        <div className="flex flex-wrap gap-2">
          {COLORS.map(c => (
            <button
              key={c}
              type="button"
              onClick={() => setColor(c)}
              className={`w-7 h-7 rounded-full transition-transform ${color === c ? 'scale-125 ring-2 ring-offset-2 ring-gray-400 dark:ring-offset-gray-900' : 'hover:scale-110'}`}
              style={{ backgroundColor: c }}
            />
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

export function CategoryManager() {
  const { categories, removeCategory, reorderCategories } = useApp()
  const toast = useToast()
  const [formOpen, setFormOpen] = useState(false)
  const [editTarget, setEditTarget] = useState(null)
  const [reordering, setReordering] = useState(false)

  async function handleDelete(cat) {
    if (!confirm(`Delete "${cat.name}"?`)) return
    try {
      await removeCategory(cat.id)
      toast.show({ message: 'Category deleted' })
    } catch (err) {
      toast.show({ message: err.message, type: 'error' })
    }
  }

  async function move(index, direction) {
    const next = [...categories]
    const target = index + direction
    if (target < 0 || target >= next.length) return
    ;[next[index], next[target]] = [next[target], next[index]]
    setReordering(true)
    try {
      await reorderCategories(next.map(c => c.id))
    } catch (err) {
      toast.show({ message: err.message, type: 'error' })
    } finally {
      setReordering(false)
    }
  }

  const byType = { expense: [], income: [], both: [] }
  categories.forEach((c, i) => {
    if (byType[c.type]) byType[c.type].push({ ...c, _index: i })
  })

  return (
    <div>
      {[['expense', 'Expenses'], ['income', 'Income'], ['both', 'Both']].map(([t, label]) =>
        byType[t].length > 0 && (
          <div key={t} className="mb-4">
            <div className="px-4 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide bg-gray-50 dark:bg-gray-900/50">
              {label}
            </div>
            {byType[t].map((cat, i) => (
              <div key={cat.id} className="flex items-center gap-2 px-4 py-3 border-b border-gray-100 dark:border-gray-800">
                {/* Reorder buttons */}
                <div className="flex flex-col gap-0.5">
                  <button
                    disabled={reordering || cat._index === 0}
                    onClick={() => move(cat._index, -1)}
                    className="text-gray-300 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-20 transition leading-none text-xs"
                  >▲</button>
                  <button
                    disabled={reordering || cat._index === categories.length - 1}
                    onClick={() => move(cat._index, 1)}
                    className="text-gray-300 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-20 transition leading-none text-xs"
                  >▼</button>
                </div>

                <div className="w-9 h-9 rounded-full flex items-center justify-center text-lg flex-shrink-0"
                  style={{ backgroundColor: cat.color + '20' }}>
                  {cat.icon}
                </div>
                <span className="flex-1 text-sm font-medium text-gray-900 dark:text-gray-100">{cat.name}</span>
                <button className="p-1.5 text-gray-400 hover:text-indigo-600 transition" onClick={() => { setEditTarget(cat); setFormOpen(true) }}>✏️</button>
                {!cat.isDefault && (
                  <button className="p-1.5 text-gray-400 hover:text-red-500 transition" onClick={() => handleDelete(cat)}>🗑</button>
                )}
              </div>
            ))}
          </div>
        )
      )}

      <div className="p-4">
        <Button variant="secondary" className="w-full" onClick={() => { setEditTarget(null); setFormOpen(true) }}>
          + Add Category
        </Button>
      </div>

      <Modal open={formOpen} onClose={() => setFormOpen(false)} title={editTarget ? 'Edit Category' : 'New Category'}>
        <CategoryForm category={editTarget} onClose={() => setFormOpen(false)} />
      </Modal>
    </div>
  )
}
