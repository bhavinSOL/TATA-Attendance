import { fetchAttendanceCSV, fetchCalendarCSV, toLocalDateStr, type AttendanceRow, type CalendarRow } from './csvService';

export type NotificationType = 'alert' | 'warning' | 'info' | 'success';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  date: string; // ISO date when notification was generated
  read: boolean;
}

// Storage key for read state
const READ_KEY = 'tata_notifications_read';

function getReadIds(): Set<string> {
  try {
    const raw = localStorage.getItem(READ_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

function saveReadIds(ids: Set<string>) {
  localStorage.setItem(READ_KEY, JSON.stringify([...ids]));
}

export function markAsRead(id: string) {
  const ids = getReadIds();
  ids.add(id);
  saveReadIds(ids);
}

export function markAllAsRead(notifications: Notification[]) {
  const ids = getReadIds();
  notifications.forEach(n => ids.add(n.id));
  saveReadIds(ids);
}

/**
 * Generate real notifications from attendance & calendar CSV data.
 * Returns newest first.
 */
export async function generateNotifications(): Promise<Notification[]> {
  const [attendanceRows, calendarRows] = await Promise.all([
    fetchAttendanceCSV(),
    fetchCalendarCSV(),
  ]);

  const today = new Date();
  const todayStr = toLocalDateStr(today);
  const readIds = getReadIds();
  const notifications: Notification[] = [];

  // ── 1. High absenteeism alerts (last 7 days) ──
  const recentRows = attendanceRows
    .filter(r => r.absent_percent !== null && r.date <= todayStr)
    .slice(-7);

  for (const row of recentRows) {
    if (row.absent_percent !== null && row.absent_percent > 15) {
      const id = `high-absent-${row.date}`;
      notifications.push({
        id,
        type: 'alert',
        title: 'High Absenteeism Alert',
        message: `Absenteeism on ${formatDate(row.date)} was ${row.absent_percent.toFixed(1)}%, which exceeds the 15% threshold.`,
        date: row.date,
        read: readIds.has(id),
      });
    }
  }

  // ── 2. Absenteeism trend (rising for 3+ consecutive days) ──
  const last5 = recentRows.slice(-5);
  if (last5.length >= 3) {
    let risingCount = 0;
    for (let i = 1; i < last5.length; i++) {
      if ((last5[i].absent_percent ?? 0) > (last5[i - 1].absent_percent ?? 0)) {
        risingCount++;
      } else {
        risingCount = 0;
      }
    }
    if (risingCount >= 2) {
      const id = `trend-rising-${todayStr}`;
      notifications.push({
        id,
        type: 'warning',
        title: 'Rising Absenteeism Trend',
        message: `Absenteeism has been increasing for ${risingCount + 1} consecutive days. Current: ${last5[last5.length - 1].absent_percent?.toFixed(1)}%`,
        date: todayStr,
        read: readIds.has(id),
      });
    }
  }

  // ── 3. Upcoming holidays in next 7 days ──
  const next7 = getNextNDays(today, 7);
  const allCalendar = [...calendarRows, ...attendanceRows.map(r => ({
    date: r.date,
    day_of_week: r.day_of_week,
    week_number: r.week_number,
    month: r.month,
    is_holiday: r.is_holiday,
    is_festival: r.is_festival,
    festival_weight: r.festival_weight,
    festival_name: r.festival_name,
  }))];

  // Deduplicate by date, prefer calendar
  const calMap = new Map<string, CalendarRow>();
  allCalendar.forEach(r => {
    if (!calMap.has(r.date)) calMap.set(r.date, r);
  });

  for (const dateStr of next7) {
    const row = calMap.get(dateStr);
    if (!row) continue;

    if (row.is_holiday === 1) {
      const id = `holiday-${dateStr}`;
      const daysAway = daysBetween(todayStr, dateStr);
      const when = daysAway === 0 ? 'Today' : daysAway === 1 ? 'Tomorrow' : `In ${daysAway} days`;
      notifications.push({
        id,
        type: 'info',
        title: `Upcoming Holiday — ${when}`,
        message: `${formatDate(dateStr)} is a holiday${row.festival_name ? `: ${row.festival_name}` : ''}. Plan staffing accordingly.`,
        date: todayStr,
        read: readIds.has(id),
      });
    } else if (row.is_festival === 1 && !row.is_holiday) {
      const id = `festival-${dateStr}`;
      const daysAway = daysBetween(todayStr, dateStr);
      const when = daysAway === 0 ? 'Today' : daysAway === 1 ? 'Tomorrow' : `In ${daysAway} days`;
      notifications.push({
        id,
        type: 'info',
        title: `Festival — ${when}`,
        message: `${row.festival_name || 'Festival'} on ${formatDate(dateStr)} (weight: ${row.festival_weight}). Expect higher absenteeism.`,
        date: todayStr,
        read: readIds.has(id),
      });
    }
  }

  // ── 4. Today's data not yet entered ──
  const todayRow = attendanceRows.find(r => r.date === todayStr);
  if (!todayRow || todayRow.absent_percent === null) {
    const id = `missing-today-${todayStr}`;
    notifications.push({
      id,
      type: 'warning',
      title: "Today's Attendance Missing",
      message: `No absenteeism data has been entered for today (${formatDate(todayStr)}). Go to Admin Panel to update.`,
      date: todayStr,
      read: readIds.has(id),
    });
  }

  // ── 5. Good attendance streak ──
  if (recentRows.length >= 3) {
    const lastN = recentRows.slice(-3);
    const allLow = lastN.every(r => r.absent_percent !== null && r.absent_percent < 8);
    if (allLow) {
      const id = `good-streak-${todayStr}`;
      notifications.push({
        id,
        type: 'success',
        title: 'Good Attendance Streak!',
        message: `Absenteeism has been below 8% for the last ${lastN.length} working days. Great performance!`,
        date: todayStr,
        read: readIds.has(id),
      });
    }
  }

  // ── 6. Weekly summary (if today is Monday) ──
  if (today.getDay() === 1) {
    const lastWeek = attendanceRows
      .filter(r => r.absent_percent !== null && r.date <= todayStr)
      .slice(-5); // last 5 working days
    if (lastWeek.length > 0) {
      const avg = lastWeek.reduce((s, r) => s + (r.absent_percent ?? 0), 0) / lastWeek.length;
      const id = `weekly-summary-${todayStr}`;
      notifications.push({
        id,
        type: 'info',
        title: 'Weekly Summary',
        message: `Last week's average absenteeism: ${avg.toFixed(1)}% across ${lastWeek.length} working days.`,
        date: todayStr,
        read: readIds.has(id),
      });
    }
  }

  // Sort newest first
  notifications.sort((a, b) => {
    // Unread first, then by date
    if (a.read !== b.read) return a.read ? 1 : -1;
    return b.date.localeCompare(a.date);
  });

  return notifications;
}

// ── Helpers ──

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
}

function getNextNDays(from: Date, n: number): string[] {
  const dates: string[] = [];
  for (let i = 0; i <= n; i++) {
    const d = new Date(from);
    d.setDate(d.getDate() + i);
    dates.push(toLocalDateStr(d));
  }
  return dates;
}

function daysBetween(a: string, b: string): number {
  const da = new Date(a + 'T00:00:00');
  const db = new Date(b + 'T00:00:00');
  return Math.round((db.getTime() - da.getTime()) / (1000 * 60 * 60 * 24));
}
