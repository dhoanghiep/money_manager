export function Spinner({ size = 'md', className = '' }) {
  const sizes = { sm: 'w-4 h-4', md: 'w-6 h-6', lg: 'w-8 h-8' }
  return (
    <div
      className={`${sizes[size]} animate-spin rounded-full border-2 border-gray-200 dark:border-gray-700 border-t-indigo-600 ${className}`}
    />
  )
}

export function PageSpinner() {
  return (
    <div className="flex items-center justify-center h-48">
      <Spinner size="lg" />
    </div>
  )
}

export function SkeletonCard() {
  return (
    <div className="rounded-2xl bg-gray-100 dark:bg-gray-800 animate-pulse h-24" />
  )
}
