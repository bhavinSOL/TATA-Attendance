import { Layout } from '@/components/layout/Layout';
import { Header } from '@/components/layout/Header';
import { StatCard } from '@/components/dashboard/StatCard';
import { StatCard2 } from '@/components/dashboard/StatCard2';
import { AttendanceChart } from '@/components/dashboard/AttendanceChart';
import { PredictionAccuracy } from '@/components/dashboard/PredictionAccuracy';
import { RecentPredictions } from '@/components/dashboard/RecentPredictions';
import { useTodayStats } from '@/hooks/useAttendanceData';
import { Users, UserCheck, UserX, Target, TrendingUp } from 'lucide-react';
import { toLocalDateStr, type ChartData } from '@/lib/csvService';
import { Skeleton } from '@/components/ui/skeleton';
import { useState, useEffect } from 'react';

const Dashboard = () => {
  const { data: stats, isLoading } = useTodayStats();
  const [showCharts, setShowCharts] = useState(false);

  // Stagger chart loading: show stats first, then charts after 500ms delay
  useEffect(() => {
    if (!isLoading) {
      const timer = setTimeout(() => {
        setShowCharts(true);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isLoading]);

  return (
    <Layout>
      <Header 
        title="Dashboard" 
        subtitle="Monitor and forecast employee attendance across all plants"
      />
      
      <div className="p-4 md:p-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 mb-8">
          {isLoading ? (
            <>
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-36" />
              ))}
            </>
          ) : (
            <>
              <StatCard
                title="Today's Absenteeism"
                value={`${stats?.absenteeism}%`}
                subtitle={`${stats?.absentToday.toLocaleString()} employees`}
                icon={Target}
                trend={stats?.trend}
                trendValue={stats?.trendValue}
                variant="primary"
              />
              <StatCard
                title="Total Workforce"
                value={stats?.totalEmployees.toLocaleString() || '0'}
                // value="1062"
                subtitle="Active employees"
                icon={Users}
              />
              <StatCard
                title="Present Today"
                value={stats?.presentToday.toLocaleString() || '0'}
                subtitle="On-site employees"
                icon={UserCheck}
                variant="success"
              />
             
              <StatCard2
                title="Predicted Absenteeism"
                icon={TrendingUp}
                variant="warning"
                days={(() => {
                  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
                  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                  return [1, 2, 3].map((offset, i) => {
                    const d = new Date();
                    d.setDate(d.getDate() + offset);
                    const label = `${dayNames[d.getDay()]}, ${d.getDate()} ${monthNames[d.getMonth()]}`;
                    const pct = [stats?.predictedAbsenteeism, stats?.predictedAbsenteeism1, stats?.predictedAbsenteeism2][i];
                    const emp = [stats?.predicted, stats?.predicted1, stats?.predicted2][i];
                    return {
                      label,
                      value: `${pct?.toFixed(1) ?? '—'}%`,
                      employees: `${emp ?? '—'} employees`,
                    };
                  });
                })()}
              />
            </>
          )}
        </div>

        {/* Charts */}
        {showCharts ? (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 mb-8">
            <AttendanceChart />
            <RecentPredictions />
            <PredictionAccuracy />
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 mb-8">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-96" />
            ))}
          </div>
        )}

        {/* Accuracy Chart */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          
        </div>
      </div>
    </Layout>
  );
};

export default Dashboard;
