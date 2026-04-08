import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useDayPrediction, useWeekPrediction, useMonthPrediction, useRangePrediction, useAllWeeksInMonth, useAllMonthsInYear } from '@/hooks/useAttendanceData';
import { Loader2, TrendingUp, Calendar, CalendarDays, CalendarRange, Download } from 'lucide-react';
import { PredictionResultChart } from './PredictionResultChart';
import { downloadDataAsCSV } from '@/lib/downloadUtils';
import { useToast } from '@/hooks/use-toast';

export interface MLPredictionPoint {
  date: string;
  mlPredicted: number;
}

interface PredictionFormProps {
  onPredictionData?: (data: MLPredictionPoint[]) => void;
}

const formatDate = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const today = new Date();
const todayStr = formatDate(today);

export const PredictionForm: React.FC<PredictionFormProps> = ({ onPredictionData }) => {
  const { toast } = useToast();
  // --- Day state ---
  const [dayDate, setDayDate] = useState(todayStr);
  const [dayEnabled, setDayEnabled] = useState(false);
  const dayQuery = useDayPrediction(dayDate, dayEnabled);

  // --- Week state (all weeks in selected month) ---
  const [weekYear, setWeekYear] = useState(today.getFullYear());
  const [weekMonth, setWeekMonth] = useState(today.getMonth() + 1);
  const [weekEnabled, setWeekEnabled] = useState(false);
  const allWeeksQuery = useAllWeeksInMonth(weekYear, weekMonth, weekEnabled);

  // --- Month state (all 12 months in selected year) ---
  const [monthYear, setMonthYear] = useState(today.getFullYear());
  const [allMonthsEnabled, setAllMonthsEnabled] = useState(false);
  const allMonthsQuery = useAllMonthsInYear(monthYear, allMonthsEnabled);

  // --- Range state ---
  const [rangeStart, setRangeStart] = useState(todayStr);
  const [rangeEnd, setRangeEnd] = useState(todayStr);
  const [rangeEnabled, setRangeEnabled] = useState(false);
  const rangeQuery = useRangePrediction(rangeStart, rangeEnd, rangeEnabled);

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // --- Send prediction data to Chart via callback ---
  useEffect(() => {
    if (dayQuery.data) {
      const pct = parseFloat(dayQuery.data.predicted_absentees_percentage.replace('%', ''));
      onPredictionData?.([{ date: dayQuery.data.date, mlPredicted: pct }]);
    }
  }, [dayQuery.data]);

  useEffect(() => {
    if (allWeeksQuery.data && allWeeksQuery.data.length > 0) {
      // Expand week-level data into daily points for the area chart
      const points: MLPredictionPoint[] = [];
      for (const wk of allWeeksQuery.data) {
        const start = new Date(wk.weekStart);
        for (let i = 0; i < 7; i++) {
          const d = new Date(start);
          d.setDate(start.getDate() + i);
          // Stay within the selected month
          if (d.getMonth() + 1 === weekMonth && d.getFullYear() === weekYear) {
            points.push({ date: formatDate(d), mlPredicted: wk.averageAbsenteeism });
          }
        }
      }
      onPredictionData?.(points);
    }
  }, [allWeeksQuery.data]);

  useEffect(() => {
    if (allMonthsQuery.data && allMonthsQuery.data.length > 0) {
      // One point per month (use 1st of each month as date)
      const points: MLPredictionPoint[] = allMonthsQuery.data.map(m => ({
        date: `${monthYear}-${String(m.month).padStart(2, '0')}-01`,
        mlPredicted: m.averageAbsenteeism,
      }));
      onPredictionData?.(points);
    }
  }, [allMonthsQuery.data]);

  useEffect(() => {
    if (rangeQuery.data && rangeQuery.data.length > 0) {
      const points: MLPredictionPoint[] = rangeQuery.data.map(r => ({
        date: r.date,
        mlPredicted: parseFloat(r.predicted_absentees_percentage.replace('%', '')),
      }));
      onPredictionData?.(points);
    }
  }, [rangeQuery.data]);

  const renderError = (error: Error | null) =>
    error ? (
      <div className="text-red-600 p-4 bg-red-50 rounded-lg">
        <p className="font-medium">Error getting prediction:</p>
        <p className="text-sm">{error.message}</p>
        <p className="text-sm mt-2">Make sure your Python API is running on port 8000</p>
      </div>
    ) : null;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            ML Prediction Form
          </CardTitle>
          <CardDescription>
            Get predictions by Day, Week, Month, or Date Range from your ML API
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="day" className="w-full">
            <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 h-auto">
              <TabsTrigger value="day">Day</TabsTrigger>
              <TabsTrigger value="week">Week</TabsTrigger>
              <TabsTrigger value="month">Month</TabsTrigger>
              <TabsTrigger value="range">Range</TabsTrigger>
            </TabsList>

            {/* ==================== DAY ==================== */}
            <TabsContent value="day" className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>Select Date</Label>
                <Input
                  type="date"
                  value={dayDate}
                  onChange={(e) => { setDayDate(e.target.value); setDayEnabled(false); }}
                />
              </div>
              <Button className="w-full sm:w-auto" onClick={() => setDayEnabled(true)} disabled={dayQuery.isLoading}>
                {dayQuery.isLoading ? (
                  <><Loader2 className="h-4 w-4 animate-spin mr-2" />Predicting...</>
                ) : (
                  <><Calendar className="h-4 w-4 mr-2" />Predict Day</>
                )}
              </Button>

              {dayEnabled && (
                <div className="mt-4">
                  {renderError(dayQuery.error as Error | null)}
                  {dayQuery.data && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="text-center flex-1 p-4 bg-blue-50 rounded-lg space-y-2">
                          <p className="text-sm text-gray-500">{dayQuery.data.date}</p>
                          <div className="text-2xl sm:text-3xl font-bold text-blue-600">
                            {dayQuery.data.predicted_absentees_percentage}
                          </div>
                          <p className="text-gray-600">Predicted Absenteeism</p>
                        </div>
                      </div>
                      <div className="flex justify-end">
                        <Button className="w-full sm:w-auto" variant="outline" size="sm" onClick={() => {
                          downloadDataAsCSV([{ date: dayQuery.data!.date, predicted_absenteeism: dayQuery.data!.predicted_absentees_percentage }], `prediction_day_${dayQuery.data!.date}.csv`);
                          toast({ title: 'Downloaded', description: 'CSV file saved!' });
                        }}>
                          <Download className="h-4 w-4 mr-2" />Download CSV
                        </Button>
                      </div>
                      <PredictionResultChart type="day" data={dayQuery.data} />
                    </div>
                  )}
                </div>
              )}
            </TabsContent>

            {/* ==================== WEEK (all weeks in month) ==================== */}
            <TabsContent value="week" className="space-y-4 pt-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Year</Label>
                  <Input
                    type="number"
                    min="2024"
                    max="2030"
                    value={weekYear}
                    onChange={(e) => { setWeekYear(parseInt(e.target.value) || 2026); setWeekEnabled(false); }}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Month</Label>
                  <Select
                    value={weekMonth.toString()}
                    onValueChange={(v) => { setWeekMonth(parseInt(v)); setWeekEnabled(false); }}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {monthNames.map((m, i) => (
                        <SelectItem key={i + 1} value={(i + 1).toString()}>{m}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button className="w-full sm:w-auto" onClick={() => setWeekEnabled(true)} disabled={allWeeksQuery.isLoading}>
                {allWeeksQuery.isLoading ? (
                  <><Loader2 className="h-4 w-4 animate-spin mr-2" />Predicting all weeks...</>
                ) : (
                  <><CalendarDays className="h-4 w-4 mr-2" />Predict All Weeks</>
                )}
              </Button>

              {weekEnabled && (
                <div className="mt-4">
                  {renderError(allWeeksQuery.error as Error | null)}
                  {allWeeksQuery.data && allWeeksQuery.data.length > 0 && (
                    <div className="space-y-4">
                      <PredictionResultChart type="allWeeks" data={allWeeksQuery.data} title={`${monthNames[weekMonth - 1]} ${weekYear}`} />
                      {/* Download + Summary table */}
                      <div className="flex justify-end">
                        <Button className="w-full sm:w-auto" variant="outline" size="sm" onClick={() => {
                          const rows = allWeeksQuery.data!.map(wk => ({ week: wk.weekLabel, start_date: wk.weekStart, avg_absenteeism: wk.averageAbsenteeism + '%' }));
                          downloadDataAsCSV(rows, `prediction_weeks_${monthNames[weekMonth - 1]}_${weekYear}.csv`);
                          toast({ title: 'Downloaded', description: 'CSV file saved!' });
                        }}>
                          <Download className="h-4 w-4 mr-2" />Download CSV
                        </Button>
                      </div>
                      <div className="rounded-lg border overflow-x-auto">
                        <table className="w-full min-w-[480px] text-sm">
                          <thead className="bg-gray-100">
                            <tr>
                              <th className="text-left p-3 font-medium">Week</th>
                              <th className="text-left p-3 font-medium">Start Date</th>
                              <th className="text-right p-3 font-medium">Avg Absenteeism</th>
                            </tr>
                          </thead>
                          <tbody>
                            {allWeeksQuery.data.map((wk, i) => (
                              <tr key={i} className="border-t">
                                <td className="p-3 font-medium">{wk.weekLabel}</td>
                                <td className="p-3">{wk.weekStart}</td>
                                <td className="p-3 text-right font-semibold text-green-600">{wk.averageAbsenteeism}%</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </TabsContent>

            {/* ==================== MONTH (all 12 months in year) ==================== */}
            <TabsContent value="month" className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>Year</Label>
                <Input
                  type="number"
                  min="2024"
                  max="2030"
                  value={monthYear}
                  onChange={(e) => { setMonthYear(parseInt(e.target.value) || 2026); setAllMonthsEnabled(false); }}
                />
              </div>
              <Button className="w-full sm:w-auto" onClick={() => setAllMonthsEnabled(true)} disabled={allMonthsQuery.isLoading}>
                {allMonthsQuery.isLoading ? (
                  <><Loader2 className="h-4 w-4 animate-spin mr-2" />Predicting all months...</>
                ) : (
                  <><CalendarDays className="h-4 w-4 mr-2" />Predict All Months</>
                )}
              </Button>

              {allMonthsEnabled && (
                <div className="mt-4">
                  {renderError(allMonthsQuery.error as Error | null)}
                  {allMonthsQuery.data && allMonthsQuery.data.length > 0 && (
                    <div className="space-y-4">
                      <PredictionResultChart type="allMonths" data={allMonthsQuery.data} title={`${monthYear}`} />
                      {/* Download + Summary table */}
                      <div className="flex justify-end">
                        <Button className="w-full sm:w-auto" variant="outline" size="sm" onClick={() => {
                          const rows = allMonthsQuery.data!.map(mo => ({ month: monthNames[mo.month - 1], avg_absenteeism: mo.averageAbsenteeism + '%' }));
                          downloadDataAsCSV(rows, `prediction_months_${monthYear}.csv`);
                          toast({ title: 'Downloaded', description: 'CSV file saved!' });
                        }}>
                          <Download className="h-4 w-4 mr-2" />Download CSV
                        </Button>
                      </div>
                      <div className="rounded-lg border overflow-x-auto">
                        <table className="w-full min-w-[420px] text-sm">
                          <thead className="bg-gray-100">
                            <tr>
                              <th className="text-left p-3 font-medium">Month</th>
                              <th className="text-right p-3 font-medium">Avg Absenteeism</th>
                            </tr>
                          </thead>
                          <tbody>
                            {allMonthsQuery.data.map((mo, i) => (
                              <tr key={i} className="border-t">
                                <td className="p-3 font-medium">{monthNames[mo.month - 1]}</td>
                                <td className="p-3 text-right font-semibold text-purple-600">{mo.averageAbsenteeism}%</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </TabsContent>

            {/* ==================== RANGE ==================== */}
            <TabsContent value="range" className="space-y-4 pt-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Start Date</Label>
                  <Input
                    type="date"
                    value={rangeStart}
                    onChange={(e) => { setRangeStart(e.target.value); setRangeEnabled(false); }}
                  />
                </div>
                <div className="space-y-2">
                  <Label>End Date</Label>
                  <Input
                    type="date"
                    value={rangeEnd}
                    onChange={(e) => { setRangeEnd(e.target.value); setRangeEnabled(false); }}
                  />
                </div>
              </div>
              <Button className="w-full sm:w-auto" onClick={() => setRangeEnabled(true)} disabled={rangeQuery.isLoading}>
                {rangeQuery.isLoading ? (
                  <><Loader2 className="h-4 w-4 animate-spin mr-2" />Predicting...</>
                ) : (
                  <><CalendarRange className="h-4 w-4 mr-2" />Predict Range</>
                )}
              </Button>

              {rangeEnabled && (
                <div className="mt-4">
                  {renderError(rangeQuery.error as Error | null)}
                  {rangeQuery.data && rangeQuery.data.length > 0 && (
                    <div className="space-y-4">
                      {/* Chart */}
                      <PredictionResultChart type="range" data={rangeQuery.data} />

                      {/* Download */}
                      <div className="flex justify-end">
                        <Button className="w-full sm:w-auto" variant="outline" size="sm" onClick={() => {
                          const rows = rangeQuery.data!.map(r => ({ date: r.date, predicted_absenteeism: r.predicted_absentees_percentage }));
                          downloadDataAsCSV(rows, `prediction_range_${rangeStart}_to_${rangeEnd}.csv`);
                          toast({ title: 'Downloaded', description: 'CSV file saved!' });
                        }}>
                          <Download className="h-4 w-4 mr-2" />Download CSV
                        </Button>
                      </div>

                      {/* Table */}
                      <div className="rounded-lg border overflow-x-auto">
                        <table className="w-full min-w-[420px] text-sm">
                          <thead className="bg-gray-100">
                            <tr>
                              <th className="text-left p-3 font-medium">Date</th>
                              <th className="text-right p-3 font-medium">Predicted Absenteeism</th>
                            </tr>
                          </thead>
                          <tbody>
                            {rangeQuery.data.map((row, i) => (
                              <tr key={i} className="border-t">
                                <td className="p-3">{row.date}</td>
                                <td className="p-3 text-right font-semibold text-orange-600">
                                  {row.predicted_absentees_percentage}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};