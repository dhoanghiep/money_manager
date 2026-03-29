import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend,
} from 'recharts'
import { groupByCategory, getDailyTotals } from '../../utils/aggregations.js'
import { formatCurrency } from '../../utils/currencyFormatter.js'

// ── Category Pie Chart ─────────────────────────────────────────

export function CategoryPieChart({ transactions, categories }) {
  const expenseTransactions = transactions.filter(t => t.type === 'expense')
  const data = groupByCategory(expenseTransactions, categories).filter(d => d.total > 0)

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-40 text-sm text-gray-400">
        No expenses to display
      </div>
    )
  }

  return (
    <div>
      <ResponsiveContainer width="100%" height={220}>
        <PieChart>
          <Pie
            data={data}
            dataKey="total"
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius={55}
            outerRadius={85}
            paddingAngle={2}
          >
            {data.map((entry, i) => (
              <Cell key={i} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip
            formatter={(v) => formatCurrency(v)}
            contentStyle={{ fontSize: 12, borderRadius: 8, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
          />
        </PieChart>
      </ResponsiveContainer>

      {/* Legend */}
      <div className="flex flex-wrap gap-2 justify-center">
        {data.slice(0, 6).map((d, i) => (
          <div key={i} className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400">
            <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: d.color }} />
            <span>{d.icon} {d.name}</span>
            <span className="font-medium text-gray-900 dark:text-gray-100">{formatCurrency(d.total)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Income / Expense Bar Chart ──────────────────────────────────

export function TrendBarChart({ transactions, startDate, endDate }) {
  const data = getDailyTotals(transactions, startDate, endDate)

  if (data.length === 0) {
    return <div className="flex items-center justify-center h-40 text-sm text-gray-400">No data</div>
  }

  // For longer ranges, reduce density
  const step = data.length > 14 ? Math.ceil(data.length / 14) : 1
  const reduced = data.filter((_, i) => i % step === 0 || i === data.length - 1)

  return (
    <ResponsiveContainer width="100%" height={180}>
      <BarChart data={reduced} margin={{ top: 0, right: 0, left: -20, bottom: 0 }} barSize={8} barGap={2}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" strokeOpacity={0.5} />
        <XAxis dataKey="label" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
        <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v} />
        <Tooltip
          formatter={(v, name) => [formatCurrency(v), name === 'income' ? 'Income' : 'Expense']}
          contentStyle={{ fontSize: 12, borderRadius: 8, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
        />
        <Bar dataKey="income" fill="#22C55E" radius={[3,3,0,0]} />
        <Bar dataKey="expense" fill="#EF4444" radius={[3,3,0,0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
