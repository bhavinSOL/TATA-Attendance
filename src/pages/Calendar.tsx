import React, { useState, useEffect } from 'react';
import { Layout } from '@/components/layout/Layout';
import { Header } from '@/components/layout/Header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Calendar as CalendarIcon, Save, Edit, ChevronLeft, ChevronRight, Download, Image } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { CSVService, type CalendarData, fetchDayPrediction, fetchAttendanceCSV, invalidateCalendarCache, saveCalendarCSVToFile } from '@/lib/csvService';
import { downloadChartAsImage } from '@/lib/downloadUtils';

const Calendar = () => {
  const { isAdmin } = useAuth();
  const [calendarData, setCalendarData] = useState<CalendarData[]>([]);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<CalendarData | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [prediction, setPrediction] = useState<number | null>(null);
  const [predictionLoading, setPredictionLoading] = useState(false);
  const [actualAbsent, setActualAbsent] = useState<number | null>(null);
  const [isPastDate, setIsPastDate] = useState(false);
  const calendarGridRef = React.useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Load CSV data on component mount
  useEffect(() => {
    loadCalendarData();
  }, []);

  const loadCalendarData = async () => {
    try {
      setIsLoading(true);
      const data = await CSVService.loadCalendarData();
      setCalendarData(data);
    } catch (error) {
      console.error('Error loading calendar data:', error);
      toast({
        title: "Error",
        description: "Failed to load calendar data.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDateClick = (dateStr: string) => {
    const dateData = calendarData.find(d => d.date === dateStr);
    if (dateData) {
      setSelectedDate({ ...dateData });
    } else {
      // Create a new entry for dates not in CSV
      const dateObj = new Date(dateStr);
      const dayOfWeek = dateObj.getDay(); // 0 = Sunday
      const startOfYear = new Date(dateObj.getFullYear(), 0, 1);
      const dayOfYear = Math.floor((dateObj.getTime() - startOfYear.getTime()) / 86400000);
      const weekNumber = Math.floor((dayOfYear + startOfYear.getDay()) / 7) + 1;
      setSelectedDate({
        date: dateStr,
        day_of_week: dayOfWeek,
        week_number: weekNumber,
        month: dateObj.getMonth() + 1,
        is_holiday: dayOfWeek === 0 ? 1 : 0, // Sundays default as holiday
        is_festival: 0,
        festival_weight: 0,
        festival_name: dayOfWeek === 0 ? 'Sunday' : '',
      });
    }
    setIsDialogOpen(true);

    // Determine if this date is in the past (before today)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const clickedDate = new Date(dateStr);
    clickedDate.setHours(0, 0, 0, 0);
    const isInPast = clickedDate < today;
    setIsPastDate(isInPast);

    setPrediction(null);
    setActualAbsent(null);
    setPredictionLoading(true);

    if (isInPast) {
      // Past date: show actual attendance data, no prediction
      fetchAttendanceCSV()
        .then(rows => {
          const match = rows.find(r => r.date === dateStr);
          if (match && match.absent_percent !== null) {
            setActualAbsent(match.absent_percent);
          } else {
            setActualAbsent(null);
          }
        })
        .catch(() => setActualAbsent(null))
        .finally(() => setPredictionLoading(false));
    } else {
      // Today or future: show prediction from API
      fetchDayPrediction(dateStr)
        .then(val => setPrediction(val))
        .catch(() => setPrediction(null))
        .finally(() => setPredictionLoading(false));
    }
  };

  const handleSave = async () => {
    if (!selectedDate) return;

    try {
      // Save this single edit to localStorage
      CSVService.saveEdit(selectedDate);

      // Update local state
      const exists = calendarData.find(d => d.date === selectedDate.date);
      let updatedData: CalendarData[];
      if (exists) {
        updatedData = calendarData.map(item =>
          item.date === selectedDate.date ? selectedDate : item
        );
      } else {
        updatedData = [...calendarData, selectedDate].sort((a, b) => a.date.localeCompare(b.date));
      }

      setCalendarData(updatedData);

      // Save directly to CSV file
      const ok = await saveCalendarCSVToFile(updatedData);
      invalidateCalendarCache();

      if (ok) {
        toast({
          title: "Saved",
          description: `${selectedDate.date} updated in 2026_calander.csv!`,
        });
      } else {
        toast({
          title: "Saved locally",
          description: `${selectedDate.date} saved to browser. Use 'Export CSV' to download the updated file.`,
          variant: "destructive",
        });
      }

      setIsDialogOpen(false);
    } catch (error) {
      console.error('Error saving:', error);
      toast({
        title: "Error",
        description: "Failed to save changes.",
        variant: "destructive",
      });
    }
  };

  const handleExportCSV = () => {
    CSVService.exportAsCSV(calendarData);
    toast({
      title: "Exported",
      description: "CSV file downloaded. Replace public/2026_calander.csv with it to update permanently.",
    });
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    const newMonth = new Date(currentMonth);
    if (direction === 'prev') {
      newMonth.setMonth(newMonth.getMonth() - 1);
    } else {
      newMonth.setMonth(newMonth.getMonth() + 1);
    }
    setCurrentMonth(newMonth);
  };

  const renderCalendar = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());
    
    const days = [];
    const current = new Date(startDate);
    
    // Generate 42 days (6 weeks)
    for (let i = 0; i < 42; i++) {
      // Use local date to avoid UTC timezone shift (toISOString shifts dates in IST)
      const dateStr = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}-${String(current.getDate()).padStart(2, '0')}`;
      const isCurrentMonth = current.getMonth() === month;
      const isToday = current.toDateString() === new Date().toDateString();
      
      const dayData = calendarData.find(d => d.date === dateStr);
      const isOffDay = dayData && (dayData.is_holiday === 1 || dayData.is_festival === 1);
      
      days.push(
        <div
          key={dateStr}
          onClick={() => isCurrentMonth && handleDateClick(dateStr)}
          className={`
            h-16 sm:h-20 border border-gray-200 p-1 cursor-pointer transition-colors overflow-hidden
            ${isCurrentMonth ? 'hover:bg-gray-50' : 'text-gray-300 bg-gray-50'}
            ${isToday ? 'bg-blue-50 border-blue-300' : ''}
            ${isOffDay ? 'bg-red-50 border-red-300' : ''}
          `}
        >
          <div className="font-medium text-xs sm:text-sm">{current.getDate()}</div>
          {isOffDay && (
            <div className="mt-0.5 flex flex-col gap-0.5 overflow-hidden">
              {dayData?.is_holiday === 1 && (
                <Badge variant="destructive" className="text-[10px] leading-tight px-1 py-0 w-fit">Holiday</Badge>
              )}
              {dayData?.is_festival === 1 && (
                <Badge variant="outline" className="text-[10px] leading-tight px-1 py-0 w-fit">Festival</Badge>
              )}
              {dayData?.festival_name && (
                <div className="text-[10px] leading-tight text-gray-600 truncate" title={dayData.festival_name}>
                  {dayData.festival_name}
                </div>
              )}
            </div>
          )}
        </div>
      );
      
      current.setDate(current.getDate() + 1);
    }
    
    return days;
  };

  if (isLoading) {
    return (
      <Layout>
        <Header title="Calendar" />
        <div className="p-4 md:p-8">
          <div className="text-center">Loading calendar data...</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <Header title="Calendar" />
      <div className="p-4 md:p-8 space-y-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Calendar Management</h1>
          <p className="text-muted-foreground">
            Manage holidays and festivals for attendance predictions
          </p>
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <CardTitle className="flex items-center gap-2">
                <CalendarIcon className="h-5 w-5" />
                {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </CardTitle>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={() => navigateMonth('prev')}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={() => navigateMonth('next')}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button variant="default" size="sm" onClick={handleExportCSV}>
                  <Download className="h-4 w-4 mr-1" />
                  Export CSV
                </Button>
                <Button variant="outline" size="sm" onClick={async () => {
                  if (!calendarGridRef.current) return;
                  const ok = await downloadChartAsImage(calendarGridRef.current, `calendar_${currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }).replace(' ', '_')}.png`);
                  toast({ title: ok ? 'Downloaded' : 'Error', description: ok ? 'Calendar image saved!' : 'Failed to capture calendar' });
                }}>
                  <Image className="h-4 w-4 mr-1" />
                  Download Image
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto" ref={calendarGridRef}>
              <div className="mb-4 min-w-[700px]">
                <div className="grid grid-cols-7 gap-0 text-center text-xs sm:text-sm font-medium text-gray-600">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                    <div key={day} className="p-2 border-b border-gray-200">{day}</div>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-7 gap-0 min-w-[700px]">
                {renderCalendar()}
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-red-50 border border-red-300 rounded"></div>
                <span>Off Days</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-blue-50 border border-blue-300 rounded"></div>
                <span>Today</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="w-[95vw] max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{isAdmin ? 'Edit' : 'View'} Date: {selectedDate?.date}</DialogTitle>
            </DialogHeader>
            {selectedDate && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                  <div><span className="font-medium">Day:</span> {['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][selectedDate.day_of_week]}</div>
                  <div><span className="font-medium">Week:</span> {selectedDate.week_number}</div>
                </div>

                {/* Prediction / Actual Attendance */}
                <div className={`p-3 rounded-lg border text-center ${
                  predictionLoading ? 'bg-gray-50 border-gray-200' :
                  isPastDate ? (
                    actualAbsent !== null && actualAbsent > 10 ? 'bg-red-50 border-red-300' :
                    actualAbsent !== null && actualAbsent <= 10 ? 'bg-green-50 border-green-300' :
                    'bg-gray-50 border-gray-200'
                  ) : (
                    prediction !== null && prediction > 10 ? 'bg-red-50 border-red-300' :
                    prediction !== null && prediction <= 10 ? 'bg-green-50 border-green-300' :
                    'bg-gray-50 border-gray-200'
                  )
                }`}>
                  <div className="text-xs font-medium text-gray-500 mb-1">
                    {isPastDate ? 'Actual Absenteeism' : 'Predicted Absenteeism'}
                  </div>
                  {predictionLoading ? (
                    <div className="text-sm text-gray-400">Loading...</div>
                  ) : isPastDate ? (
                    actualAbsent !== null ? (
                      <div className={`text-2xl font-bold ${actualAbsent > 10 ? 'text-red-600' : 'text-green-600'}`}>
                        {actualAbsent.toFixed(2)}%
                      </div>
                    ) : (
                      <div className="text-sm text-gray-400">No actual data available</div>
                    )
                  ) : prediction !== null ? (
                    <div className={`text-2xl font-bold ${prediction > 10 ? 'text-red-600' : 'text-green-600'}`}>
                      {prediction.toFixed(2)}%
                    </div>
                  ) : (
                    <div className="text-sm text-red-400">API not running - start your Python server on port 8000</div>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="is_holiday">Holiday / Off Day</Label>
                  <Switch
                    id="is_holiday"
                    checked={selectedDate.is_holiday === 1}
                    disabled={!isAdmin}
                    onCheckedChange={(checked) => 
                      setSelectedDate(prev => prev ? {...prev, is_holiday: checked ? 1 : 0} : null)
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="is_festival">Festival</Label>
                  <Switch
                    id="is_festival"
                    checked={selectedDate.is_festival === 1}
                    disabled={!isAdmin}
                    onCheckedChange={(checked) => 
                      setSelectedDate(prev => prev ? {...prev, is_festival: checked ? 1 : 0} : null)
                    }
                  />
                </div>

                {selectedDate.is_festival === 1 && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="festival_name">Festival Name</Label>
                      <Input
                        id="festival_name"
                        value={selectedDate.festival_name}
                        disabled={!isAdmin}
                        onChange={(e) => 
                          setSelectedDate(prev => prev ? {...prev, festival_name: e.target.value} : null)
                        }
                        placeholder="Enter festival name"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="festival_weight">Festival Weight (0.0 - 1.0)</Label>
                      <Input
                        id="festival_weight"
                        type="number"
                        min="0"
                        max="1"
                        step="0.1"
                        value={selectedDate.festival_weight}
                        disabled={!isAdmin}
                        onChange={(e) => 
                          setSelectedDate(prev => prev ? {...prev, festival_weight: parseFloat(e.target.value) || 0} : null)
                        }
                      />
                    </div>
                  </>
                )}

                <div className="flex justify-end gap-2 pt-4">
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                    {isAdmin ? 'Cancel' : 'Close'}
                  </Button>
                  {isAdmin && (
                    <Button onClick={handleSave}>
                      <Save className="h-4 w-4 mr-2" />
                      Save Changes
                    </Button>
                  )}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
};

export default Calendar;