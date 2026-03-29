import { useState, useRef, useEffect, useMemo } from 'react'

/**
 * NoteInput — textarea with autocomplete suggestions from past notes.
 *
 * Props:
 *   value, onChange  — controlled input
 *   allNotes         — string[] of all previously used note values
 *   label, placeholder
 */
export function NoteInput({ value, onChange, allNotes = [], label = 'Note (optional)', placeholder = 'Add a note…' }) {
  const [open, setOpen] = useState(false)
  const [focused, setFocused] = useState(false)
  const wrapRef = useRef(null)

  // Build unique notes sorted by frequency
  const noteCounts = useMemo(() => {
    const map = {}
    allNotes.forEach(n => {
      const s = (n || '').trim()
      if (s) map[s] = (map[s] || 0) + 1
    })
    return map
  }, [allNotes])

  // Filter by substring match (case-insensitive), sort by frequency desc
  const suggestions = useMemo(() => {
    const q = value.trim().toLowerCase()
    if (!q) return []
    return Object.entries(noteCounts)
      .filter(([note]) => note.toLowerCase().includes(q) && note !== value.trim())
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([note]) => note)
  }, [value, noteCounts])

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClick(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  // Show dropdown when there are suggestions and field is focused
  const showDropdown = open && focused && suggestions.length > 0

  function handleChange(e) {
    onChange(e)
    setOpen(true)
  }

  function handleKeyDown(e) {
    if (e.key === 'Escape') setOpen(false)
  }

  function pick(note) {
    onChange({ target: { value: note } })
    setOpen(false)
  }

  // Highlight matching substring
  function highlight(note) {
    const q = value.trim().toLowerCase()
    if (!q) return note
    const idx = note.toLowerCase().indexOf(q)
    if (idx === -1) return note
    return (
      <>
        {note.slice(0, idx)}
        <span className="font-semibold text-indigo-600 dark:text-indigo-400">{note.slice(idx, idx + q.length)}</span>
        {note.slice(idx + q.length)}
      </>
    )
  }

  return (
    <div className="flex flex-col gap-1 relative" ref={wrapRef}>
      {label && (
        <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
          {label}
        </label>
      )}
      <textarea
        rows={2}
        value={value}
        onChange={handleChange}
        onFocus={() => { setFocused(true); setOpen(true) }}
        onBlur={() => setFocused(false)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2.5 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition resize-none"
      />

      {/* Suggestions dropdown */}
      {showDropdown && (
        <div className="absolute left-0 right-0 top-full mt-1 z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg overflow-hidden">
          {suggestions.map((note, i) => (
            <button
              key={i}
              type="button"
              onMouseDown={e => { e.preventDefault(); pick(note) }}
              className="w-full text-left px-3 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition border-b border-gray-100 dark:border-gray-700/50 last:border-0 truncate"
            >
              {highlight(note)}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
