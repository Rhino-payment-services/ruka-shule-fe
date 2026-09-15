'use client';

import { Cell, Pie, PieChart, ResponsiveContainer } from 'recharts';

export type GenderInsights = {
  male: number;
  female: number;
  unspecified?: number;
  total: number;
};

const COLORS = {
  male: '#E8A317',
  female: '#08163d',
};

export function GenderDonutChart({
  title = 'Students',
  data,
  emptyLabel = 'No student gender data yet',
}: {
  title?: string;
  data: GenderInsights | null;
  emptyLabel?: string;
}) {
  const male = data?.male ?? 0;
  const female = data?.female ?? 0;
  const total = male + female;
  const chartData = [
    { name: 'Male', value: male, color: COLORS.male },
    { name: 'Female', value: female, color: COLORS.female },
  ].filter((d) => d.value > 0);

  const malePct = total > 0 ? Math.round((male / total) * 100) : 0;
  const femalePct = total > 0 ? 100 - malePct : 0;

  return (
    <div className="flex h-full flex-col rounded-2xl bg-white p-4 shadow-[0_4px_14px_rgba(8,22,61,0.04)] ring-1 ring-black/3">
      <h3 className="text-sm font-semibold text-[#08163d]">{title}</h3>
      <p className="text-[10px] text-slate-400">Gender distribution</p>

      {total === 0 ? (
        <div className="flex flex-1 items-center justify-center py-12 text-xs text-slate-400">{emptyLabel}</div>
      ) : (
        <>
          <div className="relative mx-auto mt-1 h-[160px] w-full max-w-[180px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={48}
                  outerRadius={68}
                  startAngle={210}
                  endAngle={-30}
                  paddingAngle={2}
                  strokeWidth={0}
                >
                  {chartData.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center pt-1">
              <span className="text-xl font-semibold text-[#08163d]">{total}</span>
              <span className="text-[10px] text-slate-400">students</span>
            </div>
          </div>

          <div className="mt-auto flex items-center justify-center gap-4 pt-1 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-[#E8A317]" />
              <span className="text-slate-500">Male</span>
              <span className="font-semibold text-[#08163d]">{malePct}%</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-[#08163d]" />
              <span className="text-slate-500">Female</span>
              <span className="font-semibold text-[#08163d]">{femalePct}%</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
