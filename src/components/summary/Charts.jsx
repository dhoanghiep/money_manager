import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts'
import { formatCurrency } from '../../utils/currencyFormatter.js'

// ── Custom external pie label ──────────────────────────────────
const RADIAN = Math.PI / 180

function PieLabel({ cx, cy, midAngle, outerRadius, name, percent, fill }) {
  if (percent < 0.03) return null // hide tiny slices
  const radius = outerRadius + 28
  const x = cx + radius * Math.cos(-midAngle * RADIAN)
  const y = cy + radius * Math.sin(-midAngle * RADIAN)
  const anchor = x > cx ? 'start' : 'end'

  // Label line end point
  const lineR = outerRadius + 6
  const lx = cx + lineR * Math.cos(-midAngle * RADIAN)
  const ly = cy + lineR * Math.sin(-midAngle * RADIAN)
  const lx2 = cx + (outerRadius + 20) * Math.cos(-midAngle * RADIAN)
  const ly2 = cy + (outerRadius + 20) * Math.sin(-midAngle * RADIAN)

  return (
    <g>
      <line x1={lx} y1={ly} x2={lx2} y2={ly2} stroke={fill} strokeWidth={1} />
      <text x={x} y={y - 6} textAnchor={anchor} fill={fill} fontSize={10} fontWeight={600}>
        {name.length > 12 ? name.slice(0, 11) + '…' : name}
      </text>
      <text x={x} y={y + 6} textAnchor={anchor} fill={fill} fontSize={10} opacity={0.8}>
        {(percent * 100).toFixed(1)}%
      </text>
    </g>
  )
}

// ── Stat Pie Chart ─────────────────────────────────────────────

export function StatPieChart({ data }) {
  if (!data || data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-52 text-gray-400 dark:text-gray-500 gap-2">
        <span className="text-3xl">📊</span>
        <span className="text-sm">No data for this period</span>
      </div>
    )
  }

  const total = data.reduce((s, d) => s + d.total, 0)

  return (
    <ResponsiveContainer width="100%" height={240}>
      <PieChart>
        <Pie
          data={data}
          dataKey="total"
          nameKey="name"
          cx="50%"
          cy="50%"
          innerRadius={48}
          outerRadius={80}
          paddingAngle={1.5}
          labelLine={false}
          label={<PieLabel />}
        >
          {data.map((entry, i) => (
            <Cell key={i} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip
          formatter={(v) => [formatCurrency(v), '']}
          contentStyle={{
            fontSize: 12, borderRadius: 10, border: 'none',
            boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
          }}
        />
      </PieChart>
    </ResponsiveContainer>
  )
}

// ── Trend Bar Chart (stub — not used in new dashboard) ─────────
export function TrendBarChart() { return null }

// Export old name for backward compat (not used in new dashboard)
export function CategoryPieChart() { return null }
