// Mock data for TATA Motors Attendance Forecasting Portal

export interface AttendanceData {
  date: string;
  absenteeism: number;
  predicted: number;
  actual: number;
}

export interface OffDay {
  id: string;
  date: string;
  reason: string;
  type: 'holiday' | 'company-event' | 'maintenance';
}

export interface Leave {
  id: string;
  employeeId: string;
  employeeName: string;
  startDate: string;
  endDate: string;
  type: 'sick' | 'casual' | 'earned' | 'maternity' | 'paternity';
  status: 'approved' | 'pending' | 'rejected';
}
// const Data = await fetch('http://localhost:5000/data', {
//       method: 'Get'
//     });

//     if (!Data.ok) {
//       throw new Error(`API request failed: ${Data.status}`);
//     }
// Fixed historical data from your CSV - no more random data
export const generateHistoricalData = (days: number): AttendanceData[] => {
  const csvData: AttendanceData[] = [
    // January 2026 data (complete data to avoid white screen)
    { date: '2026-01-31', absenteeism: 10.5, predicted: 9, actual: 10.5 }, // Today's data
    { date: '2026-01-30', absenteeism: 8.5, predicted: 8.8, actual: 8.5 },
    { date: '2026-01-29', absenteeism: 9.1, predicted: 9.4, actual: 9.1 },
    { date: '2026-01-28', absenteeism: 8.8, predicted: 9.1, actual: 8.8 },
    { date: '2026-01-27', absenteeism: 8.2, predicted: 8.5, actual: 8.2 },
    { date: '2026-01-26', absenteeism: 7.8, predicted: 8.1, actual: 7.8 },
    { date: '2026-01-25', absenteeism: 9.3, predicted: 9.6, actual: 9.3 },
    { date: '2026-01-24', absenteeism: 7.6, predicted: 7.9, actual: 7.6 },
    { date: '2026-01-23', absenteeism: 8, predicted: 8.3, actual: 8 },
    { date: '2026-01-22', absenteeism: 9.2, predicted: 9.5, actual: 9.2 },
    { date: '2026-01-21', absenteeism: 11, predicted: 11.3, actual: 11 },
    { date: '2026-01-20', absenteeism: 6.3, predicted: 6.6, actual: 6.3 },
    { date: '2026-01-19', absenteeism: 8.2, predicted: 8.5, actual: 8.2 },
    { date: '2026-01-18', absenteeism: 6.9, predicted: 7.2, actual: 6.9 },
    { date: '2026-01-17', absenteeism: 12.71, predicted: 13.0, actual: 12.71 },
    { date: '2026-01-16', absenteeism: 17.33, predicted: 17.6, actual: 17.33 },
    { date: '2026-01-13', absenteeism: 13.31, predicted: 13.6, actual: 13.31 },
    { date: '2026-01-12', absenteeism: 12.76, predicted: 13.0, actual: 12.76 },
    { date: '2026-01-11', absenteeism: 11.79, predicted: 12.1, actual: 11.79 },
    { date: '2026-01-10', absenteeism: 10.3, predicted: 10.6, actual: 10.3 },
    { date: '2026-01-09', absenteeism: 11.72, predicted: 12.0, actual: 11.72 },
    { date: '2026-01-08', absenteeism: 12, predicted: 12.3, actual: 12 },
    { date: '2026-01-07', absenteeism: 11.49, predicted: 11.7, actual: 11.49 },
    { date: '2026-01-06', absenteeism: 10.87, predicted: 11.1, actual: 10.87 },
    { date: '2026-01-05', absenteeism: 9.67, predicted: 9.9, actual: 9.67 },
    { date: '2026-01-03', absenteeism: 11.53, predicted: 11.8, actual: 11.53 },
    { date: '2026-01-02', absenteeism: 12.51, predicted: 12.8, actual: 12.51 },
    
    // December 2025 
    { date: '2025-12-31', absenteeism: 13, predicted: 13.3, actual: 13 },
    { date: '2025-12-30', absenteeism: 15, predicted: 15.3, actual: 15 },
    { date: '2025-12-29', absenteeism: 19, predicted: 19.3, actual: 19 },
    { date: '2025-12-20', absenteeism: 14, predicted: 14.3, actual: 14 },
    { date: '2025-12-19', absenteeism: 11, predicted: 11.3, actual: 11 },
  ];
  
// const csvData: AttendanceData[] = [Data];

  // Sort by date and return the requested number of days
  const sortedData = csvData.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  return sortedData.slice(-Math.min(days, sortedData.length));
};

// Mock weekly data - based on CSV averages
export const weeklyData: AttendanceData[] = [
  { date: 'Week 1', absenteeism: 11.2, predicted: 11.5, actual: 11.2 }, // Jan 2-8 average
  { date: 'Week 2', absenteeism: 13.8, predicted: 14.1, actual: 13.8 }, // Jan 9-15 average
  { date: 'Week 3', absenteeism: 9.4, predicted: 9.7, actual: 9.4 }, // Jan 16-22 average
  { date: 'Week 4', absenteeism: 8.8, predicted: 9.1, actual: 8.8 }, // Jan 23-29 average
];

// Mock monthly data - based on CSV data
export const monthlyData: AttendanceData[] = [
  { date: 'Jan 2026', absenteeism: 10.5, predicted: 10.8, actual: 10.5 }, // Current month from CSV
  { date: 'Dec 2025', absenteeism: 15.2, predicted: 15.5, actual: 15.2 }, // Previous month from CSV
  { date: 'Nov 2025', absenteeism: 9.8, predicted: 10.1, actual: 9.8 },
  { date: 'Oct 2025', absenteeism: 8.4, predicted: 8.7, actual: 8.4 },
  { date: 'Sep 2025', absenteeism: 7.9, predicted: 8.2, actual: 7.9 },
  { date: 'Aug 2025', absenteeism: 8.6, predicted: 8.9, actual: 8.6 },
  { date: 'Jul 2025', absenteeism: 9.1, predicted: 9.4, actual: 9.1 },
  { date: 'Jun 2025', absenteeism: 10.2, predicted: 10.5, actual: 10.2 },
  { date: 'May 2025', absenteeism: 8.8, predicted: 9.1, actual: 8.8 },
  { date: 'Apr 2025', absenteeism: 7.6, predicted: 7.9, actual: 7.6 },
  { date: 'Mar 2025', absenteeism: 8.2, predicted: 8.5, actual: 8.2 },
  { date: 'Feb 2025', absenteeism: 9.5, predicted: 9.8, actual: 9.5 },
];

// Mock off days
export const mockOffDays: OffDay[] = [
  { id: '1', date: '2025-01-26', reason: 'Republic Day', type: 'holiday' },
  { id: '2', date: '2025-03-14', reason: 'Holi', type: 'holiday' },
  { id: '3', date: '2025-08-15', reason: 'Independence Day', type: 'holiday' },
  { id: '4', date: '2025-10-02', reason: 'Gandhi Jayanti', type: 'holiday' },
  { id: '5', date: '2025-11-01', reason: 'Annual Maintenance', type: 'maintenance' },
];

// Mock leaves
export const mockLeaves: Leave[] = [
  { id: '1', employeeId: 'EMP001', employeeName: 'Rajesh Kumar', startDate: '2025-02-01', endDate: '2025-02-03', type: 'casual', status: 'approved' },
  { id: '2', employeeId: 'EMP045', employeeName: 'Priya Sharma', startDate: '2025-02-10', endDate: '2025-02-15', type: 'earned', status: 'pending' },
  { id: '3', employeeId: 'EMP078', employeeName: 'Amit Patel', startDate: '2025-02-05', endDate: '2025-02-05', type: 'sick', status: 'approved' },
  { id: '4', employeeId: 'EMP102', employeeName: 'Sneha Reddy', startDate: '2025-03-01', endDate: '2025-05-01', type: 'maternity', status: 'approved' },
];

// Today's stats - Updated for 490 total employees (10.5% absenteeism from CSV)
export const todayStats = {
  absenteeism: 10.5,
  totalEmployees: 994,
  presentToday: 439, // 490 - 51
  absentToday: 51, // 10.5% of 490
  predictedAbsenteeism: 7.5,
  trend: 'up' as const,
  trendValue: 1.3,
};
