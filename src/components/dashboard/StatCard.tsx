import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: 'up' | 'down';
  trendValue?: number;
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'destructive';
}

const variantStyles = {
  default: 'bg-card',
  primary: 'bg-primary text-primary-foreground',
  success: 'bg-success text-success-foreground',
  warning: 'bg-warning text-warning-foreground',
  destructive: 'bg-destructive text-destructive-foreground',
};

export const StatCard = ({ 
  title, 
  value, 
  subtitle, 
  icon: Icon, 
  trend, 
  trendValue,
  variant = 'default' 
}: StatCardProps) => {
  const isPrimary = variant !== 'default';
  
  return (
    <div className={cn('stat-card', variantStyles[variant])}>
      <div className="flex items-start justify-between">
        <div>
          <p className={cn('stat-label', isPrimary && 'text-current opacity-80')}>
            {title}
          </p>
          <p className={cn('stat-value mt-2', isPrimary && 'text-current')}>
            {value}
          </p>
          {subtitle && (
            <p className={cn('mt-1 text-sm', isPrimary ? 'text-current opacity-70' : 'text-muted-foreground')}>
              {subtitle}
            </p>
          )}
        </div>
        <div className={cn(
          'flex h-12 w-12 items-center justify-center rounded-lg',
          isPrimary ? 'bg-white/20' : 'bg-primary/10'
        )}>
          <Icon className={cn('h-6 w-6', isPrimary ? 'text-current' : 'text-primary')} />
        </div>
      </div>
      
      {trend && trendValue !== undefined && (
        <div className={cn(
          'mt-4 flex items-center gap-1 text-sm font-medium',
          trend === 'down' 
            ? (isPrimary ? 'text-current' : 'text-success') 
            : (isPrimary ? 'text-current' : 'text-destructive')
        )}>
          {trend === 'down' ? (
            <TrendingDown className="h-4 w-4" />
          ) : (
            <TrendingUp className="h-4 w-4" />
          )}
          <span>{trendValue}% vs last period</span>
        </div>
      )}
    </div>
  );
};
