import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend,
  AreaChart,
  Area
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { useAttendanceData } from '@/hooks/useAttendanceData';
import React, { useState, useMemo, useRef } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { ChevronLeft, ChevronRight, Image, FileSpreadsheet } from 'lucide-react';
import { downloadChartAsImage, downloadDataAsCSV } from '@/lib/downloadUtils';
import { useToast } from '@/hooks/use-toast';
import type { MLPredictionPoint } from './PredictionForm';

type Period = 'day' | 'week' | 'month';

interface ChartProps {
  mlPredictions?: MLPredictionPoint[];
}

export const Chart: React.FC<ChartProps> = ({ mlPredictions }) => {
  const [period, setPeriod] = useState<Period>('day');
  const [currentViewDate, setCurrentViewDate] = useState<Date>(new Date());
  const { data, isLoading } = useAttendanceData(period, currentViewDate);
  const chartRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Navigation functions
  const navigateForward = () => {
    const newDate = new Date(currentViewDate);
    if (period === 'day') {
      newDate.setDate(currentViewDate.getDate() + 1);
    } else if (period === 'week') {
      newDate.setDate(currentViewDate.getDate() + 7);
    } else if (period === 'month') {
      newDate.setMonth(currentViewDate.getMonth() + 1);
    }
    setCurrentViewDate(newDate);
  };

  const navigateBackward = () => {
    const newDate = new Date(currentViewDate);
    if (period === 'day') {
      newDate.setDate(currentViewDate.getDate() - 1);
    } else if (period === 'week') {
      newDate.setDate(currentViewDate.getDate() - 7);
    } else if (period === 'month') {
      newDate.setMonth(currentViewDate.getMonth() - 1);
    }
    setCurrentViewDate(newDate);
  };

  // Data is already filtered by csvService - actual only up to today, predicted for all
  const baseData = data || [];

  // Merge ML predictions into the chart data
  const processedData = useMemo(() => {
    if (!mlPredictions || mlPredictions.length === 0) return baseData;

    const mlMap = new Map(mlPredictions.map(p => [p.date, p.mlPredicted]));

    // Dates that exist in base data
    const existingDates = new Set(baseData.map(d => d.date));

    // Merge into existing rows + add extra rows for dates only in predictions
    const merged = baseData.map(d => ({
      ...d,
      mlPredicted: mlMap.get(d.date) ?? null,
    }));

    for (const p of mlPredictions) {
      if (!existingDates.has(p.date)) {
        merged.push({
          date: p.date,
          absenteeism: null,
          predicted: null,
          actual: null,
          mlPredicted: p.mlPredicted,
        } as any);
      }
    }

    merged.sort((a, b) => a.date.localeCompare(b.date));
    return merged;
  }, [baseData, mlPredictions]);

  // Calculate colors based on values
  const getColors = () => {
    // Get all data points that have both actual and predicted > 0
    const validData = processedData.filter(item => 
      item.actual > 0 && item.predicted > 0
    );
    
    if (validData.length === 0) {
      return { actualColor: 'hsl(var(--chart-1))', predictedColor: 'hsl(var(--chart-2))' };
    }
    
    // Check if ALL visible data points have both lines above 10%
    const allAbove10 = validData.length > 0 && validData.every(item => 
      Number(item.actual) > 10 && Number(item.predicted) > 10
    );
    
    // Check if ALL visible data points have both lines below 10%
    const allBelow10 = validData.length > 0 && validData.every(item => 
      Number(item.actual) < 10 && Number(item.predicted) < 10
    );
    
    if (allAbove10) {
      return { actualColor: '#ef4444', predictedColor: '#dc2626' }; // Red colors
    } else if (allBelow10) {
      return { actualColor: '#22c55e', predictedColor: '#16a34a' }; // Green colors
    } else {
      return { actualColor: 'hsl(var(--chart-1))', predictedColor: 'hsl(var(--chart-2))' }; // Default colors
    }
  };

  const { actualColor, predictedColor } = getColors();

  const getPeriodLabel = () => {
    switch (period) {
      case 'day': return 'Daily';
      case 'week': return 'Weekly';
      case 'month': return 'Monthly';
    }
  };

  const handleDownloadImage = async () => {
    if (!chartRef.current) return;
    const ok = await downloadChartAsImage(chartRef.current, `predictions_trends_${period}.png`);
    toast({ title: ok ? 'Downloaded' : 'Error', description: ok ? 'Chart image saved!' : 'Failed to capture chart' });
  };

  const handleDownloadCSV = () => {
    if (!processedData || processedData.length === 0) return;
    const rows = processedData.map((d: any) => ({
      date: d.date,
      actual: d.actual ?? '',
      predicted: d.predicted ?? '',
      ml_predicted: d.mlPredicted ?? '',
    }));
    downloadDataAsCSV(rows, `predictions_trends_${period}.csv`);
    toast({ title: 'Downloaded', description: 'CSV file saved!' });
  };

  return (
    <Card className="lg:col-span-2" ref={chartRef}>
      <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <CardTitle className="section-title">
          Absenteeism Trends - {getPeriodLabel()} View
        </CardTitle>
        <div className="flex items-center gap-4">
          {/* Download buttons */}
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleDownloadImage} title="Download as Image">
              <Image className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleDownloadCSV} title="Download as CSV">
              <FileSpreadsheet className="h-4 w-4" />
            </Button>
          </div>
          
          {/* Period tabs */}
          <Tabs value={period} onValueChange={(v) => {
            setPeriod(v as Period);
            setCurrentViewDate(new Date());
          }}>
            <TabsList>
              <TabsTrigger value="day">Day</TabsTrigger>
              <TabsTrigger value="week">Week</TabsTrigger>
              <TabsTrigger value="month">Month</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-[300px] w-full" />
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={processedData}>
              <defs>
                <linearGradient id="colorActual" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={actualColor} stopOpacity={0.3}/>
                  <stop offset="95%" stopColor={actualColor} stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorPredicted" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={predictedColor} stopOpacity={0.3}/>
                  <stop offset="95%" stopColor={predictedColor} stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorMlPredicted" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f97316" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis 
                dataKey="date" 
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
                tickFormatter={(value) => {
                  if (period === 'day') {
                    return new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
                  }
                  return value;
                }}
              />
              <YAxis 
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
                tickFormatter={(value) => `${value}%`}
              />
              <Tooltip 
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
                labelStyle={{ color: 'hsl(var(--foreground))' }}
                formatter={(value: number) => [`${value}%`, '']}
              />
              <Legend />
              <Area 
                type="monotone" 
                dataKey="actual" 
                name="Actual"
                stroke={actualColor} 
                fill="url(#colorActual)"
                strokeWidth={2}
                connectNulls={false}
              />
              <Area 
                type="monotone" 
                dataKey="predicted" 
                name="Predicted"
                stroke={predictedColor} 
                fill="url(#colorPredicted)"
                strokeWidth={2}
                strokeDasharray="5 5"
                connectNulls={false}
              />
              {mlPredictions && mlPredictions.length > 0 && (
                <Area
                  type="monotone"
                  dataKey="mlPredicted"
                  name="ML Prediction"
                  stroke="#f97316"
                  fill="url(#colorMlPredicted)"
                  strokeWidth={2.5}
                  strokeDasharray="3 3"
                  connectNulls={false}
                />
              )}
            </AreaChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
};
