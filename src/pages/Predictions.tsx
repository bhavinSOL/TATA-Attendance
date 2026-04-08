import { useState, useCallback } from 'react';
import { Layout } from '@/components/layout/Layout';
import { Chart } from '@/components/dashboard/Chart';
import { Header } from '@/components/layout/Header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, TrendingUp, UserCheck, UserX } from 'lucide-react';
import { PredictionForm } from '@/components/dashboard/PredictionForm';
import type { MLPredictionPoint } from '@/components/dashboard/PredictionForm';
import { useTodayStats } from '@/hooks/useAttendanceData';
import { Skeleton } from '@/components/ui/skeleton';

const Predictions = () => {
  const { data: stats, isLoading } = useTodayStats();
  const [mlPredictions, setMlPredictions] = useState<MLPredictionPoint[]>([]);

  const handlePredictionData = useCallback((data: MLPredictionPoint[]) => {
    setMlPredictions(data);
  }, []);

  return (
    <Layout>
      <Header title="ML Predictions" />
      <div className="space-y-6 p-4 md:p-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">ML Attendance Predictions</h1>
          <p className="text-muted-foreground">
            Get real-time predictions from your trained machine learning model
          </p>
        </div>

        

        {/* ML Prediction Form */}
        <PredictionForm onPredictionData={handlePredictionData} />
        <Chart mlPredictions={mlPredictions} />
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Prediction Context
            </CardTitle>
            <CardDescription>
              Live attendance summary from your data
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-24 w-full" />
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div>
                    <h4 className="font-medium text-sm mb-2 flex items-center gap-1">
                      <Users className="h-4 w-4 text-blue-500" /> Total Workforce
                    </h4>
                    <div className="text-2xl font-bold text-blue-600">{stats?.totalEmployees ?? 490}</div>
                    <div className="text-sm text-muted-foreground">Active employees</div>
                  </div>
                  <div>
                    <h4 className="font-medium text-sm mb-2 flex items-center gap-1">
                      <UserCheck className="h-4 w-4 text-green-500" /> Present Today
                    </h4>
                    <div className="text-2xl font-bold text-green-600">{stats?.presentToday ?? '—'}</div>
                    <div className="text-sm text-muted-foreground">On-site employees</div>
                  </div>
                  <div>
                    <h4 className="font-medium text-sm mb-2 flex items-center gap-1">
                      <UserX className="h-4 w-4 text-red-500" /> Absent Today
                    </h4>
                    <div className="text-2xl font-bold text-red-600">{stats?.absentToday ?? '—'}</div>
                    <div className="text-sm text-muted-foreground">{stats?.absenteeism ?? '—'}% absenteeism</div>
                  </div>
                  <div>
                    <h4 className="font-medium text-sm mb-2 flex items-center gap-1">
                      <TrendingUp className="h-4 w-4 text-orange-500" /> Tomorrow's Prediction
                    </h4>
                    <div className="text-2xl font-bold text-orange-600">{stats?.predictedAbsenteeism?.toFixed(1) ?? '—'}%</div>
                    <div className="text-sm text-muted-foreground">{stats?.predicted ?? '—'} employees</div>
                  </div>
                </div>

                <div className="mt-4 p-4 bg-green-50 rounded-lg">
                  <p className="text-sm text-green-800">
                    <strong>How to use:</strong> Select a prediction type above (Day, Week, Month, or Range), pick dates, and click Predict.
                    The ML model will return expected absentee percentages based on historical patterns, holidays, and festivals.
                  </p>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default Predictions;
