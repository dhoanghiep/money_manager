export function CategoryBadge({ category, size = 'md' }) {
  if (!category) return null

  const sizes = {
    sm: 'text-xs px-2 py-0.5 gap-1',
    md: 'text-sm px-2.5 py-1 gap-1.5',
  }

  return (
    <span
      className={`inline-flex items-center rounded-full font-medium ${sizes[size]}`}
      style={{ backgroundColor: category.color + '20', color: category.color }}
    >
      <span>{category.icon}</span>
      <span>{category.name}</span>
    </span>
  )
}
