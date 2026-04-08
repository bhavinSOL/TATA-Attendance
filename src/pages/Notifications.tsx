import { useState, useEffect } from 'react';
import { Layout } from '@/components/layout/Layout';
import { Header } from '@/components/layout/Header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bell, BellOff, CheckCheck, AlertTriangle, AlertCircle, Info, CheckCircle2, Trash2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import {
  generateNotifications,
  markAsRead,
  markAllAsRead,
  type Notification,
  type NotificationType,
} from '@/lib/notificationService';

const typeConfig: Record<NotificationType, { icon: typeof AlertTriangle; color: string; bg: string; badge: string }> = {
  alert: { icon: AlertCircle, color: 'text-red-500', bg: 'bg-red-500/10', badge: 'bg-red-500 hover:bg-red-500' },
  warning: { icon: AlertTriangle, color: 'text-amber-500', bg: 'bg-amber-500/10', badge: 'bg-amber-500 hover:bg-amber-500' },
  info: { icon: Info, color: 'text-blue-500', bg: 'bg-blue-500/10', badge: 'bg-blue-500 hover:bg-blue-500' },
  success: { icon: CheckCircle2, color: 'text-green-500', bg: 'bg-green-500/10', badge: 'bg-green-500 hover:bg-green-500' },
};

const typeLabel: Record<NotificationType, string> = {
  alert: 'Alert',
  warning: 'Warning',
  info: 'Info',
  success: 'Success',
};

const Notifications = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  useEffect(() => {
    generateNotifications()
      .then(setNotifications)
      .finally(() => setLoading(false));
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;

  const handleMarkRead = (id: string) => {
    markAsRead(id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const handleMarkAllRead = () => {
    markAllAsRead(notifications);
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const filtered = filter === 'unread' ? notifications.filter(n => !n.read) : notifications;

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
  };

  return (
    <Layout>
      <Header title="Notifications" subtitle={`${unreadCount} unread notification${unreadCount !== 1 ? 's' : ''}`} />

      <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-6">
        {/* Top Actions */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-2">
            <Button
              variant={filter === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('all')}
            >
              All ({notifications.length})
            </Button>
            <Button
              variant={filter === 'unread' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('unread')}
            >
              Unread ({unreadCount})
            </Button>
          </div>
          {unreadCount > 0 && (
            <Button className="w-full sm:w-auto" variant="outline" size="sm" onClick={handleMarkAllRead}>
              <CheckCheck className="mr-2 h-4 w-4" />
              Mark all as read
            </Button>
          )}
        </div>

        {/* Notification List */}
        {loading ? (
          <div className="space-y-4">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}
          </div>
        ) : filtered.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <BellOff className="h-12 w-12 mb-4 opacity-40" />
              <p className="text-lg font-medium">
                {filter === 'unread' ? 'No unread notifications' : 'No notifications'}
              </p>
              <p className="text-sm mt-1">You're all caught up!</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filtered.map((n) => {
              const config = typeConfig[n.type];
              const Icon = config.icon;
              return (
                <div
                  key={n.id}
                  className={`flex items-start gap-3 sm:gap-4 rounded-xl border p-3 sm:p-4 transition-all cursor-pointer hover:shadow-sm ${
                    n.read ? 'bg-card opacity-70' : 'bg-card border-l-4 shadow-sm'
                  }`}
                  style={!n.read ? { borderLeftColor: `var(--${n.type === 'alert' ? 'destructive' : n.type === 'warning' ? 'warning' : n.type === 'success' ? 'success' : 'primary'})` } : undefined}
                  onClick={() => !n.read && handleMarkRead(n.id)}
                >
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${config.bg}`}>
                    <Icon className={`h-5 w-5 ${config.color}`} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className={`text-sm font-semibold ${n.read ? 'text-muted-foreground' : 'text-foreground'}`}>
                        {n.title}
                      </p>
                      <Badge className={`${config.badge} text-white text-[10px] px-1.5 py-0`}>
                        {typeLabel[n.type]}
                      </Badge>
                      {!n.read && (
                        <span className="h-2 w-2 rounded-full bg-primary shrink-0" />
                      )}
                    </div>
                    <p className={`text-sm ${n.read ? 'text-muted-foreground/70' : 'text-muted-foreground'}`}>
                      {n.message}
                    </p>
                    <p className="text-xs text-muted-foreground/50 mt-1">{formatDate(n.date)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Notifications;
