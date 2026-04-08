import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DayPrediction {
  label: string;       // e.g. "Thu, 26 Feb"
  value: string;       // e.g. "8.2%"
  employees: string;   // e.g. "87 employees"
}

interface StatCard2Props {
  title: string;
  days: DayPrediction[];
  icon: LucideIcon;
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'destructive';
}

const variantStyles = {
  default: 'bg-card',
  primary: 'bg-primary text-primary-foreground',
  success: 'bg-success text-success-foreground',
  warning: 'bg-warning text-warning-foreground',
  destructive: 'bg-destructive text-destructive-foreground',
};

export const StatCard2 = ({
  title,
  days,
  icon: Icon,
  variant = 'default',
}: StatCard2Props) => {
  const isPrimary = variant !== 'default';

  return (
    <div className={cn('stat-card', variantStyles[variant])}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <p className={cn('text-sm font-semibold tracking-wide uppercase', isPrimary ? 'text-current opacity-90' : 'text-muted-foreground')}>
          {title}
        </p>
        <div className={cn(
          'flex h-10 w-10 items-center justify-center rounded-lg',
          isPrimary ? 'bg-white/20' : 'bg-primary/10'
        )}>
          <Icon className={cn('h-5 w-5', isPrimary ? 'text-current' : 'text-primary')} />
        </div>
      </div>

      {/* 3 Day Columns */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        {days.map((day, i) => (
          <div
            key={i}
            className={cn(
              'rounded-lg p-3 text-center',
              isPrimary ? 'bg-white/10' : 'bg-muted/50'
            )}
          >
            <p className={cn('text-[10px] sm:text-[11px] font-medium mb-1.5', isPrimary ? 'text-current opacity-70' : 'text-muted-foreground')}>
              {day.label}
            </p>
            <p className={cn('text-lg sm:text-2xl font-bold leading-tight', isPrimary && 'text-current')}>
              {day.value}
            </p>
            <p className={cn('text-[10px] sm:text-[11px] mt-1', isPrimary ? 'text-current opacity-60' : 'text-muted-foreground')}>
              {day.employees}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};
