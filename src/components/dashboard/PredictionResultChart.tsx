import React, { useRef } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
  Legend,
} from 'recharts';
import { Button } from '@/components/ui/button';
import { Image } from 'lucide-react';
import { downloadChartAsImage } from '@/lib/downloadUtils';
import { useToast } from '@/hooks/use-toast';
import type {
  DayPredictionResponse,
  WeekPredictionResponse,
  MonthPredictionResponse,
  RangePredictionResponse,
  WeekSummary,
  MonthSummary,
} from '@/lib/apiService';

/* ── colour helper ── */
const getBarColor = (value: number) => {
  if (value >= 15) return '#ef4444'; // red
  if (value >= 10) return '#f97316'; // orange
  if (value >= 5) return '#eab308';  // yellow
  return '#22c55e';                  // green
};

/* ── Day / Week / Month – donut gauge ── */
interface GaugeProps {
  label: string;
  percentage: number;      // 0-100
  color: string;
}

const GaugeChart: React.FC<GaugeProps> = ({ label, percentage, color }) => {
  const gaugeRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const data = [
    { name: 'Absenteeism', value: percentage },
    { name: 'Present', value: 100 - percentage },
  ];
  return (
    <div className="flex flex-col items-center" ref={gaugeRef}>
      <div className="w-full flex justify-end mb-1">
        <Button variant="ghost" size="icon" className="h-7 w-7" title="Download as Image" onClick={async () => {
          if (!gaugeRef.current) return;
          const ok = await downloadChartAsImage(gaugeRef.current, `prediction_gauge.png`);
          toast({ title: ok ? 'Downloaded' : 'Error', description: ok ? 'Chart image saved!' : 'Failed to capture chart' });
        }}>
          <Image className="h-3.5 w-3.5" />
        </Button>
      </div>
      <ResponsiveContainer width="100%" height={250}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={90}
            startAngle={90}
            endAngle={-270}
            dataKey="value"
            paddingAngle={2}
          >
            <Cell fill={color} />
            <Cell fill="#e5e7eb" />
          </Pie>
          <Legend
            verticalAlign="bottom"
            formatter={(value: string) => (
              <span className="text-sm text-gray-600">{value}</span>
            )}
          />
          <Tooltip formatter={(v: number) => `${v.toFixed(2)}%`} />
        </PieChart>
      </ResponsiveContainer>
      <p className="text-sm text-muted-foreground -mt-2">{label}</p>
    </div>
  );
};

/* ── Range – bar chart ── */
interface RangeChartProps {
  data: RangePredictionResponse[];
}

const RangeBarChart: React.FC<RangeChartProps> = ({ data }) => {
  const barRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const chartData = data.map((d) => {
    const pct = parseFloat(d.predicted_absentees_percentage.replace('%', ''));
    return { date: d.date, percentage: pct };
  });

  return (
    <div ref={barRef}>
      <div className="flex justify-end mb-1">
        <Button variant="ghost" size="icon" className="h-7 w-7" title="Download as Image" onClick={async () => {
          if (!barRef.current) return;
          const ok = await downloadChartAsImage(barRef.current, `prediction_range_chart.png`);
          toast({ title: ok ? 'Downloaded' : 'Error', description: ok ? 'Chart image saved!' : 'Failed to capture chart' });
        }}>
          <Image className="h-3.5 w-3.5" />
        </Button>
      </div>
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 20 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
        <XAxis
          dataKey="date"
          fontSize={11}
          angle={-35}
          textAnchor="end"
          tickFormatter={(v: string) => {
            const d = new Date(v);
            return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
          }}
        />
        <YAxis fontSize={12} tickFormatter={(v: number) => `${v}%`} />
        <Tooltip
          contentStyle={{
            backgroundColor: 'hsl(var(--card))',
            border: '1px solid hsl(var(--border))',
            borderRadius: '8px',
          }}
          formatter={(v: number) => [`${v.toFixed(2)}%`, 'Predicted Absenteeism']}
          labelFormatter={(label: string) =>
            new Date(label).toLocaleDateString('en-IN', {
              weekday: 'short',
              day: '2-digit',
              month: 'short',
              year: 'numeric',
            })
          }
        />
        <Bar dataKey="percentage" name="Predicted Absenteeism" radius={[4, 4, 0, 0]}>
          {chartData.map((entry, idx) => (
            <Cell key={idx} fill={getBarColor(entry.percentage)} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
    </div>
  );
};

/* ── Wrapper with download button for inline bar charts ── */
const DownloadableBarChart: React.FC<{ title: string; filename: string; children: React.ReactNode }> = ({ title, filename, children }) => {
  const ref = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  return (
    <div ref={ref}>
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm font-medium text-center flex-1 text-muted-foreground">{title}</p>
        <Button variant="ghost" size="icon" className="h-7 w-7" title="Download as Image" onClick={async () => {
          if (!ref.current) return;
          const ok = await downloadChartAsImage(ref.current, filename);
          toast({ title: ok ? 'Downloaded' : 'Error', description: ok ? 'Chart image saved!' : 'Failed to capture chart' });
        }}>
          <Image className="h-3.5 w-3.5" />
        </Button>
      </div>
      {children}
    </div>
  );
};

/* ── Public wrapper ── */

interface DayChartProps {
  type: 'day';
  data: DayPredictionResponse;
}
interface WeekChartProps {
  type: 'week';
  data: WeekPredictionResponse;
}
interface MonthChartProps {
  type: 'month';
  data: MonthPredictionResponse;
  monthName: string;
}
interface RangeChartWrapperProps {
  type: 'range';
  data: RangePredictionResponse[];
}
interface AllWeeksChartProps {
  type: 'allWeeks';
  data: WeekSummary[];
  title: string;
}
interface AllMonthsChartProps {
  type: 'allMonths';
  data: MonthSummary[];
  title: string;
}

type PredictionResultChartProps =
  | DayChartProps
  | WeekChartProps
  | MonthChartProps
  | RangeChartWrapperProps
  | AllWeeksChartProps
  | AllMonthsChartProps;

export const PredictionResultChart: React.FC<PredictionResultChartProps> = (props) => {
  switch (props.type) {
    case 'day': {
      const pct = parseFloat(props.data.predicted_absentees_percentage.replace('%', ''));
      return (
        <GaugeChart
          label={`Prediction for ${props.data.date}`}
          percentage={pct}
          color={getBarColor(pct)}
        />
      );
    }
    case 'week': {
      const pct = parseFloat(props.data.average_week_absentees_percentage.replace('%', ''));
      return (
        <GaugeChart
          label={`Week starting ${props.data.week_start}`}
          percentage={pct}
          color={getBarColor(pct)}
        />
      );
    }
    case 'month': {
      const pct = parseFloat(props.data.average_month_absentees_percentage.replace('%', ''));
      return (
        <GaugeChart
          label={`${props.monthName} ${props.data.year}`}
          percentage={pct}
          color={getBarColor(pct)}
        />
      );
    }
    case 'range': {
      if (!props.data || props.data.length === 0) return null;
      return <RangeBarChart data={props.data} />;
    }
    case 'allWeeks': {
      const chartData = props.data.map(w => ({
        label: w.weekLabel,
        percentage: w.averageAbsenteeism,
      }));
      return (
        <DownloadableBarChart title={`Weekly Predictions — ${props.title}`} filename="prediction_weekly_chart.png">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="label" fontSize={12} />
              <YAxis fontSize={12} tickFormatter={(v: number) => `${v}%`} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
                formatter={(v: number) => [`${v.toFixed(2)}%`, 'Avg Absenteeism']}
              />
              <Bar dataKey="percentage" name="Avg Absenteeism" radius={[4, 4, 0, 0]}>
                {chartData.map((entry, idx) => (
                  <Cell key={idx} fill={getBarColor(entry.percentage)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </DownloadableBarChart>
      );
    }
    case 'allMonths': {
      const chartData = props.data.map(m => ({
        label: m.monthName,
        percentage: m.averageAbsenteeism,
      }));
      return (
        <DownloadableBarChart title={`Monthly Predictions — ${props.title}`} filename="prediction_monthly_chart.png">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="label" fontSize={12} />
              <YAxis fontSize={12} tickFormatter={(v: number) => `${v}%`} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
                formatter={(v: number) => [`${v.toFixed(2)}%`, 'Avg Absenteeism']}
              />
              <Bar dataKey="percentage" name="Avg Absenteeism" radius={[4, 4, 0, 0]}>
                {chartData.map((entry, idx) => (
                  <Cell key={idx} fill={getBarColor(entry.percentage)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </DownloadableBarChart>
      );
    }
  }
};
