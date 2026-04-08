import { useState, useRef, useEffect, useCallback } from 'react';
import { MessageCircle, Send, X, Bot } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardContent, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import {
  fetchAttendanceCSV,
  fetchCalendarCSV,
  fetchDayPrediction,
  toLocalDateStr,
} from '@/lib/csvService';
import { predictByWeek, predictByMonth } from '@/lib/apiService';

// ==========================================
// Types
// ==========================================

interface ChatMessage {
  id: string;
  role: 'user' | 'bot';
  text: string;
}

type Intent =
  | { type: 'PREDICT_DAY'; date: string }
  | { type: 'PREDICT_WEEK' }
  | { type: 'PREDICT_MONTH' }
  | { type: 'ACTUAL_DAY'; date: string }
  | { type: 'HOLIDAYS_WEEK' }
  | { type: 'HOLIDAYS_MONTH' }
  | { type: 'UPCOMING_FESTIVALS' }
  | { type: 'TREND' }
  | { type: 'HIGH_ABSENTEEISM' }
  | { type: 'HELP' }
  | { type: 'GREETING' }
  | { type: 'UNKNOWN' };

const TOTAL_EMPLOYEES = 994;

const QUICK_SUGGESTIONS = [
  "Today's prediction",
  "This week",
  "Trend",
  "Holidays this week",
  "Upcoming festivals",
  "Help",
];

// ==========================================
// Date Helpers
// ==========================================

const MONTH_MAP: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
};

function resolveDate(input: string): string | null {
  const lower = input.toLowerCase();
  const today = new Date();

  if (/\btoday\b/.test(lower)) return toLocalDateStr(today);
  if (/\btomorrow\b/.test(lower)) {
    const d = new Date(today);
    d.setDate(d.getDate() + 1);
    return toLocalDateStr(d);
  }
  if (/\byesterday\b/.test(lower)) {
    const d = new Date(today);
    d.setDate(d.getDate() - 1);
    return toLocalDateStr(d);
  }

  // ISO format: 2026-03-15
  const isoMatch = lower.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) return isoMatch[0];

  // "15 march" or "15th mar"
  const dayFirst = lower.match(/(\d{1,2})\s*(?:st|nd|rd|th)?\s*(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*/);
  if (dayFirst) {
    const day = parseInt(dayFirst[1]);
    const month = MONTH_MAP[dayFirst[2].substring(0, 3)];
    return `2026-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }

  // "march 15"
  const monthFirst = lower.match(/(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*\s+(\d{1,2})/);
  if (monthFirst) {
    const month = MONTH_MAP[monthFirst[1].substring(0, 3)];
    const day = parseInt(monthFirst[2]);
    return `2026-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }

  return null;
}

function formatDateDisplay(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${days[d.getDay()]}, ${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

function getWeekBounds(today: Date): { start: string; end: string } {
  const d = new Date(today);
  const day = d.getDay(); // 0=Sun
  const start = new Date(d);
  start.setDate(d.getDate() - day); // Sunday
  const end = new Date(start);
  end.setDate(start.getDate() + 6); // Saturday
  return { start: toLocalDateStr(start), end: toLocalDateStr(end) };
}

function getMonthBounds(today: Date): { start: string; end: string } {
  const year = today.getFullYear();
  const month = today.getMonth();
  const start = new Date(year, month, 1);
  const end = new Date(year, month + 1, 0);
  return { start: toLocalDateStr(start), end: toLocalDateStr(end) };
}

// ==========================================
// Intent Classifier
// ==========================================

function classifyIntent(input: string): Intent {
  const lower = input.toLowerCase().trim();

  // Greetings
  const greetings = ['hi', 'hello', 'hey', 'good morning', 'good afternoon', 'good evening', 'thanks', 'thank you', 'bye', 'goodbye'];
  if (greetings.includes(lower) || /^(hi|hello|hey)\b/.test(lower)) {
    return { type: 'GREETING' };
  }

  // Help
  if (/\b(help|commands|options|menu|what can you do|how to use)\b/.test(lower)) {
    return { type: 'HELP' };
  }

  // Holidays this week
  if (/\b(holiday|off day).*this week\b/.test(lower) || (lower === 'holidays this week')) {
    return { type: 'HOLIDAYS_WEEK' };
  }

  // Holidays this month
  if (/\b(holiday|off day).*this month\b/.test(lower) || (lower === 'holidays this month')) {
    return { type: 'HOLIDAYS_MONTH' };
  }

  // Upcoming festivals
  if (/\b(upcoming|next)\b.*\b(festival|celebration)\b/.test(lower) || /\bfestivals?\b/.test(lower)) {
    return { type: 'UPCOMING_FESTIVALS' };
  }

  // Trend
  if (/\b(trend|rising|falling|going up|going down|increasing|decreasing|pattern)\b/.test(lower)) {
    return { type: 'TREND' };
  }

  // High absenteeism
  if (/\b(high absenteeism|alert|high absent|worst day|critical|above threshold|exceeded)\b/.test(lower)) {
    return { type: 'HIGH_ABSENTEEISM' };
  }

  // Week prediction
  if (/\b(this week|week prediction|weekly|week forecast)\b/.test(lower)) {
    return { type: 'PREDICT_WEEK' };
  }

  // Month prediction
  if (/\b(this month|month prediction|monthly|month forecast)\b/.test(lower)) {
    return { type: 'PREDICT_MONTH' };
  }

  // Date-based queries (predict or actual)
  const date = resolveDate(lower);

  // Actual data query (past lookups)
  if (/\b(actual|real|was|were|attendance on|absent on)\b/.test(lower) || /\byesterday\b/.test(lower)) {
    const resolvedDate = date || (/\byesterday\b/.test(lower) ? (() => { const d = new Date(); d.setDate(d.getDate() - 1); return toLocalDateStr(d); })() : null);
    if (resolvedDate) {
      return { type: 'ACTUAL_DAY', date: resolvedDate };
    }
  }

  // Prediction query
  if (/\b(predict|prediction|forecast|expected|what will|how much absent)\b/.test(lower) || /\btoday\b/.test(lower) || /\btomorrow\b/.test(lower)) {
    const resolvedDate = date || toLocalDateStr(new Date());
    return { type: 'PREDICT_DAY', date: resolvedDate };
  }

  // If a date was found but no specific keyword, check if past or future
  if (date) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(date + 'T00:00:00');
    if (target < today) {
      return { type: 'ACTUAL_DAY', date };
    }
    return { type: 'PREDICT_DAY', date };
  }

  return { type: 'UNKNOWN' };
}

// ==========================================
// Response Handlers
// ==========================================

async function handleIntent(intent: Intent): Promise<string> {
  try {
    switch (intent.type) {
      case 'GREETING':
        return "Hello! I'm the Tata Attendance Bot. I can help you with attendance predictions, historical data, holidays, and trends. Type 'help' to see what I can do!";

      case 'HELP':
        return `Here's what I can help with:

📊 Predictions:
• "Today's prediction" or "Predict tomorrow"
• "Predict 15 March" (any date)
• "This week's prediction"
• "This month's prediction"

📋 Historical Data:
• "Yesterday's attendance"
• "Actual attendance on 10 March"

📅 Calendar:
• "Holidays this week"
• "Holidays this month"
• "Upcoming festivals"

📈 Analysis:
• "What's the trend?"
• "High absenteeism alerts"

Just type your question!`;

      case 'PREDICT_DAY': {
        const { date } = intent;
        const calendar = await fetchCalendarCSV();
        const calRow = calendar.find(r => r.date === date);
        const prediction = await fetchDayPrediction(date);

        if (prediction === null) {
          return `Sorry, I couldn't get a prediction for ${formatDateDisplay(date)}. Make sure the Flask API server is running on port 8000.`;
        }

        const absent = Math.round((prediction / 100) * TOTAL_EMPLOYEES);
        const present = TOTAL_EMPLOYEES - absent;

        let response = `📊 Prediction for ${formatDateDisplay(date)}:\n\n`;
        response += `• Expected absenteeism: ${prediction}%\n`;
        response += `• Estimated absent: ${absent} employees\n`;
        response += `• Estimated present: ${present} employees`;

        if (calRow?.is_holiday) response += `\n\n📅 Note: This is a holiday.`;
        if (calRow?.is_festival && calRow.festival_name) response += `\n🎉 Festival: ${calRow.festival_name}`;

        return response;
      }

      case 'ACTUAL_DAY': {
        const { date } = intent;
        const attendance = await fetchAttendanceCSV();
        const row = attendance.find(r => r.date === date);

        if (!row || row.absent_percent === null) {
          return `No attendance data available for ${formatDateDisplay(date)}. Data may not have been recorded yet.`;
        }

        const absent = Math.round((row.absent_percent / 100) * TOTAL_EMPLOYEES);
        const present = TOTAL_EMPLOYEES - absent;

        let response = `📋 Actual attendance for ${formatDateDisplay(date)}:\n\n`;
        response += `• Absenteeism: ${row.absent_percent}%\n`;
        response += `• Absent: ${absent} employees\n`;
        response += `• Present: ${present} employees`;

        if (row.is_holiday) response += `\n\n📅 This was a holiday.`;
        if (row.is_festival && row.festival_name) response += `\n🎉 Festival: ${row.festival_name}`;

        return response;
      }

      case 'PREDICT_WEEK': {
        const today = new Date();
        const { start } = getWeekBounds(today);
        const result = await predictByWeek(start);
        const pct = parseFloat(result.average_week_absentees_percentage.replace('%', ''));
        const absent = Math.round((pct / 100) * TOTAL_EMPLOYEES);

        return `📊 This week's prediction (from ${formatDateDisplay(start)}):\n\n• Average absenteeism: ${pct}%\n• Estimated avg absent: ${absent} employees/day`;
      }

      case 'PREDICT_MONTH': {
        const today = new Date();
        const year = today.getFullYear();
        const month = today.getMonth() + 1;
        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
        const result = await predictByMonth(year, month);
        const pct = parseFloat(result.average_month_absentees_percentage.replace('%', ''));
        const absent = Math.round((pct / 100) * TOTAL_EMPLOYEES);

        return `📊 Prediction for ${monthNames[month - 1]} ${year}:\n\n• Average absenteeism: ${pct}%\n• Estimated avg absent: ${absent} employees/day`;
      }

      case 'HOLIDAYS_WEEK': {
        const today = new Date();
        const { start, end } = getWeekBounds(today);
        const calendar = await fetchCalendarCSV();
        const holidays = calendar.filter(r => r.date >= start && r.date <= end && (r.is_holiday === 1 || r.is_festival === 1));

        if (holidays.length === 0) {
          return '📅 No holidays or off days this week.';
        }

        let response = `📅 Holidays this week:\n\n`;
        holidays.forEach(h => {
          const label = h.festival_name || (h.is_holiday ? 'Holiday' : 'Off day');
          response += `• ${formatDateDisplay(h.date)}: ${label}\n`;
        });
        response += `\nTotal: ${holidays.length} holiday(s)`;
        return response;
      }

      case 'HOLIDAYS_MONTH': {
        const today = new Date();
        const { start, end } = getMonthBounds(today);
        const calendar = await fetchCalendarCSV();
        const holidays = calendar.filter(r => r.date >= start && r.date <= end && (r.is_holiday === 1 || r.is_festival === 1));

        if (holidays.length === 0) {
          return '📅 No holidays or off days this month.';
        }

        let response = `📅 Holidays this month:\n\n`;
        holidays.forEach(h => {
          const label = h.festival_name || (h.is_holiday ? 'Holiday' : 'Off day');
          response += `• ${formatDateDisplay(h.date)}: ${label}\n`;
        });
        response += `\nTotal: ${holidays.length} holiday(s)`;
        return response;
      }

      case 'UPCOMING_FESTIVALS': {
        const todayStr = toLocalDateStr(new Date());
        const calendar = await fetchCalendarCSV();
        const festivals = calendar.filter(r => r.date > todayStr && r.is_festival === 1 && r.festival_name).slice(0, 5);

        if (festivals.length === 0) {
          return '🎉 No upcoming festivals found in the calendar.';
        }

        let response = `🎉 Upcoming festivals:\n\n`;
        festivals.forEach(f => {
          response += `• ${formatDateDisplay(f.date)}: ${f.festival_name} (weight: ${f.festival_weight})\n`;
        });
        return response;
      }

      case 'TREND': {
        const todayStr = toLocalDateStr(new Date());
        const attendance = await fetchAttendanceCSV();
        const recent = attendance.filter(r => r.date <= todayStr && r.absent_percent !== null).slice(-7);

        if (recent.length < 3) {
          return 'Not enough recent data to determine a trend.';
        }

        let response = `📈 Attendance trend (last ${recent.length} days):\n\n`;
        recent.forEach(r => {
          response += `• ${formatDateDisplay(r.date)}: ${r.absent_percent}%\n`;
        });

        const firstHalf = recent.slice(0, Math.floor(recent.length / 2));
        const secondHalf = recent.slice(Math.floor(recent.length / 2));
        const avgFirst = firstHalf.reduce((s, r) => s + (r.absent_percent || 0), 0) / firstHalf.length;
        const avgSecond = secondHalf.reduce((s, r) => s + (r.absent_percent || 0), 0) / secondHalf.length;
        const diff = avgSecond - avgFirst;

        const avg = recent.reduce((s, r) => s + (r.absent_percent || 0), 0) / recent.length;

        let trend: string;
        if (diff > 1) trend = '📈 Rising — absenteeism is increasing';
        else if (diff < -1) trend = '📉 Falling — absenteeism is decreasing';
        else trend = '➡️ Stable — no significant change';

        response += `\nTrend: ${trend}\nAverage: ${avg.toFixed(2)}%`;
        return response;
      }

      case 'HIGH_ABSENTEEISM': {
        const todayStr = toLocalDateStr(new Date());
        const attendance = await fetchAttendanceCSV();
        const recent30 = attendance.filter(r => r.date <= todayStr && r.absent_percent !== null).slice(-30);
        const highDays = recent30.filter(r => (r.absent_percent || 0) > 15);

        if (highDays.length === 0) {
          return '✅ No high absenteeism alerts in the last 30 days. Attendance has been within normal range (<15%).';
        }

        let response = `🚨 High absenteeism alerts (>15%):\n\nLast 30 days:\n`;
        highDays.forEach(r => {
          response += `• ${formatDateDisplay(r.date)}: ${r.absent_percent}%\n`;
        });
        response += `\nTotal alerts: ${highDays.length}`;
        return response;
      }

      case 'UNKNOWN':
      default:
        return `I'm not sure I understand that. Here are some things you can ask:\n\n• "Today's prediction"\n• "Yesterday's attendance"\n• "Holidays this week"\n• "What's the trend?"\n\nType 'help' for all commands.`;
    }
  } catch (err) {
    console.error('ChatWidget handleIntent error:', err);
    return "Sorry, I couldn't fetch that data right now. Make sure the Flask API server is running on port 8000 and try again.";
  }
}

// ==========================================
// Typing Indicator
// ==========================================

const TypingIndicator = () => (
  <div className="flex items-start gap-2 mb-3">
    <Avatar className="h-7 w-7 mt-0.5">
      <AvatarFallback className="bg-primary text-primary-foreground text-[10px]">
        <Bot className="h-3.5 w-3.5" />
      </AvatarFallback>
    </Avatar>
    <div className="bg-muted rounded-lg px-3 py-2 flex gap-1">
      <span className="w-1.5 h-1.5 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
      <span className="w-1.5 h-1.5 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
      <span className="w-1.5 h-1.5 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
    </div>
  </div>
);

// ==========================================
// Message Bubble
// ==========================================

const MessageBubble = ({ message }: { message: ChatMessage }) => {
  const isBot = message.role === 'bot';

  return (
    <div className={cn('flex mb-3', isBot ? 'justify-start' : 'justify-end')}>
      {isBot && (
        <Avatar className="h-7 w-7 mt-0.5 mr-2 flex-shrink-0">
          <AvatarFallback className="bg-primary text-primary-foreground text-[10px]">
            <Bot className="h-3.5 w-3.5" />
          </AvatarFallback>
        </Avatar>
      )}
      <div
        className={cn(
          'rounded-lg px-3 py-2 text-sm max-w-[85%] whitespace-pre-line',
          isBot
            ? 'bg-muted text-foreground'
            : 'bg-primary text-primary-foreground'
        )}
      >
        {message.text}
      </div>
    </div>
  );
};

// ==========================================
// ChatWidget Component
// ==========================================

const ChatWidget = () => {
  const { isAuthenticated } = useAuth();

  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [hasOpened, setHasOpened] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isThinking]);

  // Focus input when panel opens
  useEffect(() => {
    if (isOpen) inputRef.current?.focus();
  }, [isOpen]);

  // Welcome message on first open
  const handleOpen = useCallback(() => {
    setIsOpen(true);
    if (!hasOpened) {
      setHasOpened(true);
      setMessages([{
        id: 'welcome',
        role: 'bot',
        text: "Welcome! I'm the Tata Attendance Assistant. Ask me about predictions, historical attendance, holidays, or trends.\n\nTry the quick suggestions below or type your question!",
      }]);
    }
  }, [hasOpened]);

  const handleSend = useCallback(async () => {
    const text = inputValue.trim();
    if (!text || isThinking) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      text,
    };

    setMessages(prev => [...prev, userMsg]);
    setInputValue('');
    setIsThinking(true);

    const intent = classifyIntent(text);
    const response = await handleIntent(intent);

    const botMsg: ChatMessage = {
      id: `bot-${Date.now()}`,
      role: 'bot',
      text: response,
    };

    setMessages(prev => [...prev, botMsg]);
    setIsThinking(false);
  }, [inputValue, isThinking]);

  const handleQuickChip = useCallback((chip: string) => {
    setInputValue(chip);
    // Trigger send on next tick after state updates
    setTimeout(() => {
      const userMsg: ChatMessage = {
        id: `user-${Date.now()}`,
        role: 'user',
        text: chip,
      };
      setMessages(prev => [...prev, userMsg]);
      setIsThinking(true);

      classifyIntent(chip);
      handleIntent(classifyIntent(chip)).then(response => {
        const botMsg: ChatMessage = {
          id: `bot-${Date.now()}`,
          role: 'bot',
          text: response,
        };
        setMessages(prev => [...prev, botMsg]);
        setIsThinking(false);
        setInputValue('');
      });
    }, 0);
  }, []);

  if (!isAuthenticated) return null;

  return (
    <>
      {/* Floating Action Button */}
      {!isOpen && (
        <button
          onClick={handleOpen}
          className="fixed bottom-[calc(env(safe-area-inset-bottom)+0.75rem)] right-[calc(env(safe-area-inset-right)+0.75rem)] md:bottom-6 md:right-6 z-50 h-12 w-12 md:h-14 md:w-14 rounded-full bg-primary text-primary-foreground shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center hover:scale-105"
          title="Chat with Attendance Bot"
        >
          <MessageCircle className="h-5 w-5 md:h-6 md:w-6" />
        </button>
      )}

      {/* Chat Panel */}
      {isOpen && (
        <Card className="fixed z-50 left-2 right-2 w-auto h-[70vh] bottom-[calc(env(safe-area-inset-bottom)+0.5rem)] md:left-auto md:w-[380px] md:h-[520px] md:bottom-6 md:right-6 flex flex-col shadow-2xl border animate-in fade-in slide-in-from-bottom-4 duration-300">
          {/* Header */}
          <CardHeader className="flex flex-row items-center justify-between py-3 px-4 border-b space-y-0">
            <div className="flex items-center gap-2">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                  <Bot className="h-4 w-4" />
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="text-sm font-semibold leading-none">Attendance Bot</p>
                <p className="text-[10px] text-green-500 mt-0.5">Online</p>
              </div>
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setIsOpen(false)}>
              <X className="h-4 w-4" />
            </Button>
          </CardHeader>

          {/* Messages */}
          <CardContent className="flex-1 overflow-hidden p-0">
            <ScrollArea className="h-full">
              <div className="px-4 py-3">
                {messages.map(msg => (
                  <MessageBubble key={msg.id} message={msg} />
                ))}
                {isThinking && <TypingIndicator />}
                <div ref={scrollRef} />
              </div>
            </ScrollArea>
          </CardContent>

          {/* Quick Chips + Input */}
          <CardFooter className="flex flex-col gap-2 px-4 py-3 border-t">
            <div className="flex gap-1.5 flex-wrap w-full">
              {QUICK_SUGGESTIONS.map(chip => (
                <Badge
                  key={chip}
                  variant="outline"
                  className="cursor-pointer hover:bg-accent hover:text-accent-foreground text-[10px] px-2 py-0.5"
                  onClick={() => handleQuickChip(chip)}
                >
                  {chip}
                </Badge>
              ))}
            </div>
            <div className="flex gap-2 w-full">
              <Input
                ref={inputRef}
                value={inputValue}
                onChange={e => setInputValue(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSend()}
                placeholder="Ask about attendance..."
                disabled={isThinking}
                className="text-sm"
              />
              <Button
                size="icon"
                onClick={handleSend}
                disabled={!inputValue.trim() || isThinking}
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </CardFooter>
        </Card>
      )}
    </>
  );
};

export default ChatWidget;
