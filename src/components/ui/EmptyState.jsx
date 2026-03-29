export function EmptyState({ icon = '📭', title = 'Nothing here yet', description = '', action }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
      <span className="text-5xl">{icon}</span>
      <p className="font-semibold text-gray-700 dark:text-gray-300">{title}</p>
      {description && <p className="text-sm text-gray-500 dark:text-gray-500 max-w-xs">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  )
}
