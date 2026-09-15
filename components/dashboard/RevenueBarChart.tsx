'use client';

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

export type RevenueMonthPoint = {
  label: string;
  collected: number;
  processing_fee: number;
};

function formatAxis(value: number) {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${Math.round(value / 1_000)}k`;
  return `${value}`;
}

export function RevenueBarChart({
  title = 'Collections',
  year,
  data,
  primaryLabel = 'Collected',
  secondaryLabel = 'Processing fee',
  emptyLabel = 'No payment data for this year',
}: {
  title?: string;
  year?: number;
  data: RevenueMonthPoint[];
  primaryLabel?: string;
  secondaryLabel?: string;
  emptyLabel?: string;
}) {
  const hasData = data.some((d) => d.collected > 0 || d.processing_fee > 0);

  return (
    <div className="rounded-2xl bg-white p-4 shadow-[0_4px_14px_rgba(8,22,61,0.04)] ring-1 ring-black/3">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-[#08163d]">{title}</h3>
          {year ? <p className="text-[10px] text-slate-400">{year}</p> : null}
        </div>
        <div className="flex items-center gap-3 text-[10px] text-slate-500">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-[#E8A317]" />
            {primaryLabel}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-[#08163d]" />
            {secondaryLabel}
          </span>
        </div>
      </div>

      {!hasData ? (
        <div className="flex h-[200px] items-center justify-center text-xs text-slate-400">{emptyLabel}</div>
      ) : (
        <div className="h-[200px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} barGap={3} barCategoryGap="22%">
              <CartesianGrid vertical={false} stroke="#EEF0F4" />
              <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: '#94a3b8', fontSize: 10 }} />
              <YAxis
                tickLine={false}
                axisLine={false}
                tick={{ fill: '#94a3b8', fontSize: 10 }}
                tickFormatter={formatAxis}
                width={36}
              />
              <Tooltip
                cursor={{ fill: 'rgba(8,22,61,0.04)' }}
                formatter={(value: number, name: string) => [
                  `UGX ${Number(value || 0).toLocaleString()}`,
                  name === 'collected' ? primaryLabel : secondaryLabel,
                ]}
                contentStyle={{
                  borderRadius: 10,
                  border: '1px solid rgba(8,22,61,0.08)',
                  boxShadow: '0 6px 16px rgba(8,22,61,0.08)',
                  fontSize: 12,
                }}
              />
              <Legend content={() => null} />
              <Bar dataKey="collected" fill="#E8A317" radius={[6, 6, 0, 0]} maxBarSize={14} />
              <Bar dataKey="processing_fee" fill="#08163d" radius={[6, 6, 0, 0]} maxBarSize={14} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
