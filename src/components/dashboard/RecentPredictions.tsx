import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { FileSpreadsheet } from 'lucide-react';
import { fetchAttendanceCSV, toLocalDateStr, type AttendanceRow } from '@/lib/csvService';
import { downloadDataAsCSV } from '@/lib/downloadUtils';
import { useToast } from '@/hooks/use-toast';
import { API_BASE } from '@/lib/network';

interface DayComparison {
  date: string;
  actual: number;
  predicted: number | null;
  accuracy: number | null;
  confidence: 'Excellent' | 'Good' | 'Fair' | 'Low' | 'N/A';
}

export const RecentPredictions = () => {
  const [data, setData] = useState<DayComparison[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const { toast } = useToast();

  const MAX_RETRIES = 3;

  const handleDownloadCSV = () => {
    if (data.length === 0) return;
    const rows = data.map(d => ({
      date: d.date,
      actual: d.actual.toFixed(2),
      predicted: d.predicted !== null ? d.predicted.toFixed(2) : '',
      accuracy: d.accuracy !== null ? d.accuracy.toFixed(2) : '',
      confidence: d.confidence,
    }));
    downloadDataAsCSV(rows, 'recent_predictions_vs_actual.csv');
    toast({ title: 'Downloaded', description: 'CSV file saved!' });
  };

  useEffect(() => {
    let cancelled = false;

    const fetchData = async () => {
      try {
        setError(null);
        // 1) Get last 7 days with actual data from CSV
        const rows = await fetchAttendanceCSV();
        const today = toLocalDateStr(new Date());
        const withActual = rows.filter(
          (r) => r.absent_percent !== null && r.date <= today
        );
        const last7 = withActual.slice(-7);
        if (last7.length === 0) { setLoading(false); return; }

        const startDate = last7[0].date;
        const endDate = last7[last7.length - 1].date;

        // 2) Fetch ML predictions for same range with retry
        let predictionsMap: Record<string, number> = {};
        let attempts = 0;
        let success = false;

        while (attempts < MAX_RETRIES && !success && !cancelled) {
          try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 20000);
            const res = await fetch(
              `${API_BASE}/predict/range?start_date=${startDate}&end_date=${endDate}`,
              { signal: controller.signal }
            );
            clearTimeout(timeout);
            if (res.ok) {
              const json: Array<{ date: string; predicted_absentees_percentage: string }> = await res.json();
              json.forEach((item) => {
                predictionsMap[item.date] = parseFloat(item.predicted_absentees_percentage.replace('%', ''));
              });
              success = true;
            } else {
              attempts++;
              if (attempts < MAX_RETRIES) await new Promise(r => setTimeout(r, 1000 * attempts));
            }
          } catch (err) {
            attempts++;
            if (attempts < MAX_RETRIES) await new Promise(r => setTimeout(r, 1000 * attempts));
            else throw err;
          }
        }

        // 3) Build comparison
        if (cancelled) return;
        const comparisons: DayComparison[] = last7
          .map((row) => {
            const actual = row.absent_percent!;
            const predicted = predictionsMap[row.date] ?? null;
            let accuracy: number | null = null;
            let confidence: DayComparison['confidence'] = 'N/A';

            if (predicted !== null && actual > 0) {
              accuracy = Math.max(0, (1 - Math.abs(predicted - actual) / actual) * 100);
              if (accuracy >= 95) confidence = 'Excellent';
              else if (accuracy >= 90) confidence = 'Good';
              else if (accuracy >= 80) confidence = 'Fair';
              else confidence = 'Low';
            }

            return { date: row.date, actual, predicted, accuracy, confidence };
          })
          .reverse(); // newest first

        setData(comparisons);
        setRetryCount(0);
      } catch (err) {
        console.error('RecentPredictions error:', err);
        setError('Failed to load predictions. Retrying...');

        // Auto-retry after delay
        if (retryCount < MAX_RETRIES) {
          setTimeout(() => {
            setRetryCount(prev => prev + 1);
          }, 2000);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchData();
    return () => { cancelled = true; };
  }, [retryCount]);

  const confidenceBadge = (c: DayComparison['confidence']) => {
    switch (c) {
      case 'Excellent': return <Badge className="bg-success hover:bg-success text-[11px]">Excellent</Badge>;
      case 'Good': return <Badge className="bg-accent hover:bg-accent text-[11px]">Good</Badge>;
      case 'Fair': return <Badge className="bg-warning hover:bg-warning text-[11px]">Fair</Badge>;
      case 'Low': return <Badge variant="destructive" className="text-[11px]">Low</Badge>;
      default: return <Badge variant="outline" className="text-[11px]">N/A</Badge>;
    }
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
  };

  return (
    <Card>
      <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <CardTitle className="section-title leading-tight">Recent Predictions vs Actual</CardTitle>
        {data.length > 0 && (
          <Button variant="ghost" size="icon" className="h-8 w-8 self-end sm:self-auto shrink-0" onClick={handleDownloadCSV} title="Download as CSV">
            <FileSpreadsheet className="h-4 w-4" />
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {error && (
          <div className="mb-4 p-3 bg-yellow-100 border border-yellow-300 rounded text-sm text-yellow-800">
            {error} {retryCount}/{MAX_RETRIES}
          </div>
        )}
        {loading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-lg" />)}
          </div>
        ) : data.length === 0 ? (
          <p className="text-muted-foreground text-sm text-center py-6">No recent data available</p>
        ) : (
          <div className="space-y-3">
            {data.map((item) => (
              <div
                key={item.date}
                className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 rounded-lg border border-border p-3 transition-colors hover:bg-muted/50"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-foreground text-sm">
                    {formatDate(item.date)}
                  </p>
                  <div className="flex flex-wrap items-center gap-2 sm:gap-3 mt-0.5 text-xs text-muted-foreground">
                    <span>Actual: <span className="font-semibold text-foreground">{item.actual.toFixed(1)}%</span></span>
                    <span>Predicted: <span className="font-semibold text-foreground">{item.predicted !== null ? `${item.predicted.toFixed(1)}%` : '—'}</span></span>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0 sm:ml-3 self-end sm:self-auto">
                  {item.accuracy !== null && (
                    <span className="text-xs font-medium text-muted-foreground">
                      {item.accuracy.toFixed(1)}%
                    </span>
                  )}
                  {confidenceBadge(item.confidence)}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
