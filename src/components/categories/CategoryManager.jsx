import { useState } from 'react'
import { useApp } from '../../context/AppContext.jsx'
import { api } from '../../api/client.js'
import { useToast } from '../ui/Toast.jsx'
import { Button } from '../ui/Button.jsx'
import { Input, Select } from '../ui/Input.jsx'
import { Modal } from '../ui/Modal.jsx'

const DEFAULT_CAT_KEY = 'mm_default_category_id'
export function getDefaultCategoryId() { return localStorage.getItem(DEFAULT_CAT_KEY) || '' }
export function setDefaultCategoryId(id) { localStorage.setItem(DEFAULT_CAT_KEY, id) }

const DEFAULT_SUBCAT_KEY = 'mm_default_subcategory_'
export function getDefaultSubCategoryId(parentId) { return localStorage.getItem(DEFAULT_SUBCAT_KEY + parentId) || '' }
export function setDefaultSubCategoryId(parentId, id) { localStorage.setItem(DEFAULT_SUBCAT_KEY + parentId, id) }

const COLORS = ['#EF4444','#F97316','#F59E0B','#84CC16','#22C55E','#14B8A6','#3B82F6','#6366F1','#A855F7','#EC4899','#6B7280']

// ── Category Form (used for both parent and sub-category) ─────

function CategoryForm({ category, parentId, onClose }) {
  const { addCategory, editCategory } = useApp()
  const toast = useToast()
  const isEdit = !!category
  const isSub = !!(parentId || category?.parentId)

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
        await addCategory({ name: name.trim(), icon, color, type, parentId: parentId || '' })
        toast.show({ message: isSub ? 'Sub-category added' : 'Category added' })
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
        {/* Sub-categories inherit type from parent — only show type picker for top-level */}
        {!isSub && (
          <Select label="Type" value={type} onChange={e => setType(e.target.value)} className="flex-1">
            <option value="expense">Expense</option>
            <option value="income">Income</option>
            <option value="both">Both</option>
          </Select>
        )}
      </div>

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

// ── Category Manager ──────────────────────────────────────────

export function CategoryManager() {
  const { categories, topLevelCategories, subCategoriesOf, removeCategory, reorderCategories } = useApp()
  const toast = useToast()
  const [formOpen, setFormOpen] = useState(false)
  const [editTarget, setEditTarget] = useState(null)
  const [addSubParentId, setAddSubParentId] = useState(null) // parentId when adding sub-category
  const [reordering, setReordering] = useState(false)
  const [expandedIds, setExpandedIds] = useState(new Set())
  const [defaultId, setDefaultId] = useState(getDefaultCategoryId)
  const [defaultSubIds, setDefaultSubIds] = useState({})

  function handleSetDefault(id) {
    setDefaultCategoryId(id)
    setDefaultId(id)
    api.setPreference('mm_default_category_id', id).catch(() => {})
    toast.show({ message: 'Default category updated' })
  }

  function handleSetDefaultSub(parentId, subId) {
    setDefaultSubCategoryId(parentId, subId)
    setDefaultSubIds(prev => ({ ...prev, [parentId]: subId }))
    api.setPreference('mm_default_subcategory_' + parentId, subId).catch(() => {})
    toast.show({ message: 'Default sub-category updated' })
  }

  function getDefaultSub(parentId) {
    return defaultSubIds[parentId] ?? getDefaultSubCategoryId(parentId)
  }

  function toggleExpand(id) {
    setExpandedIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  async function handleDelete(cat) {
    const subs = subCategoriesOf(cat.id)
    const msg = subs.length > 0
      ? `Delete "${cat.name}" and its ${subs.length} sub-categor${subs.length === 1 ? 'y' : 'ies'}?`
      : `Delete "${cat.name}"?`
    if (!confirm(msg)) return
    try {
      // Delete sub-categories first
      for (const sub of subs) await removeCategory(sub.id)
      await removeCategory(cat.id)
      toast.show({ message: 'Category deleted' })
    } catch (err) {
      toast.show({ message: err.message, type: 'error' })
    }
  }

  async function move(index, direction) {
    const next = [...topLevelCategories]
    const target = index + direction
    if (target < 0 || target >= next.length) return
    ;[next[index], next[target]] = [next[target], next[index]]

    // Build full ordered id list: for each top-level, include its subs after it
    const allOrdered = next.flatMap(c => [c.id, ...subCategoriesOf(c.id).map(s => s.id)])

    setReordering(true)
    try {
      await reorderCategories(allOrdered)
    } catch (err) {
      toast.show({ message: err.message, type: 'error' })
    } finally {
      setReordering(false)
    }
  }

  const byType = { expense: [], income: [], both: [] }
  topLevelCategories.forEach((c, i) => { if (byType[c.type]) byType[c.type].push({ ...c, _index: i }) })

  function openAddSub(parentId) {
    setEditTarget(null)
    setAddSubParentId(parentId)
    setFormOpen(true)
    setExpandedIds(prev => new Set([...prev, parentId]))
  }

  function openEdit(cat) {
    setEditTarget(cat)
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
      {[['expense', 'Expenses'], ['income', 'Income'], ['both', 'Both']].map(([t, label]) =>
        byType[t].length > 0 && (
          <div key={t} className="mb-4">
            <div className="px-4 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide bg-gray-50 dark:bg-gray-900/50">
              {label}
            </div>

            {byType[t].map((cat) => {
              const subs = subCategoriesOf(cat.id)
              const expanded = expandedIds.has(cat.id)

              return (
                <div key={cat.id}>
                  {/* Parent category row */}
                  <div
                    className="flex items-center gap-2 px-4 py-3 border-b border-gray-100 dark:border-gray-800 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition"
                    onClick={() => subs.length > 0 ? toggleExpand(cat.id) : null}
                  >
                    {/* Reorder */}
                    <div className="flex flex-col gap-0.5">
                      <button disabled={reordering || cat._index === 0}
                        onClick={e => { e.stopPropagation(); move(cat._index, -1) }}
                        className="text-gray-300 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-20 transition leading-none text-xs">▲</button>
                      <button disabled={reordering || cat._index === topLevelCategories.length - 1}
                        onClick={e => { e.stopPropagation(); move(cat._index, 1) }}
                        className="text-gray-300 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-20 transition leading-none text-xs">▼</button>
                    </div>

                    <div className="w-9 h-9 rounded-full flex items-center justify-center text-lg flex-shrink-0"
                      style={{ backgroundColor: cat.color + '20' }}>
                      {cat.icon}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{cat.name}</span>
                        {defaultId === cat.id && (
                          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-400 leading-none">default</span>
                        )}
                      </div>
                      {subs.length > 0 && (
                        <span className="text-xs text-gray-400 dark:text-gray-500">
                          {subs.length} sub-{subs.length === 1 ? 'category' : 'categories'}
                        </span>
                      )}
                    </div>

                    {/* Expand indicator */}
                    {subs.length > 0 && (
                      <span className="text-xs text-gray-400 dark:text-gray-500 select-none">
                        {expanded ? '▾' : '▸'}
                      </span>
                    )}

                    {/* Default star */}
                    <button
                      onClick={e => { e.stopPropagation(); handleSetDefault(cat.id) }}
                      title={defaultId === cat.id ? 'Default category' : 'Set as default'}
                      className={`p-1.5 transition text-base leading-none ${defaultId === cat.id ? 'text-yellow-400' : 'text-gray-200 dark:text-gray-700 hover:text-yellow-400'}`}
                    >★</button>

                    <button onClick={e => { e.stopPropagation(); openAddSub(cat.id) }}
                      className="p-1.5 text-gray-400 hover:text-indigo-500 transition text-sm" title="Add sub-category">⊕</button>
                    <button onClick={e => { e.stopPropagation(); openEdit(cat) }}
                      className="p-1.5 text-gray-400 hover:text-indigo-600 transition">✏️</button>
                    {!cat.isDefault && (
                      <button onClick={e => { e.stopPropagation(); handleDelete(cat) }}
                        className="p-1.5 text-gray-400 hover:text-red-500 transition">🗑</button>
                    )}
                  </div>

                  {/* Sub-categories (expanded) */}
                  {(expanded || subs.length === 0) && subs.map(sub => {
                    const isDefaultSub = getDefaultSub(cat.id) === sub.id
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
                            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-400 leading-none">default</span>
                          )}
                        </div>
                        <button
                          onClick={() => handleSetDefaultSub(cat.id, sub.id)}
                          title={isDefaultSub ? 'Default sub-category' : 'Set as default sub-category'}
                          className={`p-1 transition text-sm leading-none ${isDefaultSub ? 'text-yellow-400' : 'text-gray-200 dark:text-gray-700 hover:text-yellow-400'}`}
                        >★</button>
                        <button onClick={() => openEdit(sub)}
                          className="p-1 text-gray-400 hover:text-indigo-600 transition text-sm">✏️</button>
                        <button onClick={() => handleDelete(sub)}
                          className="p-1 text-gray-400 hover:text-red-500 transition text-sm">🗑</button>
                      </div>
                    )
                  })}

                  {/* "General" placeholder row when expanded and has subs */}
                  {expanded && subs.length > 0 && (
                    <div className="flex items-center gap-2 pl-10 pr-4 py-2 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/20">
                      <div className="w-1 h-4 rounded-full bg-gray-200 dark:bg-gray-700 flex-shrink-0" />
                      <div className="w-7 h-7 rounded-full flex items-center justify-center text-sm flex-shrink-0 bg-gray-100 dark:bg-gray-800">
                        📦
                      </div>
                      <span className="flex-1 text-sm text-gray-400 dark:text-gray-500 italic">General (default)</span>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )
      )}

      <div className="p-4">
        <Button variant="secondary" className="w-full" onClick={openAddTop}>
          + Add Category
        </Button>
      </div>

      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editTarget ? 'Edit Category' : addSubParentId ? `Add Sub-category` : 'New Category'}
      >
        <CategoryForm
          category={editTarget}
          parentId={addSubParentId}
          onClose={() => setFormOpen(false)}
        />
      </Modal>
    </div>
  )
}
