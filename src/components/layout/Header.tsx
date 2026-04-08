import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Search, AlertCircle, AlertTriangle, Info, CheckCircle2, Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { generateNotifications, markAsRead, type Notification, type NotificationType } from '@/lib/notificationService';
import { useSidebar } from './Layout';

interface HeaderProps {
  title: string;
  subtitle?: string;
}

const typeIcon: Record<NotificationType, typeof AlertCircle> = {
  alert: AlertCircle,
  warning: AlertTriangle,
  info: Info,
  success: CheckCircle2,
};

const typeColor: Record<NotificationType, string> = {
  alert: 'text-red-500',
  warning: 'text-amber-500',
  info: 'text-blue-500',
  success: 'text-green-500',
};

export const Header = ({ title, subtitle }: HeaderProps) => {
  const navigate = useNavigate();
  const { openSidebar } = useSidebar();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const today = new Date().toLocaleDateString('en-IN', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  useEffect(() => {
    generateNotifications().then(setNotifications);
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;

  const handleNotifClick = (n: Notification) => {
    markAsRead(n.id);
    setNotifications(prev => prev.map(x => x.id === n.id ? { ...x, read: true } : x));
  };

  return (
    <header className="flex items-center justify-between border-b border-border bg-card px-4 md:px-8 py-4">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          onClick={openSidebar}
        >
          <Menu className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="page-title text-lg md:text-xl">{title}</h1>
          <p className="text-xs md:text-sm text-muted-foreground">{subtitle || today}</p>
        </div>
      </div>

      <div className="flex items-center gap-2 md:gap-4">
        <div className="relative hidden md:block">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search..."
            className="w-64 pl-9 bg-background"
          />
        </div>
        
        {/* Notification Bell */}
        <div className="relative" ref={dropdownRef}>
          <Button
            variant="outline"
            size="icon"
            className="relative"
            onClick={() => setOpen(prev => !prev)}
          >
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] text-destructive-foreground">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </Button>

          {/* Dropdown */}
          {open && (
            <div className="absolute right-0 top-12 z-50 w-[calc(100vw-2rem)] sm:w-96 rounded-xl border border-border bg-card shadow-lg">
              <div className="flex items-center justify-between border-b border-border px-4 py-3">
                <p className="text-sm font-semibold">Notifications</p>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs text-primary h-7"
                  onClick={() => { setOpen(false); navigate('/notifications'); }}
                >
                  View All
                </Button>
              </div>

              <div className="max-h-80 overflow-y-auto">
                {notifications.length === 0 ? (
                  <p className="px-4 py-8 text-center text-sm text-muted-foreground">No notifications</p>
                ) : (
                  notifications.slice(0, 6).map(n => {
                    const Icon = typeIcon[n.type];
                    return (
                      <div
                        key={n.id}
                        className={`flex items-start gap-3 px-4 py-3 cursor-pointer transition-colors hover:bg-muted/50 border-b border-border/50 last:border-0 ${
                          !n.read ? 'bg-primary/5' : ''
                        }`}
                        onClick={() => handleNotifClick(n)}
                      >
                        <Icon className={`h-4 w-4 mt-0.5 shrink-0 ${typeColor[n.type]}`} />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <p className={`text-xs font-semibold truncate ${n.read ? 'text-muted-foreground' : 'text-foreground'}`}>
                              {n.title}
                            </p>
                            {!n.read && <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />}
                          </div>
                          <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{n.message}</p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {notifications.length > 6 && (
                <div className="border-t border-border px-4 py-2 text-center">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs text-primary w-full h-7"
                    onClick={() => { setOpen(false); navigate('/notifications'); }}
                  >
                    See all {notifications.length} notifications
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
