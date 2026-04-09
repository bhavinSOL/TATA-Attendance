import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  getDailyChartData,
  getWeeklyChartData,
  getMonthlyChartData,
  fetchAttendanceCSV,
  toLocalDateStr,
  type ChartData
} from '@/lib/csvService';
import { 
  getCurrentDateParams, 
  type PredictionInput,
  predictByDay,
  predictByWeek,
  predictByMonth,
  predictByRange,
  predictAllWeeksInMonth,
  predictAllMonthsInYear,
  type DayPredictionResponse,
  type WeekPredictionResponse,
  type MonthPredictionResponse,
  type RangePredictionResponse,
  type WeekSummary,
  type MonthSummary,
} from '@/lib/apiService';
import { API_BASE } from '@/lib/network';

// Hook connected to CSV files + your Python API for predictions

interface TodayStats {
  absenteeism: number;
  totalEmployees: number;
  presentToday: number;
  absentToday: number;
  predictedAbsenteeism: number;
  predictedAbsenteeism1:number;
  predictedAbsenteeism2:number;
  predicted: number;
  predicted1: number;
  predicted2: number;
  trend: 'up' | 'down';
  trendValue: number;
}

const TOTAL_EMPLOYEES = 994;

const fetchTodayAbsenteeism = async (): Promise<TodayStats> => {
  // 1) Read actual absenteeism from attendance.csv
  const attendance = await fetchAttendanceCSV();
  const today = new Date();
  const todayStr = toLocalDateStr(today);

  // Find latest row with actual data (today or most recent past day)
  const rowsWithData = attendance
    .filter(r => r.absent_percent !== null && !isNaN(r.absent_percent!) && r.date <= todayStr)
    .sort((a, b) => b.date.localeCompare(a.date));

  const latestRow = rowsWithData[0];
  const previousRow = rowsWithData[1];

  const absenteeism = latestRow ? latestRow.absent_percent! : 0;
  const prevAbsenteeism = previousRow ? previousRow.absent_percent! : absenteeism;
  const trendValue = Math.abs(Math.round((absenteeism - prevAbsenteeism) * 100) / 100);
  const trend: 'up' | 'down' = absenteeism >= prevAbsenteeism ? 'up' : 'down';

  const absentToday = Math.round((absenteeism / 100) * TOTAL_EMPLOYEES);
  const presentToday = TOTAL_EMPLOYEES - absentToday;

  // 2) Fetch tomorrow's prediction from API (sequential - one by one)
  let predictedAbsenteeism = 0;
  let predictedAbsenteeism1 = 0;
  let predictedAbsenteeism2 = 0;
  let predicted = 0;
  let predicted1 = 0;
  let predicted2= 0;
  try {
    const tomorrow = new Date();
    const nextday1=new Date();
    const nextday2=new Date();
    nextday1.setDate(nextday1.getDate()+2)
    nextday2.setDate(nextday2.getDate()+3)
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Fetch predictions sequentially (one at a time) to avoid cancellations
    // Each request gets its own timeout

    // Request 1: Tomorrow
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);
      const res = await fetch(`${API_BASE}/predict/day?date=${toLocalDateStr(tomorrow)}`, { signal: controller.signal });
      clearTimeout(timeout);
      if (res.ok) {
        const data = await res.json();
        if (data && typeof data.predicted_absentees_percentage === 'string') {
          predictedAbsenteeism = parseFloat(data.predicted_absentees_percentage.replace('%', ''));
          predicted = Math.round((predictedAbsenteeism / 100) * TOTAL_EMPLOYEES);
        }
      }
    } catch (err) {
      console.warn('Request 1 failed:', err);
    }

    // Request 2: Day+2
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);
      const res1 = await fetch(`${API_BASE}/predict/day?date=${toLocalDateStr(nextday1)}`, { signal: controller.signal });
      clearTimeout(timeout);
      if (res1.ok) {
        const data1 = await res1.json();
        if (data1 && typeof data1.predicted_absentees_percentage === 'string') {
          predictedAbsenteeism1 = parseFloat(data1.predicted_absentees_percentage.replace('%', ''));
          predicted1 = Math.round((predictedAbsenteeism1 / 100) * TOTAL_EMPLOYEES);
        }
      }
    } catch (err) {
      console.warn('Request 2 failed:', err);
    }

    // Request 3: Day+3
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);
      const res2 = await fetch(`${API_BASE}/predict/day?date=${toLocalDateStr(nextday2)}`, { signal: controller.signal });
      clearTimeout(timeout);
      if (res2.ok) {
        const data2 = await res2.json();
        if (data2 && typeof data2.predicted_absentees_percentage === 'string') {
          predictedAbsenteeism2 = parseFloat(data2.predicted_absentees_percentage.replace('%', ''));
          predicted2 = Math.round((predictedAbsenteeism2 / 100) * TOTAL_EMPLOYEES);
        }
      }
    } catch (err) {
      console.warn('Request 3 failed:', err);
    }
  } catch (err) {
    // Fallback error handler
    console.warn('Prediction API error, using 0 fallback:', err);
  }

  return {
    absenteeism,
    totalEmployees: TOTAL_EMPLOYEES,
    presentToday,
    absentToday,
    predictedAbsenteeism,
    predictedAbsenteeism1,
    predictedAbsenteeism2,
    predicted,
    predicted1,
    predicted2,
    trend,
    trendValue,
  };
};

// Fetch attendance data from CSV + API based on period and view date
const fetchAttendanceByPeriod = async (
  period: 'day' | 'week' | 'month',
  viewDate: Date
): Promise<ChartData[]> => {
  switch (period) {
    case 'day':
      return getDailyChartData(viewDate);
    case 'week':
      return getWeeklyChartData(viewDate);
    case 'month':
      return getMonthlyChartData(viewDate);
    default:
      return getDailyChartData(viewDate);
  }
};

export const useTodayStats = () => {
  return useQuery({
    queryKey: ['todayStats'],
    queryFn: fetchTodayAbsenteeism,
    retry: 3, // Retry 3 times before giving up
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // Cache for 10 minutes
  });
};

// Updated hook: accepts viewDate for navigation
export const useAttendanceData = (period: 'day' | 'week' | 'month', viewDate?: Date) => {
  const dateKey = viewDate
    ? `${viewDate.getFullYear()}-${String(viewDate.getMonth() + 1).padStart(2, '0')}-${String(viewDate.getDate()).padStart(2, '0')}`
    : 'default';
  return useQuery({
    queryKey: ['attendance', period, dateKey],
    queryFn: () => fetchAttendanceByPeriod(period, viewDate || new Date('2026-02-12')),
    retry: 3, // Retry 3 times
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // Cache for 10 minutes
  });
};

// ---- New Prediction Hooks ----

// Day prediction: /predict/day?date=YYYY-MM-DD
export const useDayPrediction = (date: string, enabled = false) => {
  return useQuery<DayPredictionResponse>({
    queryKey: ['prediction', 'day', date],
    queryFn: () => predictByDay(date),
    enabled,
    retry: 1,
  });
};

// Week prediction: /predict/week?start_date=YYYY-MM-DD
export const useWeekPrediction = (startDate: string, enabled = false) => {
  return useQuery<WeekPredictionResponse>({
    queryKey: ['prediction', 'week', startDate],
    queryFn: () => predictByWeek(startDate),
    enabled,
    retry: 1,
  });
};

// Month prediction: /predict/month?year=YYYY&month=M
export const useMonthPrediction = (year: number, month: number, enabled = false) => {
  return useQuery<MonthPredictionResponse>({
    queryKey: ['prediction', 'month', year, month],
    queryFn: () => predictByMonth(year, month),
    enabled,
    retry: 1,
  });
};

// Range prediction: /predict/range?start_date=...&end_date=...
export const useRangePrediction = (startDate: string, endDate: string, enabled = false) => {
  return useQuery<RangePredictionResponse[]>({
    queryKey: ['prediction', 'range', startDate, endDate],
    queryFn: () => predictByRange(startDate, endDate),
    enabled,
    retry: 1,
  });
};

// All weeks in a month
export const useAllWeeksInMonth = (year: number, month: number, enabled = false) => {
  return useQuery<WeekSummary[]>({
    queryKey: ['prediction', 'allWeeks', year, month],
    queryFn: () => predictAllWeeksInMonth(year, month),
    enabled,
    retry: 1,
  });
};

// All months in a year
export const useAllMonthsInYear = (year: number, enabled = false) => {
  return useQuery<MonthSummary[]>({
    queryKey: ['prediction', 'allMonths', year],
    queryFn: () => predictAllMonthsInYear(year),
    enabled,
    retry: 1,
  });
};

// Hook for getting today's prediction parameters (for UI forms)
export const useTodayParams = () => {
  return getCurrentDateParams();
};
