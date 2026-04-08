import { useState, useEffect, useRef } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Image, FileSpreadsheet } from 'lucide-react';
import { fetchAttendanceCSV, toLocalDateStr } from '@/lib/csvService';
import { downloadChartAsImage, downloadDataAsCSV } from '@/lib/downloadUtils';
import { useToast } from '@/hooks/use-toast';
import { API_BASE } from '@/lib/network';

interface AccuracyEntry {
  label: string;
  actual: number;
  predicted: number;
  accuracy: number;
}

export const PredictionAccuracy = () => {
  const [data, setData] = useState<AccuracyEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const chartRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const handleDownloadImage = async () => {
    if (!chartRef.current) return;
    const ok = await downloadChartAsImage(chartRef.current, 'prediction_accuracy.png');
    toast({ title: ok ? 'Downloaded' : 'Error', description: ok ? 'Chart image saved!' : 'Failed to capture chart' });
  };

  const handleDownloadCSV = () => {
    if (data.length === 0) return;
    const rows = data.map(d => ({ date: d.label, actual: d.actual.toFixed(2), predicted: d.predicted.toFixed(2), accuracy_percent: d.accuracy }));
    downloadDataAsCSV(rows, 'prediction_accuracy.csv');
    toast({ title: 'Downloaded', description: 'CSV file saved!' });
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const rows = await fetchAttendanceCSV();
        const today = toLocalDateStr(new Date());
        const withActual = rows.filter(r => r.absent_percent !== null && r.date <= today);
        const last7 = withActual.slice(-7);
        if (last7.length === 0) { setLoading(false); return; }

        const startDate = last7[0].date;
        const endDate = last7[last7.length - 1].date;

        let predictionsMap: Record<string, number> = {};
        try {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 10000);
          const res = await fetch(
            `${API_BASE}/predict/range?start_date=${startDate}&end_date=${endDate}`,
            { signal: controller.signal }
          );
          clearTimeout(timeout);
          if (res.ok) {
            const json: Array<{ date: string; predicted_absentees_percentage: string }> = await res.json();
            json.forEach(item => {
              predictionsMap[item.date] = parseFloat(item.predicted_absentees_percentage.replace('%', ''));
            });
          }
        } catch { /* API down */ }

        if (cancelled) return;

        const entries: AccuracyEntry[] = last7
          .filter(row => predictionsMap[row.date] !== undefined)
          .map(row => {
            const actual = row.absent_percent!;
            const predicted = predictionsMap[row.date];
            const accuracy = Math.max(0, Math.round((1 - Math.abs(predicted - actual) / Math.max(actual, 0.01)) * 100));
            const d = new Date(row.date + 'T00:00:00');
            const label = d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
            return { label, actual, predicted, accuracy };
          });

        setData(entries);
      } catch (err) {
        console.error('PredictionAccuracy error:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const getBarColor = (accuracy: number) => {
    if (accuracy >= 95) return 'hsl(var(--success))';
    if (accuracy >= 90) return 'hsl(var(--chart-2))';
    if (accuracy >= 80) return 'hsl(var(--warning))';
    return 'hsl(var(--destructive))';
  };

  const minDomain = data.length > 0 ? Math.max(0, Math.min(...data.map(d => d.accuracy)) - 10) : 70;

  return (
    <Card ref={chartRef}>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="section-title">Prediction Accuracy — Last 7 Days</CardTitle>
        {data.length > 0 && (
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleDownloadImage} title="Download as Image">
              <Image className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleDownloadCSV} title="Download as CSV">
              <FileSpreadsheet className="h-4 w-4" />
            </Button>
          </div>
        )}
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-[250px] w-full rounded-lg" />
        ) : data.length === 0 ? (
          <p className="text-muted-foreground text-sm text-center py-12">No accuracy data available</p>
        ) : (
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis
                dataKey="label"
                stroke="hsl(var(--muted-foreground))"
                fontSize={11}
                tickLine={false}
              />
              <YAxis
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
                domain={[minDomain, 100]}
                tickFormatter={(v) => `${v}%`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  fontSize: '12px',
                }}
                formatter={(value: number, name: string) => {
                  if (name === 'accuracy') return [`${value}%`, 'Accuracy'];
                  return [value, name];
                }}
                labelFormatter={(label) => label}
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null;
                  const entry = payload[0].payload as AccuracyEntry;
                  return (
                    <div style={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      padding: '8px 12px',
                      fontSize: '12px',
                    }}>
                      <p style={{ fontWeight: 600, marginBottom: 4 }}>{label}</p>
                      <p>Actual: <strong>{entry.actual.toFixed(1)}%</strong></p>
                      <p>Predicted: <strong>{entry.predicted.toFixed(1)}%</strong></p>
                      <p>Accuracy: <strong>{entry.accuracy}%</strong></p>
                    </div>
                  );
                }}
              />
              <Bar dataKey="accuracy" radius={[4, 4, 0, 0]}>
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={getBarColor(entry.accuracy)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
};
